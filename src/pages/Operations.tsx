import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useRules } from '@/hooks/use-data';
import { InspectorPanel, DecisionBadge, ConfidenceBadge, StatCard } from '@/components/design-system';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, GitCommit, History, Layers, Loader2 } from 'lucide-react';

type RunRow = {
  id: string;
  case_id: string;
  decision: string;
  confidence: number;
  confidence_band: string | null;
  mode: string;
  created_at: string;
  fired_rules: any;
  decision_trace: any;
  missing_facts: string[] | null;
};

export default function Operations() {
  const { data: rules = [] } = useRules();

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['operations-runs'],
    queryFn: async (): Promise<RunRow[]> => {
      const { data, error } = await supabase
        .from('inference_runs')
        .select(
          'id, case_id, decision, confidence, confidence_band, mode, created_at, fired_rules, decision_trace, missing_facts',
        )
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as RunRow[];
    },
    staleTime: 30000,
  });

  const ruleNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of rules) m[r.id] = r.name;
    return m;
  }, [rules]);

  const stats = useMemo(() => {
    if (runs.length === 0) {
      return { total: 0, avgConf: 0, divergent: 0, modes: {} as Record<string, number> };
    }
    const modes: Record<string, number> = {};
    let confSum = 0;
    let divergent = 0;
    let prevByCase = new Map<string, RunRow>();
    const sorted = [...runs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    for (const r of sorted) {
      const prev = prevByCase.get(r.case_id);
      if (prev && prev.decision !== r.decision) divergent++;
      prevByCase.set(r.case_id, r);
    }
    for (const r of runs) {
      modes[r.mode] = (modes[r.mode] ?? 0) + 1;
      confSum += Number(r.confidence ?? 0);
    }
    return {
      total: runs.length,
      avgConf: Math.round((confSum / runs.length) * 10) / 10,
      divergent,
      modes,
    };
  }, [runs]);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-6xl">
        <header>
          <h1 className="text-display-sm text-foreground">Decision Operations</h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Audit timeline of every persisted inference run — decisions, confidence, rule versions,
            and trace IDs.
          </p>
        </header>

        <div className="grid gap-3 md:grid-cols-4">
          <StatCard
            icon={Activity}
            label="Total Runs"
            value={stats.total}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            icon={ConfidenceIcon}
            label="Avg Confidence"
            value={`${stats.avgConf.toFixed(1)}%`}
            color="bg-info/10 text-info"
          />
          <StatCard
            icon={GitCommit}
            label="Decision Shifts"
            value={stats.divergent}
            color="bg-warning/10 text-warning"
            hint="Cases whose decision changed across runs"
          />
          <StatCard
            icon={Layers}
            label="Mode Mix"
            value={
              <span className="text-body-md text-foreground">
                {Object.entries(stats.modes)
                  .map(([m, c]) => `${m}:${c}`)
                  .join(' · ') || '—'}
              </span>
            }
          />
        </div>

        <InspectorPanel
          icon={History}
          title="Audit Timeline"
          description="Most recent 100 inference runs across all cases, newest first."
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading runs...
            </div>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inference runs recorded yet.</p>
          ) : (
            <ol className="relative border-l border-border ml-2 space-y-4">
              {runs.map((run) => {
                const trace = (run.decision_trace ?? {}) as any;
                const fired = Array.isArray(run.fired_rules)
                  ? (run.fired_rules as any[]).filter((r) => r?.fired)
                  : [];
                return (
                  <li key={run.id} className="ml-4">
                    <div className="absolute -left-1.5 mt-2 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                    <div className="rounded-xl border border-border bg-gradient-card p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <DecisionBadge decision={run.decision} />
                          <ConfidenceBadge
                            value={Number(run.confidence ?? 0)}
                            band={run.confidence_band ?? undefined}
                          />
                          <Badge variant="outline" className="capitalize">
                            {run.mode}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-caption text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(run.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="grid gap-2 md:grid-cols-3 text-caption">
                        <div>
                          <span className="text-muted-foreground">Case</span>
                          <p className="font-mono text-foreground truncate">
                            {run.case_id.slice(0, 8)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Trace ID</span>
                          <p className="font-mono text-foreground truncate">
                            {trace?.traceId ?? '—'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Rules Fired</span>
                          <p className="text-foreground">
                            {fired.length}
                            {trace?.rulesEvaluated ? ` / ${trace.rulesEvaluated}` : ''}
                          </p>
                        </div>
                      </div>

                      {fired.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {fired.slice(0, 6).map((r: any, idx: number) => {
                            const id = r.ruleId ?? r.rule_id;
                            const v = r.ruleVersion ?? r.rule_version;
                            const name = ruleNameById[id] ?? r.ruleName ?? r.name ?? id;
                            return (
                              <Badge
                                key={`${id}-${idx}`}
                                variant="outline"
                                className="text-caption"
                              >
                                {name}
                                {v ? ` · v${v}` : ''}
                              </Badge>
                            );
                          })}
                          {fired.length > 6 && (
                            <Badge variant="secondary" className="text-caption">
                              +{fired.length - 6} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </InspectorPanel>
      </div>
    </AppLayout>
  );
}

function ConfidenceIcon({ className }: { className?: string }) {
  return <Activity className={className} />;
}
