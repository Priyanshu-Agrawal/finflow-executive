import type { ReactNode } from 'react';

/** The one page title: a short h1 (the nav label), an optional one-line description that hides on phones, and the page actions. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div data-page-header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">{title}</h1>
        {description && <p className="mt-0.5 hidden sm:block text-sm text-zinc-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
