import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { DecisionBadge, ConfidenceBadge } from './Badges';

interface TraceCardProps {
  decision: string;
  confidence: number;
  confidenceBand?: string;
  timestamp?: string;
  traceId?: string;
  mode?: string;
  children?: ReactNode;
}

export function TraceCard({
  decision,
  confidence,
  confidenceBand,
  timestamp,
  traceId,
  mode,
  children,
}: TraceCardProps) {
  return (
    <div className="rounded-xl border border-border bg-gradient-card p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <DecisionBadge decision={decision} />
          <ConfidenceBadge value={confidence} band={confidenceBand} />
          {mode && (
            <Badge variant="outline" className="capitalize">
              {mode}
            </Badge>
          )}
        </div>
        {timestamp && (
          <span className="text-caption text-muted-foreground">
            {new Date(timestamp).toLocaleString()}
          </span>
        )}
      </div>
      {traceId && (
        <p className="font-mono text-caption text-muted-foreground truncate">
          trace: {traceId}
        </p>
      )}
      {children && <div>{children}</div>}
    </div>
  );
}
