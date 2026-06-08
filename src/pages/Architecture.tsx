import { AppLayout } from '@/components/layout/AppLayout';
import { InspectorPanel } from '@/components/design-system';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  AppWindow,
  Boxes,
  Cpu,
  Database,
  Network,
  GitBranch,
  ShieldCheck,
  Cloud as CloudIcon,
  HeartPulse,
  ArrowRight,
  Workflow,
  History,
  FileSearch,
  GitCommit,
  Scale,
  CheckCircle2,
  Eye,
  Activity,
  Hand,
  Fingerprint,
  Gauge,
  Receipt,
  Store,
  BookOpen,
  Layers,
} from 'lucide-react';

function LayerRow({
  icon: Icon,
  label,
  items,
  tone = 'bg-surface-2',
}: {
  icon: any;
  label: string;
  items: string[];
  tone?: string;
}) {
  return (
    <div className={`rounded-xl border border-border ${tone} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-foreground">{label}</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="outline" className="bg-background">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center text-muted-foreground">
      <ArrowRight className="w-5 h-5 rotate-90" />
    </div>
  );
}

export default function Architecture() {
  return (
    <AppLayout>
      <div className="space-y-8 p-6 max-w-[1400px] mx-auto">
        <header className="border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-display-md text-foreground tracking-tight">
                Enterprise Architecture
              </h1>
              <p className="text-body-md text-muted-foreground">
                How ValtariOS works — understandable in 60 seconds.
              </p>
            </div>
          </div>
        </header>

        {/* Platform Architecture */}
        <InspectorPanel
          icon={Boxes}
          title="Platform Architecture"
          description="Layered view of ValtariOS from end users down to the data layer."
        >
          <div className="grid gap-3">
            <LayerRow
              icon={Users}
              label="Users"
              items={['Analysts', 'Reviewers', 'Operators', 'Executives', 'Auditors']}
            />
            <FlowArrow />
            <LayerRow
              icon={AppWindow}
              label="Applications"
              items={['Web Console', 'API Clients', 'Workflow Triggers', 'Embedded UIs']}
            />
            <FlowArrow />
            <LayerRow
              icon={Boxes}
              label="ValtariOS Layer"
              items={['Identity', 'Navigation', 'Audit Fabric', 'Event Bus', 'Governance']}
              tone="bg-primary/5"
            />
            <FlowArrow />
            <LayerRow
              icon={Cpu}
              label="Decision Services"
              items={['Glue', 'Core', 'Weaver', 'Guardian', 'Cloud', 'Claim Clarity']}
            />
            <FlowArrow />
            <LayerRow
              icon={Database}
              label="Data Layer"
              items={['Cases', 'Rules', 'Rule Versions', 'Inference Runs', 'Audit Events', 'Outcomes']}
            />
          </div>
        </InspectorPanel>

        {/* Service Relationships */}
        <InspectorPanel
          icon={Network}
          title="Service Relationships"
          description="How ValtariOS services depend on and feed each other."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { from: 'Glue', via: 'Core', to: 'Weaver', icons: [Network, Cpu, GitBranch] },
              { from: 'Guardian', via: null, to: 'Core', icons: [ShieldCheck, null, Cpu] },
              { from: 'Cloud', via: null, to: 'Platform', icons: [CloudIcon, null, Boxes] },
              { from: 'Claim Clarity', via: 'Core', to: 'Weaver', icons: [HeartPulse, Cpu, GitBranch] },
            ].map((rel) => {
              const [FromIcon, ViaIcon, ToIcon] = rel.icons;
              return (
                <div
                  key={rel.from + rel.to}
                  className="rounded-xl border border-border bg-gradient-card p-4 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    {FromIcon && <FromIcon className="w-4 h-4 text-primary" />}
                    <span className="font-medium text-foreground">{rel.from}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  {rel.via && ViaIcon && (
                    <>
                      <div className="flex items-center gap-2">
                        <ViaIcon className="w-4 h-4 text-primary" />
                        <span className="font-medium text-foreground">{rel.via}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    {ToIcon && <ToIcon className="w-4 h-4 text-primary" />}
                    <span className="font-medium text-foreground">{rel.to}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </InspectorPanel>

        {/* Event Flow */}
        <InspectorPanel
          icon={Workflow}
          title="Event Flow"
          description="End-to-end lifecycle of a decision inside ValtariOS."
        >
          <div className="grid gap-3 md:grid-cols-6">
            {[
              { label: 'Input', icon: FileSearch, hint: 'Case ingested' },
              { label: 'Rule Evaluation', icon: Scale, hint: 'Conditions matched' },
              { label: 'Inference', icon: Cpu, hint: 'Confidence scored' },
              { label: 'Decision', icon: CheckCircle2, hint: 'Outcome issued' },
              { label: 'Audit', icon: History, hint: 'Trace persisted' },
              { label: 'Replay', icon: GitCommit, hint: 'Re-runnable' },
            ].map((step, idx) => (
              <div
                key={step.label}
                className="relative rounded-xl border border-border bg-surface-2 p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <step.icon className="w-4 h-4" />
                  </div>
                  <span className="text-caption font-mono text-muted-foreground">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="font-medium text-foreground">{step.label}</div>
                <div className="text-caption text-muted-foreground">{step.hint}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg bg-surface-2 p-3 font-mono text-caption text-muted-foreground overflow-x-auto">
            trace_id → input → rules[] → inference → decision → audit → replay
          </div>
        </InspectorPanel>

        {/* Governance Model */}
        <InspectorPanel
          icon={ShieldCheck}
          title="Governance Model"
          description="Mechanisms that keep every decision auditable and accountable."
        >
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            {[
              { label: 'Versioning', icon: GitCommit, desc: 'Every rule change is immutably versioned.' },
              { label: 'Replay', icon: History, desc: 'Any decision can be re-run against any version.' },
              { label: 'Audit Trails', icon: FileSearch, desc: 'Cross-system, append-only event log.' },
              { label: 'Decision Trace', icon: GitBranch, desc: 'Per-decision lineage and rule firings.' },
              { label: 'Rule Governance', icon: Scale, desc: 'Health scoring, conflicts, dependencies.' },
            ].map((g) => (
              <div key={g.label} className="rounded-xl border border-border bg-gradient-card p-4">
                <g.icon className="w-5 h-5 text-primary mb-2" />
                <div className="font-semibold text-foreground">{g.label}</div>
                <div className="text-caption text-muted-foreground mt-1">{g.desc}</div>
              </div>
            ))}
          </div>
        </InspectorPanel>

        {/* Platform Principles */}
        <InspectorPanel
          icon={CheckCircle2}
          title="Platform Principles"
          description="The non-negotiables that shape every ValtariOS service."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              { label: 'Deterministic First', icon: Scale },
              { label: 'Explainability Required', icon: Eye },
              { label: 'Trace Everything', icon: Activity },
              { label: 'Govern Before Automating', icon: ShieldCheck },
              { label: 'Human Override Available', icon: Hand },
            ].map((p) => (
              <div
                key={p.label}
                className="rounded-xl border border-border bg-surface-1 p-4 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <p.icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-foreground">{p.label}</span>
              </div>
            ))}
          </div>
        </InspectorPanel>

        {/* Future Modules */}
        <InspectorPanel
          icon={Boxes}
          title="Future Modules"
          description="Reserved surfaces in the ValtariOS roadmap."
        >
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            {[
              { label: 'Identity', icon: Fingerprint },
              { label: 'Monitoring', icon: Gauge },
              { label: 'Billing', icon: Receipt },
              { label: 'Marketplace', icon: Store },
              { label: 'Knowledge', icon: BookOpen },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-dashed border-border bg-surface-2/50 p-4 flex flex-col items-start gap-2"
              >
                <m.icon className="w-5 h-5 text-muted-foreground" />
                <div className="font-medium text-foreground">{m.label}</div>
                <Badge variant="secondary" className="capitalize">Planned</Badge>
              </div>
            ))}
          </div>
        </InspectorPanel>
      </div>
    </AppLayout>
  );
}
