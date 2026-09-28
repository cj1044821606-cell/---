import React from "react";
import { X } from "lucide-react";

export interface ActiveFilterItem {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

interface ActiveFiltersProps {
  items: ActiveFilterItem[];
  onClearAll: () => void;
  pt: (key: string) => string;
}

/** 已生效的筛选以可单独移除的标签展示，用户随时知道“为什么只看到这些” */
const ActiveFilters: React.FC<ActiveFiltersProps> = ({ items, onClearAll, pt }) => {
  if (items.length === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" aria-label={pt("library.filter.activeTitle")}>
      <span className="text-xs text-muted-foreground">{pt("library.filter.activeTitle")}</span>
      {items.map((item: ActiveFilterItem) => (
        <span
          key={item.key}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-primary-line bg-primary-soft pl-2.5 pr-1 text-xs text-primary"
        >
          <span className="text-primary/70">{item.label}</span>
          <span className="max-w-[180px] truncate font-medium">{item.value}</span>
          <button
            type="button"
            onClick={item.onRemove}
            aria-label={`${pt("library.filter.remove")} ${item.label}`}
            className="grid size-5 place-items-center rounded-full transition-colors duration-150 hover:bg-primary/10"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="h-7 rounded-full px-2.5 text-xs text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground"
      >
        {pt("library.filter.clear")}
      </button>
    </div>
  );
};

export default ActiveFilters;
