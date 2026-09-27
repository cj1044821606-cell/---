import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronsUpDown,
  LoaderCircle,
  Search,
  User,
  X,
} from 'lucide-react';
import { axiosForBackend } from '@client/src/lib/api-client';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@client/src/components/ui/avatar';
import { Button } from '@client/src/components/ui/button';
import { Checkbox } from '@client/src/components/ui/checkbox';
import { Input } from '@client/src/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import { cn } from '@client/src/lib/utils';
import { useI18n } from '@client/src/hooks/use-i18n';

interface PersonOption {
  openId: string;
  label: string;
  roleText: string;
  area: string | null;
  avatarUrl: string | null;
  departmentName?: string;
}

let peoplePromise: Promise<PersonOption[]> | null = null;
const knownPeople = new Map<string, PersonOption>();
function remember(items: PersonOption[]): PersonOption[] {
  items.forEach((person) => knownPeople.set(person.openId, person));
  return items;
}

async function resolvePeople(ids: string[]): Promise<PersonOption[]> {
  const missing = ids.filter((id) => !knownPeople.has(id));
  for (let offset = 0; offset < missing.length; offset += 20) {
    const response = await axiosForBackend.get<{ items: PersonOption[] }>(
      '/api/people/resolve',
      { params: { ids: missing.slice(offset, offset + 20).join(',') } },
    );
    remember(response.data.items);
  }
  return ids.flatMap((id) =>
    knownPeople.has(id) ? [knownPeople.get(id)!] : [],
  );
}

function getPeople(): Promise<PersonOption[]> {
  peoplePromise ??= axiosForBackend
    .get<{ items: PersonOption[] }>('/api/people/options')
    .then((response) => remember(response.data.items))
    .catch((error) => {
      peoplePromise = null;
      throw error;
    });
  return peoplePromise;
}

interface CommonPeopleSelectProps {
  disabled?: boolean;
  placeholder?: string;
  candidateType?: 'all' | 'designer' | 'plannerAuditor';
}

type PeopleSelectProps = CommonPeopleSelectProps &
  (
    | {
        multiple: true;
        value: string[];
        onChange: (value: string[]) => void;
      }
    | {
        multiple?: false;
        value: string | null;
        onChange: (value: string | null) => void;
      }
  );

function isCandidate(
  person: PersonOption,
  candidateType: NonNullable<CommonPeopleSelectProps['candidateType']>,
): boolean {
  if (candidateType === 'all') return true;
  if (candidateType === 'designer') {
    return person.roleText.includes('设计师');
  }
  const isAuditor = person.roleText.includes('审核');
  const isMarketing =
    person.roleText.includes('市场营销') ||
    person.roleText.includes('Marketing');
  const isHeadquarters = person.area?.split('-')[0] === 'HQ';
  return isAuditor || (isMarketing && isHeadquarters);
}

