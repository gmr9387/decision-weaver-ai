import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useRules } from '@/hooks/use-data';
import {
  InspectorPanel,
  DecisionBadge,
  ConfidenceBadge,
  StatCard,
} from '@/components/design-system';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Clock,
  GitCommit,
  History,
  Layers,
  Loader2,
  AlertTriangle,
  GitBranch,
  FileSearch,
} from 'lucide-react';

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
  contradictions: string[] | null;
  trace_id?: string | null;
};

function arr(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

export default function Operations() {
  const { data: rules = [] } = useRules();

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['operations-runs'],
    queryFn: async (): Promise<RunRow[]> => {
      const { data, error } = await supabase
        .from('inference_runs')
        .select(
          'id, case_id, decision, confidence, confidence_band, mode, created_at, fired_rules, decision_trace, missing_facts, contradictions, trace_id',
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw new Error(error.message);

      return (data ?? []) as unknown as RunRow[];
    },
    staleTime: 30000,
  });

  const ruleNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const rule of rules) map[rule.id] = rule.name;
    return map;
  }, [rules]);

  const stats = useMemo(() => {
    if (runs.length === 0) {
      return {
        total: 0,
        avgConf: 0,
        divergent: 0,
        missingFacts: 0,
        contradictions: 0,
        modes: {} as Record<string, number>,
      };
    }

    const modes: Record<string, number> = {};
    let confSum = 0;
    let divergent = 0;
    let missingFacts = 0;
    let contradictions = 0;

    const prevByCase = new Map<string, RunRow>();
    const sorted = [...runs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    for (const run of sorted) {
      const prev = prevByCase.get(run.case_id);
      if (prev && prev.decision !== run.decision) divergent++;
      prevByCase.set(run.case_id, run);
    }

    for (const run of runs) {
      modes[run.mode] = (modes[run.mode] ?? 0) + 1;
      confSum += Number(run.confidence ?? 0);
      missingFacts += arr(run.missing_facts).length;
      contradictions += arr(run.contradictions).length;
    }

    return {
      total: runs.length,
      avgConf: Math.round((confSum / runs.length) * 10) / 10,
      divergent,
      missingFacts,
      contradictions,
      modes,
    };
  }, [runs]);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-6xl">
        <header>
          <h1 className="text-display-sm text-foreground">Decision Operations</h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Audit timeline of persisted inference runs — decisions, confidence, rule versions,
            trace IDs, missing facts, and contradiction pressure.
          </p>
        </header>

        <div className="grid gap-3 md:grid-cols-5">
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
            icon={FileSearch}
            label="Missing Facts"
            value={stats.missingFacts}
            color="bg-warning/10 text-warning"
          />

          <StatCard
            icon={AlertTriangle}
            label="Contradictions"
            value={stats.contradictions}
            color="bg-destructive/10 text-destructive"
          />
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="text-body-md font-semibold text-foreground">Mode Mix</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.modes).length > 0 ? (
              Object.entries(stats.modes).map(([mode, count]) => (
                <Badge key={mode} variant="secondary" className="capitalize">
                  {mode}: {count}
                </Badge>
              ))
            ) : (
              <p className="text-body-sm text-muted-foreground">No runs yet.</p>
            )}
          </div>
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
                const fired = arr(run.fired_rules).filter((rule) => rule?.fired);
                const missingFacts = arr(run.missing_facts);
                const contradictions = arr(run.contradictions);
                const traceId = trace?.traceId ?? run.trace_id ?? '—';

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

                          {missingFacts.length > 0 && (
                            <Badge variant="warning">
                              {missingFacts.length} missing
                            </Badge>
                          )}

                          {contradictions.length > 0 && (
                            <Badge variant="destructive">
                              {contradictions.length} contradiction
                              {contradictions.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-caption text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(run.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="grid gap-2 md:grid-cols-4 text-caption">
                        <div>
                          <span className="text-muted-foreground">Case</span>
                          <p className="font-mono text-foreground truncate">
                            {run.case_id.slice(0, 8)}
                          </p>
                        </div>

                        <div>
                          <span className="text-muted-foreground">Trace ID</span>
                          <p className="font-mono text-foreground truncate">
                            {traceId}
                          </p>
                        </div>

                        <div>
                          <span className="text-muted-foreground">Rules Fired</span>
                          <p className="text-foreground">
                            {fired.length}
                            {trace?.rulesEvaluated ? ` / ${trace.rulesEvaluated}` : ''}
                          </p>
                        </div>

                        <div>
                          <span className="text-muted-foreground">Run ID</span>
                          <p className="font-mono text-foreground truncate">
                            {run.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>

                      {fired.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-caption text-muted-foreground">
                            <GitBranch className="h-3 w-3" />
                            Fired Rule Versions
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {fired.slice(0, 6).map((rule: any, idx: number) => {
                              const id = rule.ruleId ?? rule.rule_id;
                              const version = rule.ruleVersion ?? rule.rule_version;
                              const name = ruleNameById[id] ?? rule.ruleName ?? rule.name ?? id;

                              return (
                                <Badge
                                  key={`${id}-${idx}`}
                                  variant="outline"
                                  className="text-caption"
                                >
                                  {name}
                                  {version ? ` · v${version}` : ''}
                                </Badge>
                              );
                            })}

                            {fired.length > 6 && (
                              <Badge variant="secondary" className="text-caption">
                                +{fired.length - 6} more
                              </Badge>
                            )}
                          </div>
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