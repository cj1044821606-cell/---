import React from "react";
import { Skeleton } from "@client/src/components/ui/skeleton";

/** 页面代码下载中的占位：保持导航栏不动，只在内容区显示轻量骨架 */
const PageFallback: React.FC = () => (
  <div aria-busy="true" aria-live="polite" className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[0, 1, 2, 3].map((key: number) => (
        <Skeleton key={key} className="aspect-[4/3] w-full rounded-xl" />
      ))}
    </div>
  </div>
);

export default PageFallback;