export function PeopleSelect(props: PeopleSelectProps) {
  const { language } = useI18n();
  const en = language === 'en';
  const {
    disabled = false,
    placeholder = '请选择',
    candidateType = 'all',
  } = props;
  const multiple = props.multiple === true;
  const selectedIds: string[] = multiple
    ? props.value
    : props.value
      ? [props.value]
      : [];
  const [items, setItems] = useState<PersonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchItems, setSearchItems] = useState<PersonOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pageToken, setPageToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState<string | undefined>();
  const selectedKey = selectedIds.join(',');

  useEffect(() => {
    getPeople()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    if (selectedKey)
      void resolvePeople(selectedKey.split(','))
        .then((resolved) => {
          if (active)
            setItems((previous) => [
              ...new Map(
                [...previous, ...resolved].map((person) => [
                  person.openId,
                  person,
                ]),
              ).values(),
            ]);
        })
        .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [selectedKey]);

  useEffect(() => {
    if (!open || !query.trim()) return;
    const controller = new AbortController();
    setSearching(true);
    setSearchError(null);
    const timer = window.setTimeout(() => {
      axiosForBackend
        .get<{ items: PersonOption[]; hasMore?: boolean; pageToken?: string }>(
          '/api/people/options',
          {
            params: { q: query.trim(), pageToken: page },
            signal: controller.signal,
          },
        )
        .then(({ data }) => {
          if (controller.signal.aborted) return;
          remember(data.items);
          setSearchItems((previous) => [
            ...new Map(
              [...(page ? previous : []), ...data.items].map((person) => [
                person.openId,
                person,
              ]),
            ).values(),
          ]);
          setPageToken(data.pageToken);
          setHasMore(Boolean(data.hasMore && data.pageToken));
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setSearchError(
              en
                ? 'Organization search unavailable. Ask an administrator to check directory access, or retry.'
                : '组织搜索暂不可用，请重试或联系管理员检查通讯录搜索权限。',
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query, page, retry, en]);

  const candidates = useMemo(
    () => items.filter((person) => isCandidate(person, candidateType)),
    [candidateType, items],
  );
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    if (!keyword) return candidates;
    return searchItems;
  }, [candidates, query, searchItems]);
  const selectedPeople = selectedIds
    .map(
      (id) =>
        knownPeople.get(id) ??
        items.find((person) => person.openId === id) ?? {
          openId: id,
          label: en ? 'Selected member' : '已选成员',
          roleText: '',
          area: null,
          avatarUrl: null,
        },
    )
    .filter((person): person is PersonOption => Boolean(person));

  const togglePerson = (openId: string): void => {
    if (multiple) {
      const next = selectedIds.includes(openId)
        ? selectedIds.filter((id) => id !== openId)
        : [...selectedIds, openId];
      props.onChange(next);
      return;
    }
    props.onChange(openId);
    setOpen(false);
  };

  const removePerson = (openId: string): void => {
    if (multiple) {
      props.onChange(selectedIds.filter((id) => id !== openId));
    } else {
      props.onChange(null);
    }
  };

  const triggerText = selectedPeople.length
    ? selectedPeople.map((person) => person.label).join('、')
    : placeholder;

  return (
    <div className="space-y-2">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery('');
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-10 w-full justify-between overflow-hidden bg-background px-3 font-normal"
          >
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-left',
                selectedPeople.length === 0 && 'text-muted-foreground',
              )}
            >
              {triggerText}
            </span>
            {multiple && selectedPeople.length > 1 ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {selectedPeople.length} 人
              </span>
            ) : null}
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0"
        >
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchItems([]);
                  setPage(undefined);
                  setHasMore(false);
                  setSearchError(null);
                }}
                placeholder={
                  en ? 'Search organization members' : '搜索组织成员姓名'
                }
                aria-label={
                  en ? 'Search organization members' : '搜索组织成员姓名'
                }
                className="h-9 pl-8"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {loading || (query.trim() && searching) ? (
              <div className="flex h-20 items-center justify-center text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
              </div>
            ) : null}
            {searchError && query.trim() ? (
              <div role="alert" className="px-3 py-2 text-xs text-destructive">
                {searchError}
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  {en ? 'Retry' : '重试'}
                </button>
              </div>
            ) : null}
            {!loading && !searching && !searchError && filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {en ? 'No matching members' : '没有匹配的人员'}
              </p>
            ) : null}
            {filtered.map((person) => {
              const checked = selectedIds.includes(person.openId);
              return (
                <button
                  key={person.openId}
                  type="button"
                  onClick={() => togglePerson(person.openId)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {multiple ? (
                    <Checkbox checked={checked} tabIndex={-1} />
                  ) : (
                    <Check
                      className={cn(
                        'size-4 shrink-0',
                        checked ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  )}
                  <Avatar className="size-8">
                    {person.avatarUrl ? (
                      <AvatarImage src={person.avatarUrl} alt={person.label} />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {person.label.slice(0, 1) || (
                        <User className="size-3.5" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {person.label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[person.departmentName, person.area, person.roleText]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </button>
              );
            })}
            {query.trim() && hasMore ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={searching}
                onClick={() => setPage(pageToken)}
              >
                {en ? 'Load more' : '加载更多'}
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>

      {multiple && selectedPeople.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedPeople.map((person) => (
            <span
              key={person.openId}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-accent px-2 text-xs"
            >
              {person.label}
              <button
                type="button"
                aria-label={`移除 ${person.label}`}
                title={`移除 ${person.label}`}
                disabled={disabled}
                onClick={() => removePerson(person.openId)}
                className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PeopleName({ openId }: { openId: string }) {
  const [name, setName] = useState(openId);
  useEffect(() => {
    resolvePeople([openId])
      .then((items) => {
        setName(items.find((item) => item.openId === openId)?.label ?? openId);
      })
      .catch(() => undefined);
  }, [openId]);
  return <span>{name}</span>;
}
