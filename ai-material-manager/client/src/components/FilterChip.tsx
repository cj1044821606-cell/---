import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  children: React.ReactNode;
}

const FilterChip: React.FC<FilterChipProps> = ({
  active,
  onClick,
  icon: Icon,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "inline-flex h-10 items-center gap-1.5 rounded-lg border px-3.5 text-sm transition-colors duration-150",
      active
        ? "border-primary/30 bg-primary-soft font-medium text-primary"
        : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground",
    )}
  >
    <Icon className="size-3.5" />
    {children}
  </button>
);

export default FilterChip;