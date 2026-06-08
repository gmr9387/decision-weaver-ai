import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  StatCard,
  InspectorPanel,
  TraceCard,
  GovernanceCard,
  HealthBadge,
} from '@/components/design-system';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Activity,
  Network,
  ShieldCheck,
  Gauge,
  Layers,
  Workflow,
  Cpu,
  GitBranch,
  Cloud as CloudIcon,
  HeartPulse,
  Boxes,
  Server,
} from 'lucide-react';
import {
  getServiceEntries,
} from '@/lib/platform-navigation';
import type {
  PlatformEvent,
  PlatformService,
  PlatformServiceDescriptor,
} from '@/lib/platform-events';

const SERVICE_META: Record<PlatformService, { icon: any; description: string }> = {
  glue: { icon: Network, description: 'Universal Integration Fabric' },
  core: { icon: Cpu, description: 'Inference & Decision Engine' },
  weaver: { icon: GitBranch, description: 'Decision Operations Platform' },
  guardian: { icon: ShieldCheck, description: 'Risk Intelligence System' },
  cloud: { icon: CloudIcon, description: 'Deployment Operations Platform' },
  'claim-clarity': { icon: HeartPulse, description: 'Healthcare Adjudication Solution' },
};

const MOCK_SERVICES: PlatformServiceDescriptor[] = [
  {
    id: 'glue',
    name: 'Glue',
    purpose: 'Universal Integration Fabric',
    status: 'connected',
    health: 'healthy',
    lastActivity: '2 min ago',
    traceCount: 18420,
    usage: { requestsPerMin: 412, successRate: 99.7 },
  },
  {
    id: 'core',
    name: 'Core',
    purpose: 'Inference & Decision Engine',
    status: 'connected',
    health: 'healthy',
    lastActivity: '12 sec ago',
    traceCount: 92140,
    usage: { requestsPerMin: 1284, successRate: 99.9 },
  },
  {
    id: 'weaver',
    name: 'Weaver',
    purpose: 'Decision Operations Platform',
    status: 'connected',
    health: 'healthy',
    lastActivity: 'live',
    traceCount: 54310,
    usage: { requestsPerMin: 318, successRate: 99.6 },
  },
  {
    id: 'guardian',
    name: 'Guardian',
    purpose: 'Risk Intelligence System',
    status: 'degraded',
    health: 'watch',
    lastActivity: '4 min ago',
    traceCount: 11203,
    usage: { requestsPerMin: 92, successRate: 97.1 },
  },
  {
    id: 'cloud',
    name: 'Cloud',
    purpose: 'Deployment Operations Platform',
    status: 'connected',
    health: 'healthy',
    lastActivity: '1 min ago',
    traceCount: 4821,
    usage: { requestsPerMin: 21, successRate: 100 },
  },
  {
    id: 'claim-clarity',
    name: 'Claim Clarity',
    purpose: 'Healthcare Adjudication Solution',
    status: 'pending',
    health: 'needs_attention',
    lastActivity: 'awaiting handshake',
    traceCount: 0,
    usage: { requestsPerMin: 0, successRate: 0 },
  },
];

