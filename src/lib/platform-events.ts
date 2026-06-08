/**
 * ValtariOS — Shared Event Contracts
 *
 * Strongly-typed event shapes shared across platform services
 * (Glue, Core, Weaver, Guardian, Cloud, Claim Clarity).
 *
 * Architecture-only: these contracts are consumed by the platform
 * dashboard and downstream services. No backend changes required.
 */

export type PlatformService =
  | 'glue'
  | 'core'
  | 'weaver'
  | 'guardian'
  | 'cloud'
  | 'claim-clarity';

export type PlatformEventOutcome =
  | 'success'
  | 'failure'
  | 'warning'
  | 'pending';

export interface BasePlatformEvent {
  id: string;
  service: PlatformService;
  timestamp: string;
  traceId: string;
  outcome: PlatformEventOutcome;
  actor?: string;
}

export interface WorkflowEvent extends BasePlatformEvent {
  kind: 'workflow';
  workflowId: string;
  workflowName: string;
  durationMs?: number;
}

export interface InferenceEvent extends BasePlatformEvent {
  kind: 'inference';
  caseId?: string;
  decision?: string;
  confidence?: number;
  rulesFired?: number;
}

export interface DecisionEvent extends BasePlatformEvent {
  kind: 'decision';
  caseId: string;
  decision: string;
  reviewer?: string;
}

export interface DeploymentEvent extends BasePlatformEvent {
  kind: 'deployment';
  environment: 'dev' | 'staging' | 'prod';
  version: string;
  component: string;
}

export interface GovernanceEvent extends BasePlatformEvent {
  kind: 'governance';
  category: string;
  finding: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskEvent extends BasePlatformEvent {
  kind: 'risk';
  riskScore: number;
  signal: string;
}

export type PlatformEvent =
  | WorkflowEvent
  | InferenceEvent
  | DecisionEvent
  | DeploymentEvent
  | GovernanceEvent
  | RiskEvent;

export interface PlatformServiceDescriptor {
  id: PlatformService;
  name: string;
  purpose: string;
  status: 'connected' | 'degraded' | 'offline' | 'pending';
  health: 'healthy' | 'watch' | 'needs_attention';
  lastActivity: string;
  traceCount: number;
  usage: {
    requestsPerMin: number;
    successRate: number;
  };
}
