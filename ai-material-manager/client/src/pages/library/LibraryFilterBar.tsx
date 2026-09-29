import React, { useEffect, useRef, useState } from "react";
import { Globe2, Search, Send, X } from "lucide-react";

import { Input } from "@client/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/src/components/ui/select";
import FilterChip from "@client/src/components/FilterChip";
import { cn } from "@/lib/utils";

export interface LibraryFilterBarProps {
  keywordInput: string;
  onKeywordChange: (value: string) => void;
  materialType: string;
  onMaterialTypeChange: (value: string) => void;
  region: string;
  onRegionChange: (value: string) => void;
  productModel: string;
  onProductModelChange: (value: string) => void;
  typeOptions: string[];
  regionOptions: string[];
  modelOptions: string[];
  externalOnly: boolean;
  onExternalOnlyChange: (value: boolean) => void;
  canViewGlobal: boolean;
  viewGlobal: boolean;
  onViewGlobalChange: (value: boolean) => void;
  /** 桌面端滚动时吸顶，方便在长列表中随时调整筛选 */
  sticky?: boolean;
  allValue: string;
  pt: (key: string) => string;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag: string = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

interface SelectFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  allLabel: string;
  allValue: string;
  options: string[];
}

const SelectFilter: React.FC<SelectFilterProps> = ({
  value,
  onValueChange,
  label,
  allLabel,
  allValue,
  options,
}: SelectFilterProps) => (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger
      className="h-10 w-[calc(50%-0.3125rem)] min-w-0 rounded-lg sm:w-[calc((100%-1.25rem)/3)] lg:w-[190px]"
      aria-label={label}
    >
      <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
      <SelectValue placeholder={allLabel} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={allValue}>{allLabel}</SelectItem>
      {options.map((option: string) => (
        <SelectItem key={option} value={option}>
          {option}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const LibraryFilterBar: React.FC<LibraryFilterBarProps> = ({
  keywordInput,
  onKeywordChange,
  materialType,
  onMaterialTypeChange,
  region,
  onRegionChange,
  productModel,
  onProductModelChange,
  typeOptions,
  regionOptions,
  modelOptions,
  externalOnly,
  onExternalOnlyChange,
  canViewGlobal,
  viewGlobal,
  onViewGlobalChange,
  sticky = true,
  allValue,
  pt,
}: LibraryFilterBarProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState<boolean>(false);

  // 工具栏吸顶后加分隔阴影，提示下方内容在滚动
  useEffect(() => {
    const node: HTMLDivElement | null = sentinelRef.current;
    if (!sticky || !node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]: IntersectionObserverEntry[]): void => setStuck(!entry.isIntersecting),
      { rootMargin: "-57px 0px 0px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [sticky]);

  // 键盘党快捷键：在页面任意处按 / 直接进入搜索
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTypingTarget(event.target)
      ) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
    <div ref={sentinelRef} aria-hidden="true" className="h-px" />
    <section
      className={cn(
        "mb-4 flex flex-wrap items-center gap-2.5 transition-shadow duration-150",
        sticky &&
          "md:sticky md:top-14 md:z-20 md:-mx-8 md:px-8 md:py-3",
        sticky && stuck && "md:border-b md:border-border md:bg-background/90 md:shadow-[0_6px_12px_-10px_rgba(16,24,40,0.25)] md:backdrop-blur-md",
      )}
    >
      <div className="relative w-full min-w-[240px] sm:w-auto sm:max-w-[400px] sm:flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          value={keywordInput}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            onKeywordChange(event.target.value)
          }
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
            if (event.key === "Escape" && keywordInput !== "") {
              event.preventDefault();
              onKeywordChange("");
            }
          }}
          placeholder={pt("library.search.placeholder")}
          aria-label={pt("library.search.placeholder")}
          title={pt("library.search.shortcut")}
          className="h-10 rounded-lg pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden"
        />
        {keywordInput !== "" ? (
          <button
            type="button"
            onClick={(): void => {
              onKeywordChange("");
              inputRef.current?.focus();
            }}
            aria-label={pt("library.search.clear")}
            className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground"
          >
            <X className="size-4" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground md:block">
            /
          </kbd>
        )}
      </div>
      <SelectFilter
        value={materialType}
        onValueChange={onMaterialTypeChange}
        label={pt("library.filter.materialType")}
        allLabel={pt("library.filter.all")}
        allValue={allValue}
        options={typeOptions}
      />
      <SelectFilter
        value={region}
        onValueChange={onRegionChange}
        label={pt("library.filter.region")}
        allLabel={pt("library.filter.all")}
        allValue={allValue}
        options={regionOptions}
      />
      <SelectFilter
        value={productModel}
        onValueChange={onProductModelChange}
        label={pt("library.filter.productModel")}
        allLabel={pt("library.filter.all")}
        allValue={allValue}
        options={modelOptions}
      />
      <span className="mx-0.5 hidden h-6 w-px bg-border lg:block" />
      <FilterChip
        active={externalOnly}
        onClick={() => onExternalOnlyChange(!externalOnly)}
        icon={Send}
        tooltip={pt("library.filter.externalOnly.tooltip")}
      >
        {pt("library.filter.externalOnly")}
      </FilterChip>
      {canViewGlobal ? (
        <FilterChip
          active={viewGlobal}
          onClick={() => onViewGlobalChange(!viewGlobal)}
          icon={Globe2}
          tooltip={pt("library.viewGlobal.tooltip")}
        >
          {pt("library.viewGlobal.label")}
        </FilterChip>
      ) : null}
    </section>
    </>
  );
};

export default LibraryFilterBar;