const MOCK_EVENTS: PlatformEvent[] = [
  {
    id: 'evt-001',
    kind: 'workflow',
    service: 'glue',
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    traceId: 'trc_8af21c',
    outcome: 'success',
    workflowId: 'wf-ingest-claims',
    workflowName: 'Claims Ingestion',
    durationMs: 184,
    actor: 'system',
  },
  {
    id: 'evt-002',
    kind: 'inference',
    service: 'core',
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    traceId: 'trc_91b2de',
    outcome: 'success',
    caseId: 'CASE-2041',
    decision: 'approve',
    confidence: 92.4,
    rulesFired: 7,
  },
  {
    id: 'evt-003',
    kind: 'decision',
    service: 'weaver',
    timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    traceId: 'trc_91b2de',
    outcome: 'success',
    caseId: 'CASE-2041',
    decision: 'approve',
    reviewer: 'A. Patel',
  },
  {
    id: 'evt-004',
    kind: 'workflow',
    service: 'weaver',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    traceId: 'trc_44c901',
    outcome: 'success',
    workflowId: 'wf-replay',
    workflowName: 'Rule Replay Performed',
    durationMs: 612,
  },
  {
    id: 'evt-005',
    kind: 'governance',
    service: 'weaver',
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    traceId: 'trc_55d712',
    outcome: 'warning',
    category: 'Decision Explainability',
    finding: 'Governance review completed: 3 rules need explanation templates',
    severity: 'medium',
  },
  {
    id: 'evt-006',
    kind: 'deployment',
    service: 'cloud',
    timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    traceId: 'trc_77e103',
    outcome: 'success',
    environment: 'prod',
    version: '1.0.0',
    component: 'weaver-edge',
  },
  {
    id: 'evt-007',
    kind: 'risk',
    service: 'guardian',
    timestamp: new Date(Date.now() - 1000 * 60 * 31).toISOString(),
    traceId: 'trc_88f240',
    outcome: 'warning',
    riskScore: 78,
    signal: 'Risk alert generated: anomalous claim velocity',
  },
];

const MOCK_AUDIT = [
  { ts: '2026-06-08 14:02:11', system: 'Weaver', action: 'Decision Issued', outcome: 'success', traceId: 'trc_91b2de', user: 'A. Patel' },
  { ts: '2026-06-08 14:00:48', system: 'Core', action: 'Inference Completed', outcome: 'success', traceId: 'trc_91b2de', user: 'system' },
  { ts: '2026-06-08 13:58:02', system: 'Glue', action: 'Workflow Executed', outcome: 'success', traceId: 'trc_8af21c', user: 'system' },
  { ts: '2026-06-08 13:54:19', system: 'Weaver', action: 'Rule Replay Performed', outcome: 'success', traceId: 'trc_44c901', user: 'M. Chen' },
  { ts: '2026-06-08 13:48:55', system: 'Weaver', action: 'Governance Review', outcome: 'warning', traceId: 'trc_55d712', user: 'M. Chen' },
  { ts: '2026-06-08 13:40:12', system: 'Cloud', action: 'Deployment Succeeded', outcome: 'success', traceId: 'trc_77e103', user: 'ci-bot' },
  { ts: '2026-06-08 13:31:04', system: 'Guardian', action: 'Risk Alert Generated', outcome: 'warning', traceId: 'trc_88f240', user: 'system' },
];

const GOVERNANCE_PANELS = [
  {
    title: 'Policy Compliance',
    status: 'healthy' as const,
    reasons: ['All active rules reference an approved policy version.'],
  },
  {
    title: 'Audit Readiness',
    status: 'healthy' as const,
    reasons: ['100% of decisions in the last 30 days have full trace coverage.'],
  },
  {
    title: 'Decision Explainability',
    status: 'watch' as const,
    reasons: ['3 rules missing explanation templates.', 'Review recommended this week.'],
  },
  {
    title: 'Trace Coverage',
    status: 'healthy' as const,
    reasons: ['Trace IDs present on 99.8% of cross-system events.'],
  },
  {
    title: 'Rule Health',
    status: 'watch' as const,
    reasons: ['2 rules have not fired in 90+ days.', 'Consider retirement or revision.'],
  },
  {
    title: 'Operational Health',
    status: 'needs_attention' as const,
    reasons: ['Guardian connector reporting degraded latency.'],
  },
];

function outcomeBadge(outcome: string) {
  const variant =
    outcome === 'success'
      ? 'success'
      : outcome === 'failure'
        ? 'destructive'
        : outcome === 'warning'
          ? 'warning'
          : 'secondary';

  return (
    <Badge variant={variant as any} className="capitalize">
      {outcome}
    </Badge>
  );
}

