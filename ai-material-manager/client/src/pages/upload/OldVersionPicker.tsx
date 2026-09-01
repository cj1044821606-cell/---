import React, { useEffect, useState } from "react";
import { Loader, Search, X } from "lucide-react";
import { logger } from "@client/src/lib/logger";

import type { PoolOldVersionItem } from "@shared/pool";
import { poolApi } from "@client/src/api";
import { Button } from "@client/src/components/ui/button";
import { Input } from "@client/src/components/ui/input";
import { useI18n } from "@client/src/hooks/use-i18n";
import { UPLOAD_I18N } from "./upload-i18n";

interface OldVersionPickerProps {
  value: PoolOldVersionItem | null;
  onChange: (item: PoolOldVersionItem | null) => void;
  disabled?: boolean;
}

/** B-1：被替换旧版本搜索选择（防抖 300ms） */
const OldVersionPicker: React.FC<OldVersionPickerProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { language } = useI18n();
  const pt = (key: string): string => UPLOAD_I18N[key]?.[language] ?? key;

  const [keyword, setKeyword] = useState<string>("");
  const [options, setOptions] = useState<PoolOldVersionItem[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  useEffect(() => {
    const query: string = keyword.trim();
    if (query.length < 2) {
      setOptions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer: number = window.setTimeout(() => {
      poolApi
        .searchOldVersions(query)
        .then((resp) => {
          setOptions(resp.items);
        })
        .catch((error: unknown) => {
          logger.error("旧版本搜索失败", {
            query,
            error: error instanceof Error ? error.message : String(error),
          });
          setOptions([]);
        })
        .finally(() => {
          setSearching(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [keyword]);

  if (value !== null) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
          {value.label}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => {
            onChange(null);
            setKeyword("");
            setOptions([]);
          }}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    );
  }

  const showOptions: boolean = keyword.trim().length >= 2;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={keyword}
          disabled={disabled}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setKeyword(event.target.value)
          }
          placeholder={pt("upload.field.oldVersion.placeholder")}
          className="pl-8"
        />
        {searching ? (
          <Loader className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {showOptions && !searching ? (
        options.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {pt("upload.field.oldVersion.empty")}
          </p>
        ) : (
          <div className="max-h-44 overflow-y-auto rounded-md border border-border bg-card">
            {options.map((item: PoolOldVersionItem) => (
              <button
                key={item.baseRecordId}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(item);
                  setOptions([]);
                }}
                className="block w-full truncate px-3 py-2 text-left font-mono text-xs text-foreground transition-colors duration-fast hover:bg-accent"
              >
                {item.label}
              </button>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
};

export default OldVersionPicker;
