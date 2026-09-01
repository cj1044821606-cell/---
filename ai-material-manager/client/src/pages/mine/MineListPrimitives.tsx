import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@client/src/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@client/src/components/ui/empty";
import { Skeleton } from "@client/src/components/ui/skeleton";

/** 列表加载骨架 */
export const ListSkeleton: React.FC = () => {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((index: number) => (
        <Skeleton key={index} className="h-[72px] w-full rounded-md" />
      ))}
    </div>
  );
};

export interface ListErrorProps {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

/** 列表加载失败提示（含重试） */
export const ListError: React.FC<ListErrorProps> = ({
  message,
  retryLabel,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/30 bg-destructive-soft px-4 py-8 text-center">
      <AlertTriangle className="size-5 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="size-3.5" />
        {retryLabel}
      </Button>
    </div>
  );
};

export interface ListEmptyProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** 列表空态（线性图标 + 文案） */
export const ListEmpty: React.FC<ListEmptyProps> = ({
  icon: Icon,
  title,
  description,
}) => {
  return (
    <Empty className="border border-dashed border-border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon className="size-5 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
};