export default function Platform() {
  const services = MOCK_SERVICES;
  const events = MOCK_EVENTS;

  const overview = useMemo(() => {
    const connected = services.filter((s) => s.status === 'connected').length;
    const totalTraces = services.reduce((acc, s) => acc + s.traceCount, 0);
    const avgSuccess =
      services.reduce((acc, s) => acc + s.usage.successRate, 0) / services.length;

    return {
      connected,
      total: services.length,
      health: avgSuccess >= 99 ? 'Operational' : avgSuccess >= 95 ? 'Degraded' : 'Critical',
      activeDecisions: 1842,
      auditEvents: MOCK_AUDIT.length * 1247,
      governanceAlerts: GOVERNANCE_PANELS.filter((p) => p.status !== 'healthy').length,
      traceRecords: totalTraces,
    };
  }, [services]);

  return (
    <AppLayout>
      <div className="space-y-8 p-6 max-w-[1600px] mx-auto">
        {/* Identity header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center">
                <Boxes className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-display-md text-foreground tracking-tight">ValtariOS</h1>
                <p className="text-body-md text-muted-foreground">
                  The Operating System for Decisions
                </p>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-body-sm text-muted-foreground">
              Unified visibility across decisions, workflows, governance, audits,
              deployments, and platform services.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-caption text-muted-foreground">
            <span>Environment</span><span className="font-mono text-foreground">production</span>
            <span>Region</span><span className="font-mono text-foreground">us-east-1</span>
            <span>User</span><span className="font-mono text-foreground">operator@valtarios</span>
            <span>Version</span><span className="font-mono text-foreground">1.0.0</span>
            <span>Build</span><span className="font-mono text-foreground">2026.06</span>
          </div>
        </header>

        {/* Section 1 — Overview */}
        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard
            icon={Network}
            label="Connected Services"
            value={`${overview.connected}/${overview.total}`}
            change="+1"
            changeTone="positive"
          />
          <StatCard
            icon={Gauge}
            label="Platform Health"
            value={overview.health}
            change="99.8%"
            changeTone="positive"
            color="bg-success/10 text-success"
          />
          <StatCard
            icon={Activity}
            label="Active Decisions"
            value={overview.activeDecisions.toLocaleString()}
            change="+4.2%"
            changeTone="positive"
          />
          <StatCard
            icon={Layers}
            label="Audit Events"
            value={overview.auditEvents.toLocaleString()}
            change="24h"
            changeTone="neutral"
          />
          <StatCard
            icon={ShieldCheck}
            label="Governance Alerts"
            value={overview.governanceAlerts}
            change="watch"
            changeTone="neutral"
            color="bg-warning/10 text-warning"
          />
          <StatCard
            icon={GitBranch}
            label="Trace Records"
            value={overview.traceRecords.toLocaleString()}
            change="+12%"
            changeTone="positive"
          />
        </section>

        {/* Section 2 — Ecosystem Services */}
        <InspectorPanel
          icon={Boxes}
          title="Ecosystem Services"
          description="Services connected to the ValtariOS platform."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((svc) => {
              const Icon = SERVICE_META[svc.id].icon;
              return (
                <div
                  key={svc.id}
                  id={svc.id}
                  className="rounded-xl border border-border bg-gradient-card p-5 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{svc.name}</h3>
                        <p className="text-caption text-muted-foreground">{svc.purpose}</p>
                      </div>
                    </div>
                    <HealthBadge status={svc.health} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-caption">
                    <div className="rounded-md bg-surface-2 p-2">
                      <div className="text-muted-foreground">Status</div>
                      <div className="font-medium text-foreground capitalize">{svc.status}</div>
                    </div>
                    <div className="rounded-md bg-surface-2 p-2">
                      <div className="text-muted-foreground">Last</div>
                      <div className="font-medium text-foreground">{svc.lastActivity}</div>
                    </div>
                    <div className="rounded-md bg-surface-2 p-2">
                      <div className="text-muted-foreground">Traces</div>
                      <div className="font-mono text-foreground">
                        {svc.traceCount.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-caption text-muted-foreground border-t border-border pt-3">
                    <span>{svc.usage.requestsPerMin} req/min</span>
                    <span className="font-mono">{svc.usage.successRate}% success</span>
                  </div>
                </div>
              );
            })}
          </div>
        </InspectorPanel>

        {/* Section 3 — Cross-System Event Stream */}
        <InspectorPanel
          icon={Workflow}
          title="Cross-System Event Stream"
          description="Live timeline of events flowing across ValtariOS services."
        >
          <div className="grid gap-3">
            {events.map((evt) => {
              const subtitle =
                evt.kind === 'workflow'
                  ? `${evt.workflowName} · ${evt.durationMs ?? 0}ms`
                  : evt.kind === 'inference'
                    ? `Inference completed · ${evt.rulesFired ?? 0} rules fired`
                    : evt.kind === 'decision'
                      ? `Decision issued on ${evt.caseId}`
                      : evt.kind === 'deployment'
                        ? `Deployed ${evt.component} ${evt.version} → ${evt.environment}`
                        : evt.kind === 'governance'
                          ? evt.finding
                          : evt.signal;

              return (
                <TraceCard
                  key={evt.id}
                  title={`${evt.service.toUpperCase()} · ${evt.kind}`}
                  subtitle={subtitle}
                  decision={evt.kind === 'decision' || evt.kind === 'inference' ? (evt as any).decision : undefined}
                  confidence={evt.kind === 'inference' ? (evt as any).confidence : undefined}
                  timestamp={evt.timestamp}
                  traceId={evt.traceId}
                  mode={evt.kind}
                  actions={outcomeBadge(evt.outcome)}
                />
              );
            })}
          </div>
        </InspectorPanel>

        {/* Section 4 — Shared Audit Fabric */}
        <InspectorPanel
          icon={Server}
          title="Shared Audit Fabric"
          description="Unified, immutable audit log across all ValtariOS services."
        >
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Trace ID</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_AUDIT.map((row) => (
                  <TableRow key={row.traceId + row.action}>
                    <TableCell className="font-mono text-caption">{row.ts}</TableCell>
                    <TableCell>{row.system}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>{outcomeBadge(row.outcome)}</TableCell>
                    <TableCell className="font-mono text-caption">{row.traceId}</TableCell>
                    <TableCell>{row.user}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </InspectorPanel>

        {/* Section 5 — Platform Governance */}
        <InspectorPanel
          icon={ShieldCheck}
          title="Platform Governance"
          description="Continuous governance signals across ValtariOS."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {GOVERNANCE_PANELS.map((g) => (
              <GovernanceCard
                key={g.title}
                title={g.title}
                status={g.status}
                reasons={g.reasons}
              />
            ))}
          </div>
        </InspectorPanel>

        {/* Section 9 — Future Connectivity */}
        <InspectorPanel
          icon={Network}
          title="Connectivity"
          description="Integration surfaces registered with ValtariOS."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {getServiceEntries().map((entry) => {
              const svc = services.find((s) => s.id === entry.service);
              const status = svc?.status ?? (entry.available ? 'connected' : 'pending');
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-1 p-4"
                >
                  <div>
                    <div className="font-medium text-foreground">{entry.label}</div>
                    <div className="text-caption text-muted-foreground">
                      {entry.description}
                    </div>
                  </div>
                  <Badge
                    variant={
                      (status === 'connected'
                        ? 'success'
                        : status === 'degraded'
                          ? 'warning'
                          : status === 'offline'
                            ? 'destructive'
                            : 'secondary') as any
                    }
                    className="capitalize"
                  >
                    {status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </InspectorPanel>
      </div>
    </AppLayout>
  );
}
