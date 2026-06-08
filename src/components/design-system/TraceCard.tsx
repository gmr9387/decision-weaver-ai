import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { DecisionBadge, ConfidenceBadge } from './Badges';
import { Clock, GitBranch } from 'lucide-react';

interface TraceCardProps {
  decision?: string | null;
  confidence?: number | null;
  confidenceBand?: string | null;
  timestamp?: string | null;
  traceId?: string | null;
  mode?: string | null;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function TraceCard({
  decision,
  confidence,
  confidenceBand,
  timestamp,
  traceId,
  mode,
  title = 'Trace',
  subtitle,
  actions,
  children,
  className,
}: TraceCardProps) {
  return (
    <div className={`rounded-xl border border-border bg-gradient-card p-5 space-y-3 ${className ?? ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            <h3 className="text-body-md font-semibold text-foreground">{title}</h3>

            {decision && <DecisionBadge decision={decision} />}

            {typeof confidence === 'number' && (
              <ConfidenceBadge value={confidence} band={confidenceBand ?? undefined} />
            )}

            {mode && (
              <Badge variant="outline" className="capitalize">
                {mode}
              </Badge>
            )}
          </div>

          {subtitle && (
            <p className="mt-1 text-caption text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-2 text-caption">
        {traceId && (
          <div className="rounded-lg bg-surface-2 p-2">
            <span className="text-muted-foreground">Trace ID</span>
            <p className="font-mono text-foreground truncate">{traceId}</p>
          </div>
        )}

        {timestamp && (
          <div className="rounded-lg bg-surface-2 p-2">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Timestamp
            </span>
            <p className="font-mono text-foreground">
              {new Date(timestamp).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {children && <div>{children}</div>}
    </div>
  );
}