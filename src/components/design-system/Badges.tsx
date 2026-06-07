import { Badge } from '@/components/ui/badge';
import type { ReactNode } from 'react';

interface DecisionBadgeProps {
  decision: string;
  className?: string;
}

const variantMap: Record<string, string> = {
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

export function DecisionBadge({ decision, className }: DecisionBadgeProps) {
  const variant = (variantMap[decision] ?? 'outline') as any;
  return (
    <Badge variant={variant} className={`capitalize ${className ?? ''}`}>
      {String(decision || 'unresolved').replace('_', ' ')}
    </Badge>
  );
}

interface ConfidenceBadgeProps {
  value: number;
  band?: string;
  className?: string;
}

export function ConfidenceBadge({ value, band, className }: ConfidenceBadgeProps) {
  return (
    <Badge variant="confidence" className={`font-mono ${className ?? ''}`}>
      {Number(value || 0).toFixed(1)}%{band ? ` · ${band.replace('_', ' ')}` : ''}
    </Badge>
  );
}

interface HealthBadgeProps {
  status: 'healthy' | 'watch' | 'needs_attention' | string;
  className?: string;
  children?: ReactNode;
}

export function HealthBadge({ status, className, children }: HealthBadgeProps) {
  const variant =
    status === 'healthy'
      ? 'success'
      : status === 'needs_attention'
        ? 'destructive'
        : 'warning';
  const label =
    status === 'healthy'
      ? 'Healthy'
      : status === 'needs_attention'
        ? 'Needs Attention'
        : 'Watch';
  return (
    <Badge variant={variant as any} className={`capitalize ${className ?? ''}`}>
      {children ?? label}
    </Badge>
  );
}
