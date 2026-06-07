import { Badge } from '@/components/ui/badge';
import type { ReactNode } from 'react';

interface DecisionBadgeProps {
  decision?: string | null;
  className?: string;
}

const decisionVariantMap: Record<string, string> = {
  approve: 'success',
  deny: 'destructive',
  escalate: 'warning',
  review: 'info',
  flag: 'warning',
  request_info: 'secondary',
  route: 'info',
  monitor: 'secondary',
  unresolved: 'outline',
};

function cleanLabel(value?: string | null) {
  return String(value || 'unresolved').replace(/_/g, ' ');
}

export function DecisionBadge({ decision, className }: DecisionBadgeProps) {
  const normalized = String(decision || 'unresolved');
  const variant = (decisionVariantMap[normalized] ?? 'outline') as any;

  return (
    <Badge variant={variant} className={`capitalize ${className ?? ''}`}>
      {cleanLabel(normalized)}
    </Badge>
  );
}

interface ConfidenceBadgeProps {
  value?: number | null;
  band?: string | null;
  className?: string;
}

export function ConfidenceBadge({ value, band, className }: ConfidenceBadgeProps) {
  const safeValue = Number(value ?? 0);

  return (
    <Badge variant="confidence" className={`font-mono ${className ?? ''}`}>
      {safeValue.toFixed(1)}%
      {band ? ` · ${cleanLabel(band)}` : ''}
    </Badge>
  );
}

interface HealthBadgeProps {
  status?: 'healthy' | 'watch' | 'needs_attention' | 'degraded' | 'offline' | string | null;
  className?: string;
  children?: ReactNode;
}

export function HealthBadge({ status, className, children }: HealthBadgeProps) {
  const normalized = String(status || 'watch');

  const variant =
    normalized === 'healthy'
      ? 'success'
      : normalized === 'needs_attention' || normalized === 'offline'
        ? 'destructive'
        : normalized === 'degraded'
          ? 'warning'
          : 'warning';

  const label =
    normalized === 'healthy'
      ? 'Healthy'
      : normalized === 'needs_attention'
        ? 'Needs Attention'
        : normalized === 'offline'
          ? 'Offline'
          : normalized === 'degraded'
            ? 'Degraded'
            : 'Watch';

  return (
    <Badge variant={variant as any} className={`capitalize ${className ?? ''}`}>
      {children ?? label}
    </Badge>
  );
}

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
  children?: ReactNode;
}

export function StatusBadge({ status, className, children }: StatusBadgeProps) {
  const normalized = String(status || 'unknown');

  const variant =
    ['active', 'enabled', 'success', 'completed', 'resolved', 'healthy'].includes(normalized)
      ? 'success'
      : ['failed', 'error', 'critical', 'offline', 'denied'].includes(normalized)
        ? 'destructive'
        : ['warning', 'pending', 'processing', 'degraded', 'escalated'].includes(normalized)
          ? 'warning'
          : ['info', 'review', 'in_review'].includes(normalized)
            ? 'info'
            : 'secondary';

  return (
    <Badge variant={variant as any} className={`capitalize ${className ?? ''}`}>
      {children ?? cleanLabel(normalized)}
    </Badge>
  );
}