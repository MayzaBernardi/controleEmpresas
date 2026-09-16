import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-neutral-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
