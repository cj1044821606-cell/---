import React from "react";

interface PageHeaderProps {
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, meta, actions }) => (
  <header className="mb-6 flex items-end gap-4">
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {meta ? (
        <p className="mt-1.5 text-sm text-muted-foreground">{meta}</p>
      ) : null}
    </div>
    {actions ? <div className="ml-auto flex gap-2">{actions}</div> : null}
  </header>
);

export default PageHeader;