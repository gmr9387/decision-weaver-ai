import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  FileSearch,
  Flame,
  Gauge,
  Layers,
  ListChecks,
  ShieldCheck,
} from 'lucide-react';
import {
  InspectorPanel,
  StatCard,
  GovernanceCard,
} from '@/components/design-system';
import type { Rule } from '@/lib/types';
import type { GovernanceStatus } from '@/lib/rule-governance';

type RunRow = {
  id: string;
  decision: string;
  confidence: number;
  confidence_band: string | null;
  severity?: string | null;
  fired_rules: any;
  missing_facts: string[] | null;
  contradictions: string[] | null;
};

interface Props {
  runs: RunRow[];
  rules: Rule[];
}

const DECISION_COLORS: Record<string, string> = {
  approve: 'hsl(152, 69%, 41%)',
  deny: 'hsl(0, 72%, 51%)',
  review: 'hsl(38, 92%, 50%)',
  escalate: 'hsl(15, 90%, 55%)',
  request_info: 'hsl(210, 100%, 52%)',
  unresolved: 'hsl(215, 15%, 55%)',
};

const BAND_COLORS: Record<string, string> = {
  low: 'hsl(0, 72%, 51%)',
  medium: 'hsl(38, 92%, 50%)',
  high: 'hsl(185, 85%, 48%)',
  very_high: 'hsl(152, 69%, 41%)',
};

const SEVERITY_RANK: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const SEVERITY_LABEL = ['—', 'Low', 'Medium', 'High', 'Critical'];

