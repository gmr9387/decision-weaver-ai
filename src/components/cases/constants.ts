import {
  CheckCircle2,
  AlertTriangle,
  BrainCircuit,
  ArrowLeft,
  FileText,
  Zap,
  Clock,
  ShieldAlert,
  Eye,
} from 'lucide-react';

import type {
  DecisionType,
  SeverityLevel,
} from '@/lib/types';

export const decisionIcons: Record<DecisionType, any> = {
  approve: CheckCircle2,
  deny: AlertTriangle,
  flag: BrainCircuit,
  escalate: ArrowLeft,
  review: Eye,
  request_info: FileText,
  route: Zap,
  monitor: ShieldAlert,
  unresolved: Clock,
};

export const decisionColors: Record<DecisionType, string> = {
  approve: 'success',
  deny: 'destructive',
  flag: 'warning',
  escalate: 'critical',
  review: 'info',
  request_info: 'warning',
  route: 'secondary',
  monitor: 'secondary',
  unresolved: 'outline',
};

export const severityColors: Record<SeverityLevel, string> = {
  low: 'success',
  medium: 'warning',
  high: 'critical',
  critical: 'destructive',
};

export const confidenceBandColors = {
  low: 'destructive',
  medium: 'warning',
  high: 'info',
  very_high: 'success',
} as const;

export const confidenceBandDescriptions = {
  low: 'Insufficient supporting evidence',
  medium: 'Moderate supporting evidence',
  high: 'Strong supporting evidence',
  very_high: 'Extensive corroborating evidence',
} as const;

export const decisionDescriptions: Record<DecisionType, string> = {
  approve: 'Automatically approved by rules engine',
  deny: 'Automatically denied by rules engine',
  flag: 'Flagged for attention',
  escalate: 'Escalated for higher review',
  review: 'Requires analyst review',
  request_info: 'Additional information required',
  route: 'Routed to another workflow',
  monitor: 'Monitor without immediate action',
  unresolved: 'No final determination available',
};