import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  GitBranch,
  Network,
  TableProperties,
  Search as SearchIcon,
} from 'lucide-react';
import type { Rule } from '@/lib/types';
import { summarize } from '@/lib/rule-governance';
import { detectConflicts, type ConflictSeverity } from '@/lib/rule-conflicts';
import { buildDependencyGraph } from '@/lib/rule-dependencies';
import { GovernanceCard, StatCard } from '@/components/design-system';
import { Input } from '@/components/ui/input';

interface Props {
  rules: Rule[];
}

const SEVERITY_VARIANT: Record<ConflictSeverity, string> = {
  high: 'destructive',
  medium: 'warning',
  low: 'secondary',
};

export function GovernanceDashboard({ rules }: Props) {
  const [tab, setTab] = useState('health');
  const [search, setSearch] = useState('');

  const summary = useMemo(() => summarize(rules), [rules]);
  const conflicts = useMemo(() => detectConflicts(rules), [rules]);
  const graph = useMemo(() => buildDependencyGraph(rules), [rules]);

  const ruleById = useMemo(() => {
    const m: Record<string, Rule> = {};
    for (const r of rules) m[r.id] = r;
    return m;
  }, [rules]);

  const filteredEvaluations = useMemo(() => {
    if (!search.trim()) return summary.evaluations;
    const q = search.toLowerCase();
    return summary.evaluations.filter((e) => {
      const rule = ruleById[e.ruleId];
      if (!rule) return false;
      return (
        rule.name.toLowerCase().includes(q) ||
        rule.category.toLowerCase().includes(q) ||
        e.status.includes(q)
      );
    });
  }, [summary.evaluations, ruleById, search]);

  return (
    <div className="border-b border-border bg-surface-1">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="px-4 pt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList>
            <TabsTrigger value="health" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Health
            </TabsTrigger>
            <TabsTrigger value="conflicts" className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Conflicts ({conflicts.length})
            </TabsTrigger>
            <TabsTrigger value="dependencies" className="gap-1.5">
              <Network className="h-3.5 w-3.5" /> Dependencies
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full lg:w-72">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter governance items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-surface-2"
            />
          </div>
        </div>

        <TabsContent value="health" className="p-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard
              icon={ShieldCheck}
              label="Healthy"
              value={summary.counts.healthy}
              color="bg-success/10 text-success"
            />
            <StatCard
              icon={ShieldQuestion}
              label="Watch"
              value={summary.counts.watch}
              color="bg-warning/10 text-warning"
            />
            <StatCard
              icon={ShieldAlert}
              label="Needs Attention"
              value={summary.counts.needs_attention}
              color="bg-destructive/10 text-destructive"
            />
            <StatCard
              icon={GitBranch}
              label="Total Rules"
              value={summary.total}
              hint={`${summary.signals.zeroHits} unhit · ${summary.signals.missingExplanation} unexplained`}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredEvaluations.map((e) => {
              const rule = ruleById[e.ruleId];
              if (!rule) return null;
              return (
                <GovernanceCard
                  key={e.ruleId}
                  title={rule.name}
                  status={e.status}
                  meta={
                    <span>
                      {rule.category} · P{rule.priority} · v{rule.version} ·{' '}
                      {rule.hitCount} hit{rule.hitCount === 1 ? '' : 's'}
                    </span>
                  }
                  reasons={e.reasons}
                />
              );
            })}
            {filteredEvaluations.length === 0 && (
              <p className="text-body-sm text-muted-foreground">No matching rules.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="conflicts" className="p-4 space-y-3">
          {conflicts.length === 0 ? (
            <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-body-sm text-success">
              No decision conflicts detected across enabled rules.
            </div>
          ) : (
            conflicts.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-border bg-gradient-card p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <h4 className="font-semibold text-foreground">
                      {c.ruleA.name}{' '}
                      <span className="text-muted-foreground">vs</span> {c.ruleB.name}
                    </h4>
                  </div>
                  <Badge variant={SEVERITY_VARIANT[c.severity] as any} className="capitalize">
                    {c.severity} severity
                  </Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <RuleSummary rule={c.ruleA} decision={c.decisionA} />
                  <RuleSummary rule={c.ruleB} decision={c.decisionB} />
                </div>

                <div className="rounded-lg bg-surface-2 p-3 space-y-2">
                  <p className="text-body-sm text-foreground">{c.reason}</p>
                  <p className="text-caption text-muted-foreground">{c.recommendation}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.sharedFacts.map((f) => (
                      <Badge key={f} variant="outline" className="font-mono text-caption">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="dependencies" className="p-4 space-y-4">
          <DependencyView graph={graph} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RuleSummary({ rule, decision }: { rule: Rule; decision: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <p className="text-body-sm font-medium text-foreground">{rule.name}</p>
      <p className="text-caption text-muted-foreground">
        {rule.category} · P{rule.priority} · impact {rule.confidenceImpact >= 0 ? '+' : ''}
        {rule.confidenceImpact}
      </p>
      <Badge variant="outline" className="mt-2 capitalize">
        {decision.replace('_', ' ')}
      </Badge>
    </div>
  );
}

function DependencyView({ graph }: { graph: ReturnType<typeof buildDependencyGraph> }) {
  const [view, setView] = useState<'graph' | 'table'>('graph');
  const factEntries = Object.keys({ ...graph.producers, ...graph.consumers }).sort();

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant={view === 'graph' ? 'default' : 'outline'}
          className="gap-1.5"
          onClick={() => setView('graph')}
        >
          <Network className="h-3.5 w-3.5" /> Graph
        </Button>
        <Button
          size="sm"
          variant={view === 'table' ? 'default' : 'outline'}
          className="gap-1.5"
          onClick={() => setView('table')}
        >
          <TableProperties className="h-3.5 w-3.5" /> Table
        </Button>
      </div>

      {view === 'graph' ? (
        <DependencyGraphSvg graph={graph} />
      ) : (
        <div className="rounded-xl border border-border bg-gradient-card overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted-foreground">
              <tr>
                <th className="text-left p-3">Fact</th>
                <th className="text-left p-3">Produced By</th>
                <th className="text-left p-3">Consumed By</th>
              </tr>
            </thead>
            <tbody>
              {factEntries.map((fact) => (
                <tr key={fact} className="border-t border-border">
                  <td className="p-3 font-mono text-foreground">{fact}</td>
                  <td className="p-3 text-muted-foreground">
                    {(graph.producers[fact] ?? []).length === 0
                      ? '—'
                      : (graph.producers[fact] ?? [])
                          .map((id) => graph.nodes.find((n) => n.rule.id === id)?.rule.name ?? id)
                          .join(', ')}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {(graph.consumers[fact] ?? []).length === 0
                      ? '—'
                      : (graph.consumers[fact] ?? [])
                          .map((id) => graph.nodes.find((n) => n.rule.id === id)?.rule.name ?? id)
                          .join(', ')}
                  </td>
                </tr>
              ))}
              {factEntries.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-muted-foreground">
                    No fact dependencies discovered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DependencyGraphSvg({ graph }: { graph: ReturnType<typeof buildDependencyGraph> }) {
  const nodes = graph.nodes;
  const cols = Math.max(2, Math.ceil(Math.sqrt(nodes.length)));
  const cellW = 180;
  const cellH = 90;
  const padding = 30;
  const width = cols * cellW + padding * 2;
  const rows = Math.ceil(nodes.length / cols);
  const height = rows * cellH + padding * 2;

  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.set(n.rule.id, {
      x: padding + col * cellW + cellW / 2,
      y: padding + row * cellH + cellH / 2,
    });
  });

  const edges: Array<{ from: string; to: string }> = [];
  for (const node of nodes) {
    for (const up of graph.upstream[node.rule.id] ?? []) {
      edges.push({ from: up, to: node.rule.id });
    }
  }

  if (nodes.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-gradient-card p-6 text-center text-muted-foreground">
        No rules to graph.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-gradient-card p-3 overflow-auto">
      <svg width={width} height={height} className="block">
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="hsl(var(--primary))" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const a = positions.get(e.from);
          const b = positions.get(e.to);
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="hsl(var(--primary))"
              strokeOpacity={0.45}
              strokeWidth={1.25}
              markerEnd="url(#arrow)"
            />
          );
        })}
        {nodes.map((node) => {
          const p = positions.get(node.rule.id)!;
          const isDerived = node.rule.type === 'derived_fact';
          return (
            <g key={node.rule.id} transform={`translate(${p.x - 70}, ${p.y - 24})`}>
              <rect
                width={140}
                height={48}
                rx={10}
                fill={isDerived ? 'hsl(var(--primary) / 0.12)' : 'hsl(var(--surface-2))'}
                stroke="hsl(var(--border))"
              />
              <text
                x={70}
                y={20}
                textAnchor="middle"
                fontSize={11}
                fill="hsl(var(--foreground))"
                fontWeight={600}
              >
                {truncate(node.rule.name, 18)}
              </text>
              <text
                x={70}
                y={36}
                textAnchor="middle"
                fontSize={10}
                fill="hsl(var(--muted-foreground))"
              >
                {node.rule.type} · P{node.rule.priority}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
