import { AppLayout } from '@/components/layout/AppLayout';
import { useCases, useRules, useMetrics } from '@/hooks/use-data';
import { useSeedDemoData } from '@/hooks/use-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, AlertTriangle, CheckCircle2, Zap, BarChart3, Database, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ProcessingVolumeChart } from '@/components/dashboard/ProcessingVolumeChart';
import { DecisionDistChart } from '@/components/dashboard/DecisionDistChart';
import { ConfidenceTrendChart } from '@/components/dashboard/ConfidenceTrendChart';

export default function Dashboard() {
  const { data: cases = [], isLoading: casesLoading } = useCases();
  const { data: rules = [], isLoading: rulesLoading } = useRules();
  const { data: metrics = [], isLoading: metricsLoading } = useMetrics();
  const seedData = useSeedDemoData();

  const resolved = useMemo(() => cases.filter(c => c.status === 'resolved').length, [cases]);
  const escalated = useMemo(() => cases.filter(c => c.status === 'escalated').length, [cases]);
  const avgConf = useMemo(() => {
    const withConf = cases.filter(c => c.confidence);
    return withConf.length > 0 ? withConf.reduce((s, c) => s + (c.confidence || 0), 0) / withConf.length : 0;
  }, [cases]);

  const decisionDist = useMemo(() => Object.entries(
    cases.filter(c => c.decision).reduce<Record<string, number>>((acc, c) => {
      acc[c.decision!] = (acc[c.decision!] || 0) + 1; return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })), [cases]);

  const severityDist = useMemo(() => Object.entries(
    cases.reduce<Record<string, number>>((acc, c) => {
      acc[c.severity] = (acc[c.severity] || 0) + 1; return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })), [cases]);

  const topRules = useMemo(() => [...rules].sort((a, b) => b.hitCount - a.hitCount).slice(0, 5), [rules]);
  const recentMetrics = useMemo(() => metrics.slice(-14), [metrics]);

  const isLoading = casesLoading || rulesLoading || metricsLoading;
  const isEmpty = !isLoading && cases.length === 0 && rules.length === 0;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display-sm text-foreground">Dashboard</h1>
            <p className="text-body-sm text-muted-foreground mt-1">Real-time inference intelligence overview</p>
          </div>
          <Badge variant="confidence" className="gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {isLoading ? 'Loading...' : 'System Healthy'}
          </Badge>
        </div>

        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border-2 border-dashed border-border bg-gradient-card p-12 text-center"
          >
            <Database className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="text-body-lg font-semibold text-foreground mb-2">Welcome to InferenceCore</h2>
            <p className="text-body-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Your dashboard is empty. Load demo data to explore the platform with sample rules, cases, and metrics.
            </p>
            <Button variant="hero" className="gap-2" onClick={() => seedData.mutate()} disabled={seedData.isPending}>
              {seedData.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Seeding...</>
              ) : (
                <><Database className="w-4 h-4" /> Load Demo Data</>
              )}
            </Button>
          </motion.div>
        )}

        {!isEmpty && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard icon={Activity} label="Total Processed" value={cases.length.toString()} color="bg-primary/10 text-primary" />
              <MetricCard icon={CheckCircle2} label="Auto-Resolved" value={cases.length > 0 ? `${Math.round(resolved / cases.length * 100)}%` : '—'} color="bg-success/10 text-success" />
              <MetricCard icon={AlertTriangle} label="Escalated" value={cases.length > 0 ? `${Math.round(escalated / cases.length * 100)}%` : '—'} color="bg-warning/10 text-warning" />
              <MetricCard icon={TrendingUp} label="Avg Confidence" value={avgConf > 0 ? `${avgConf.toFixed(1)}%` : '—'} color="bg-info/10 text-info" />
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <ProcessingVolumeChart metrics={recentMetrics} />
              <DecisionDistChart data={decisionDist} />
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <ConfidenceTrendChart metrics={recentMetrics} />
              <div className="rounded-xl border border-border bg-gradient-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-primary" />
                  <h2 className="text-body-md font-semibold text-foreground">Top Rules</h2>
                </div>
                <div className="space-y-3">
                  {topRules.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between">
                      <div>
                        <div className="text-body-sm text-foreground">{rule.name}</div>
                        <div className="text-caption text-muted-foreground">{rule.category}</div>
                      </div>
                      <Badge variant="secondary" className="font-mono text-caption">{rule.hitCount}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-gradient-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h2 className="text-body-md font-semibold text-foreground">Severity Distribution</h2>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {severityDist.map(s => {
                  const colors: Record<string, string> = { low: 'text-severity-low', medium: 'text-severity-medium', high: 'text-severity-high', critical: 'text-severity-critical' };
                  return (
                    <div key={s.name} className="text-center p-4 rounded-lg bg-surface-2">
                      <div className={`text-display-sm ${colors[s.name] || 'text-foreground'}`}>{s.value}</div>
                      <div className="text-caption text-muted-foreground capitalize mt-1">{s.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
