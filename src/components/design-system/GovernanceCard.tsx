import type { ReactNode } from 'react';
import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { HealthBadge } from './Badges';
import type { GovernanceStatus } from '@/lib/rule-governance';

interface GovernanceCardProps {
  title: string;
  status: GovernanceStatus;
  reasons?: string[];
  meta?: ReactNode;
  children?: ReactNode;
}

const ICON_BY_STATUS = {
  healthy: ShieldCheck,
  watch: ShieldQuestion,
  needs_attention: ShieldAlert,
} as const;

export function GovernanceCard({ title, status, reasons = [], meta, children }: GovernanceCardProps) {
  const Icon = ICON_BY_STATUS[status];
  const tone =
    status === 'healthy'
      ? 'text-success'
      : status === 'needs_attention'
        ? 'text-destructive'
        : 'text-warning';

  return (
    <div className="rounded-xl border border-border bg-gradient-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`h-4 w-4 shrink-0 ${tone}`} />
          <h3 className="font-semibold text-foreground truncate">{title}</h3>
        </div>
        <HealthBadge status={status} />
      </div>

      {meta && <div className="text-caption text-muted-foreground">{meta}</div>}

      {reasons.length > 0 && (
        <ul className="space-y-1 text-body-sm text-muted-foreground">
          {reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      )}

      {children}
    </div>
  );
}
