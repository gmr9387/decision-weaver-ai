import { AppLayout } from '@/components/layout/AppLayout';
import { useCases, useRules, useMetrics } from '@/hooks/use-data';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  FileSearch,
  Zap,
  ShieldCheck,
  Brain,
  GitBranch,
  Activity,
} from 'lucide-react';

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function getInference(c: any) {
  return c?.inferenceResult ?? c?.inference_result ?? null;
}

function getMissingFacts(ir: any) {
  return asArray(ir?.missingFacts ?? ir?.missing_facts);
}

function getContradictions(ir: any) {
  return asArray(ir?.contradictions);
}

function getConfidenceBand(ir: any) {
  return ir?.confidenceBand ?? ir?.confidence_band ?? 'unknown';
}

function StatCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-gradient-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const { data: cases = [] } = useCases();
  const { data: rules = [] } = useRules();
  const { data: metrics = [] } = useMetrics();

  const casesWithInference = cases.filter((c: any) => Boolean(getInference(c)));
  const enabledRules = rules.filter((r: any) => r.enabled);
  const totalRules = rules.length;

  const decisionDist = Object.entries(
    casesWithInference.reduce<Record<string, number>>((acc, c: any) => {
      const ir = getInference(c);
      const decision = ir?.decision ?? 'unknown';
      acc[decision] = (acc[decision] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const confidenceBandDist = Object.entries(
    casesWithInference.reduce<Record<string, number>>((acc, c: any) => {
      const band = getConfidenceBand(getInference(c));
      acc[band] = (acc[band] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const categoryDist = Object.entries(
    cases.reduce<Record<string, number>>((acc: Record<string, number>, c: any) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const missingFactsAgg = casesWithInference
    .flatMap((c: any) => getMissingFacts(getInference(c)))
    .reduce<Record<string, number>>((acc, fact) => {
      acc[String(fact)] = (acc[String(fact)] || 0) + 1;
      return acc;
    }, {});

  const topMissing = Object.entries(missingFactsAgg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const contradictionAgg = casesWithInference
    .flatMap((c: any) => getContradictions(getInference(c)))
    .reduce<Record<string, number>>((acc, item) => {
      acc[String(item)] = (acc[String(item)] || 0) + 1;
      return acc;
    }, {});

  const topContradictions = Object.entries(contradictionAgg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topRules = [...rules]
    .sort((a: any, b: any) => (b.hitCount ?? 0) - (a.hitCount ?? 0))
    .slice(0, 8)
    .map((r: any) => ({
      name: r.name.length > 20 ? `${r.name.slice(0, 20)}…` : r.name,
      hits: r.hitCount ?? 0,
    }));

  const avgConfidence = casesWithInference.length > 0
    ? Math.round(
        casesWithInference.reduce((sum: number, c: any) => sum + Number(getInference(c)?.confidence ?? 0), 0) /
          casesWithInference.length,
      )
    : 0;

  const escalationRate = casesWithInference.length > 0
    ? Math.round(
        (casesWithInference.filter((c: any) => getInference(c)?.decision === 'escalate').length / casesWithInference.length) * 100,
      )
    : 0;

  const contradictionRate = casesWithInference.length > 0
    ? Math.round(
        (casesWithInference.filter((c: any) => getContradictions(getInference(c)).length > 0).length / casesWithInference.length) * 100,
      )
    : 0;

  const missingFactRate = casesWithInference.length > 0
    ? Math.round(
        (casesWithInference.filter((c: any) => getMissingFacts(getInference(c)).length > 0).length / casesWithInference.length) * 100,
      )
    : 0;

  const escalationTrend = metrics.slice(-14).map((m: any) => ({
    date: m.date.slice(5),
    rate: m.processed > 0 ? Math.round((m.escalated / m.processed) * 100) : 0,
  }));

  const riskFlags = [
    {
      label: 'Missing fact pressure',
      value: `${missingFactRate}%`,
      status: missingFactRate > 40 ? 'warning' : 'stable',
      detail: `${topMissing.length} recurring missing fact pattern${topMissing.length !== 1 ? 's' : ''}`,
    },
    {
      label: 'Contradiction pressure',
      value: `${contradictionRate}%`,
      status: contradictionRate > 15 ? 'warning' : 'stable',
      detail: `${topContradictions.length} contradiction pattern${topContradictions.length !== 1 ? 's' : ''}`,
    },
    {
      label: 'Rule coverage',
      value: `${enabledRules.length}/${totalRules}`,
      status: enabledRules.length === 0 ? 'warning' : 'stable',
      detail: 'Enabled rules available to the inference engine',
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-display-sm text-foreground">Analytics</h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Executive intelligence across decisions, rules, confidence, evidence gaps, and contradiction patterns.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Cases analyzed"
            value={casesWithInference.length}
            detail={`${cases.length} total cases in workspace`}
            icon={<Brain className="w-4 h-4" />}
          />
          <StatCard
            title="Average confidence"
            value={`${avgConfidence}%`}
            detail="Mean confidence across inferred cases"
            icon={<ShieldCheck className="w-4 h-4" />}
          />
          <StatCard
            title="Escalation rate"
            value={`${escalationRate}%`}
            detail="Share of inferred cases escalated"
            icon={<AlertTriangle className="w-4 h-4" />}
          />
          <StatCard
            title="Enabled rules"
            value={enabledRules.length}
            detail={`${totalRules} total rules configured`}
            icon={<GitBranch className="w-4 h-4" />}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {riskFlags.map((flag) => (
            <div key={flag.label} className="rounded-xl border border-border bg-gradient-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{flag.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{flag.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{flag.detail}</p>
                </div>
                <Badge variant={flag.status === 'warning' ? 'warning' : 'secondary'}>
                  {flag.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Decision Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={decisionDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 14%)" />
                <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(222, 20%, 10%)', border: '1px solid hsl(222, 15%, 18%)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(185, 85%, 48%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Confidence Bands
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={confidenceBandDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 14%)" />
                <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(222, 20%, 10%)', border: '1px solid hsl(222, 15%, 18%)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Case Categories
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 14%)" />
                <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(222, 20%, 10%)', border: '1px solid hsl(222, 15%, 18%)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(185, 85%, 48%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Most Influential Rules
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topRules} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 14%)" />
                <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'hsl(222, 20%, 10%)', border: '1px solid hsl(222, 15%, 18%)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="hits" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> Escalation Rate Trend
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={escalationTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 14%)" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} unit="%" />
                <Tooltip contentStyle={{ background: 'hsl(222, 20%, 10%)', border: '1px solid hsl(222, 15%, 18%)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="rate" fill="hsl(15, 90%, 55%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-warning" /> Most Common Missing Facts
            </h3>
            <div className="space-y-3">
              {topMissing.length > 0 ? (
                topMissing.map(([fact, count]) => (
                  <div key={fact} className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                    <span className="text-body-sm font-mono text-foreground">{fact}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-surface-3">
                        <div
                          className="h-full rounded-full bg-warning"
                          style={{ width: `${topMissing[0] ? (count / topMissing[0][1]) * 100 : 0}%` }}
                        />
                      </div>
                      <Badge variant="secondary" className="font-mono text-caption">{count}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-body-sm text-muted-foreground">
                  No missing fact patterns detected.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-6">
          <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Contradiction Patterns
          </h3>

          <div className="space-y-3">
            {topContradictions.length > 0 ? (
              topContradictions.map(([pattern, count]) => (
                <div key={pattern} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-surface-2">
                  <span className="text-body-sm text-foreground">{pattern}</span>
                  <Badge variant="warning" className="font-mono text-caption">{count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-body-sm text-muted-foreground">
                No recurring contradiction patterns detected.
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}