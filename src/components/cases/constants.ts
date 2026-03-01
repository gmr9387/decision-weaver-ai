import {
  CheckCircle2, AlertTriangle, BrainCircuit, ArrowLeft,
  FileText, Zap, Clock,
} from 'lucide-react';
import type { DecisionType, SeverityLevel } from '@/lib/types';

export const decisionIcons: Record<string, any> = {
  approve: CheckCircle2, deny: AlertTriangle, flag: BrainCircuit, escalate: ArrowLeft,
  review: FileText, request_info: FileText, route: Zap, monitor: BrainCircuit, unresolved: Clock,
};

export const decisionColors: Record<DecisionType, string> = {
  approve: 'success', deny: 'destructive', flag: 'warning', escalate: 'critical',
  review: 'info', request_info: 'warning', route: 'secondary', monitor: 'secondary', unresolved: 'outline',
};

export const severityColors: Record<SeverityLevel, string> = {
  low: 'success', medium: 'warning', high: 'critical', critical: 'destructive',
};
