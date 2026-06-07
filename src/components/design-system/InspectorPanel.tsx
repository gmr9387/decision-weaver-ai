import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface InspectorPanelProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function InspectorPanel({
  icon: Icon,
  title,
  description,
  actions,
  children,
  className,
}: InspectorPanelProps) {
  return (
    <section className={`rounded-2xl border border-border bg-surface-1 p-5 space-y-4 ${className ?? ''}`}>
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-primary" />}
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground max-w-3xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div>{children}</div>
    </section>
  );
}