function arr<T = any>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function EngineHealthPanel({ runs, rules }: Props) {
  const metrics = useMemo(() => {
    const totalRules = rules.length;
    const enabledRules = rules.filter((r) => r.enabled).length;

    let firedTotal = 0;
    const fireCountById = new Map<string, { name: string; count: number }>();
    const decisionCounts: Record<string, number> = {
      approve: 0,
      deny: 0,
      review: 0,
      escalate: 0,
      request_info: 0,
      unresolved: 0,
    };
    const bandCounts: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      very_high: 0,
    };

    let confSum = 0;
    let severitySum = 0;
    let severityN = 0;
    let runsWithContradiction = 0;
    let runsWithMissing = 0;

    for (const run of runs) {
      const fired = arr<any>(run.fired_rules).filter((r) => r?.fired);
      firedTotal += fired.length;

      for (const fr of fired) {
        const id = fr.ruleId ?? fr.rule_id ?? fr.name ?? 'unknown';
        const name = fr.ruleName ?? fr.name ?? id;
        const existing = fireCountById.get(id);
        if (existing) existing.count += 1;
        else fireCountById.set(id, { name, count: 1 });
      }

      if (decisionCounts[run.decision] !== undefined) {
        decisionCounts[run.decision] += 1;
      } else {
        decisionCounts[run.decision] = (decisionCounts[run.decision] ?? 0) + 1;
      }

      const band = run.confidence_band ?? '';
      if (bandCounts[band] !== undefined) bandCounts[band] += 1;

      confSum += Number(run.confidence ?? 0);

      const sev = run.severity ?? '';
      if (SEVERITY_RANK[sev]) {
        severitySum += SEVERITY_RANK[sev];
        severityN += 1;
      }

      if (arr(run.contradictions).length > 0) runsWithContradiction += 1;
      if (arr(run.missing_facts).length > 0) runsWithMissing += 1;
    }

    const runCount = runs.length;
    const avgFired = runCount > 0 ? firedTotal / runCount : 0;
    const avgConfidence = runCount > 0 ? confSum / runCount : 0;
    const avgSeverity = severityN > 0 ? severitySum / severityN : 0;
    const contradictionRate = runCount > 0 ? runsWithContradiction / runCount : 0;
    const missingFactRate = runCount > 0 ? runsWithMissing / runCount : 0;

    const topRules = Array.from(fireCountById.entries())
      .map(([id, v]) => ({ id, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Engine health heuristic
    let status: GovernanceStatus = 'healthy';
    const reasons: string[] = [];

    if (runCount === 0) {
      status = 'watch';
      reasons.push('No persisted inference runs yet.');
    } else {
      if (contradictionRate > 0.25) {
        status = 'needs_attention';
        reasons.push(`High contradiction rate (${(contradictionRate * 100).toFixed(0)}%).`);
      } else if (contradictionRate > 0.1) {
        if (status === 'healthy') status = 'watch';
        reasons.push(`Elevated contradiction rate (${(contradictionRate * 100).toFixed(0)}%).`);
      }

      if (missingFactRate > 0.4) {
        status = 'needs_attention';
        reasons.push(`High missing-fact rate (${(missingFactRate * 100).toFixed(0)}%).`);
      } else if (missingFactRate > 0.2) {
        if (status === 'healthy') status = 'watch';
        reasons.push(`Elevated missing-fact rate (${(missingFactRate * 100).toFixed(0)}%).`);
      }

      if (avgConfidence < 50) {
        status = 'needs_attention';
        reasons.push(`Low average confidence (${avgConfidence.toFixed(0)}%).`);
      } else if (avgConfidence < 65) {
        if (status === 'healthy') status = 'watch';
        reasons.push(`Moderate average confidence (${avgConfidence.toFixed(0)}%).`);
      }

      if (totalRules > 0 && enabledRules / totalRules < 0.5) {
        if (status === 'healthy') status = 'watch';
        reasons.push('Less than half of rules are enabled.');
      }
    }

    if (reasons.length === 0) reasons.push('All engine signals within healthy thresholds.');

    return {
      totalRules,
      enabledRules,
      avgFired,
      topRules,
      decisionCounts,
      bandCounts,
      avgConfidence,
      avgSeverity,
      contradictionRate,
      missingFactRate,
      runCount,
      status,
      reasons,
    };
  }, [runs, rules]);

  const decisionData = Object.entries(metrics.decisionCounts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: v }));

  const bandData = (['low', 'medium', 'high', 'very_high'] as const).map((band) => ({
    name: band,
    value: metrics.bandCounts[band] ?? 0,
  }));

  const empty = metrics.runCount === 0;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-display-xs text-foreground flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          Decision Engine Health
        </h2>
        <p className="text-body-sm text-muted-foreground mt-1">
          Live observability across the modular engine — rules, decisions, confidence, and governance pressure.
        </p>
      </header>

      <GovernanceCard
        title="Engine Status"
        status={metrics.status}
        reasons={metrics.reasons}
        meta={
          empty
            ? 'No data yet'
            : `${metrics.runCount} run${metrics.runCount === 1 ? '' : 's'} analyzed`
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard
          icon={ListChecks}
          label="Total Rules"
          value={metrics.totalRules}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          icon={ShieldCheck}
          label="Enabled Rules"
          value={metrics.enabledRules}
          color="bg-success/10 text-success"
          hint={
            metrics.totalRules > 0
              ? `${Math.round((metrics.enabledRules / metrics.totalRules) * 100)}% of total`
              : undefined
          }
        />
        <StatCard
          icon={Flame}
          label="Avg Rules Fired / Run"
          value={metrics.avgFired.toFixed(1)}
          color="bg-warning/10 text-warning"
        />
        <StatCard
          icon={Activity}
          label="Avg Confidence"
          value={`${metrics.avgConfidence.toFixed(1)}%`}
          color="bg-info/10 text-info"
        />
      </div>

      <InspectorPanel icon={Flame} title="Top 10 Most-Fired Rules" description="Rule execution leaderboard across persisted runs.">
        {metrics.topRules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rule executions recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, metrics.topRules.length * 28)}>
            <BarChart data={metrics.topRules} layout="vertical" margin={{ left: 12, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 14%)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(222, 20%, 10%)',
                  border: '1px solid hsl(222, 15%, 18%)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="hsl(185, 85%, 48%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </InspectorPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <InspectorPanel icon={Layers} title="Decision Distribution" description="Breakdown of resolved decisions across runs.">
          {decisionData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No decisions recorded.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={decisionData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {decisionData.map((d) => (
                    <Cell key={d.name} fill={DECISION_COLORS[d.name] ?? 'hsl(215, 15%, 55%)'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(222, 20%, 10%)',
                    border: '1px solid hsl(222, 15%, 18%)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: 'hsl(215, 15%, 55%)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </InspectorPanel>

        <InspectorPanel icon={Activity} title="Confidence Distribution" description="Runs grouped by confidence band.">
          {empty ? (
            <p className="text-sm text-muted-foreground">No confidence data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bandData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 14%)" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(222, 20%, 10%)',
                    border: '1px solid hsl(222, 15%, 18%)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {bandData.map((b) => (
                    <Cell key={b.name} fill={BAND_COLORS[b.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </InspectorPanel>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard
          icon={AlertTriangle}
          label="Contradiction Rate"
          value={`${(metrics.contradictionRate * 100).toFixed(1)}%`}
          color="bg-destructive/10 text-destructive"
          hint="Runs with ≥1 contradiction"
        />
        <StatCard
          icon={FileSearch}
          label="Missing Fact Rate"
          value={`${(metrics.missingFactRate * 100).toFixed(1)}%`}
          color="bg-warning/10 text-warning"
          hint="Runs with ≥1 missing fact"
        />
        <StatCard
          icon={Activity}
          label="Average Confidence"
          value={`${metrics.avgConfidence.toFixed(1)}%`}
          color="bg-info/10 text-info"
        />
        <StatCard
          icon={Gauge}
          label="Average Severity"
          value={
            metrics.avgSeverity > 0
              ? `${SEVERITY_LABEL[Math.round(metrics.avgSeverity)]} (${metrics.avgSeverity.toFixed(2)})`
              : '—'
          }
          color="bg-primary/10 text-primary"
        />
      </div>
    </div>
  );
}
