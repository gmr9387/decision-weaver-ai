import type { ReactNode } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from 'lucide-react';
import { HealthBadge } from './Badges';
import type { GovernanceStatus } from '@/lib/rule-governance';

interface GovernanceCardProps {
  title: string;
  status: GovernanceStatus;
  reasons?: string[];
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

const ICON_BY_STATUS = {
  healthy: ShieldCheck,
  watch: ShieldQuestion,
  needs_attention: ShieldAlert,
} as const;

export function GovernanceCard({
  title,
  status,
  reasons = [],
  meta,
  actions,
  children,
  className,
}: GovernanceCardProps) {
  const Icon = ICON_BY_STATUS[status];

  const tone =
    status === 'healthy'
      ? 'text-success'
      : status === 'needs_attention'
        ? 'text-destructive'
        : 'text-warning';

  return (
    <div
      className={`rounded-xl border border-border bg-gradient-card p-5 space-y-4 ${
        className ?? ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 shrink-0 ${tone}`} />

            <h3 className="font-semibold text-foreground truncate">
              {title}
            </h3>
          </div>

          {meta && (
            <div className="mt-1 text-caption text-muted-foreground">
              {meta}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <HealthBadge status={status} />
        </div>
      </div>

      {reasons.length > 0 && (
        <div className="rounded-lg bg-surface-2 p-3">
          <ul className="space-y-1 text-body-sm text-muted-foreground">
            {reasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </div>
      )}

      {children && (
        <div className="pt-1">
          {children}
        </div>
      )}
    </div>
  );
}