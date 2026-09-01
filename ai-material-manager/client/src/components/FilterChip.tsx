import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@client/src/components/ui/tooltip";

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  tooltip?: string;
  children: React.ReactNode;
}

const FilterChip: React.FC<FilterChipProps> = ({
  active,
  onClick,
  icon: Icon,
  tooltip,
  children,
}) => {
  const button = (
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

  if (!tooltip) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6} className="max-w-64">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
};

export default FilterChip;
