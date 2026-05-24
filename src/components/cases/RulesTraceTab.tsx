import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  ShieldCheck,
  XCircle,
  Zap,
} from 'lucide-react';
import type { InferenceResult } from '@/lib/types';

interface RulesTraceTabProps {
  ir: InferenceResult | undefined;
}

function arr(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function getTrace(ir: any) {
  return ir?.decisionTrace ?? ir?.decision_trace ?? null;
}

function getRules(ir: any) {
  return arr(ir?.firedRules ?? ir?.fired_rules);
}

function formatOutput(output: unknown) {
  if (!output) return 'No output';
  if (typeof output === 'string') return output;
  try {
    return JSON.stringify(output);
  } catch {
    return String(output);
  }
}

export function RulesTraceTab({ ir }: RulesTraceTabProps) {
  const trace = getTrace(ir);
  const rules = getRules(ir);
  const firedRules = rules.filter((rule) => rule.fired);
  const blockedRules = rules.filter((rule) => !rule.fired);
  const positiveImpact = firedRules
    .filter((rule) => Number(rule.confidenceImpact ?? 0) > 0)
    .reduce((sum, rule) => sum + Number(rule.confidenceImpact ?? 0), 0);
  const negativeImpact = firedRules
    .filter((rule) => Number(rule.confidenceImpact ?? 0) < 0)
    .reduce((sum, rule) => sum + Number(rule.confidenceImpact ?? 0), 0);

  return (
    <TabsContent value="rules" className="space-y-5">
      {!ir ? (
        <p className="text-body-sm text-muted-foreground p-6">No rules trace available.</p>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-gradient-card p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <GitBranch className="h-4 w-4 text-primary" />
                  <h3 className="text-body-md font-semibold text-foreground">Decision Replay</h3>
                </div>
                <p className="text-body-sm text-muted-foreground">
                  Replay how Weaver evaluated rules, detected gaps, and arrived at the final decision.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="default">{firedRules.length} fired</Badge>
                <Badge variant="secondary">{blockedRules.length} blocked</Badge>
                <Badge variant="outline" className="font-mono">
                  Trace: {trace?.traceId ? String(trace.traceId).slice(0, 8) : 'session'}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4 mt-5">
              <div className="rounded-lg border border-border bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Rules Evaluated</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{rules.length}</p>
              </div>

              <div className="rounded-lg border border-border bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Rules Fired</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{firedRules.length}</p>
              </div>

              <div className="rounded-lg border border-border bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Positive Impact</p>
                <p className="mt-1 text-2xl font-semibold text-success">+{positiveImpact}</p>
              </div>

              <div className="rounded-lg border border-border bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Negative Impact</p>
                <p className="mt-1 text-2xl font-semibold text-destructive">{negativeImpact}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="text-body-md font-semibold text-foreground">Evaluation Timeline</h3>
            </div>

            <div className="space-y-3">
              {rules.map((rule, idx) => {
                const impact = Number(rule.confidenceImpact ?? 0);
                const conditionsMet = arr(rule.conditionsMet);
                const conditionsUnmet = arr(rule.conditionsUnmet);

                return (
                  <div
                    key={rule.ruleId || idx}
                    className={`relative rounded-xl border p-4 ${
                      rule.fired ? 'border-primary/30 bg-primary/5' : 'border-border bg-surface-2'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 rounded-lg border p-2 ${
                            rule.fired
                              ? 'border-primary/30 bg-primary/10 text-primary'
                              : 'border-border bg-background text-muted-foreground'
                          }`}
                        >
                          {rule.fired ? <Zap className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant={rule.fired ? 'default' : 'secondary'}>
                              {rule.fired ? 'Fired' : 'Not Fired'}
                            </Badge>
                            <Badge variant="outline" className="text-caption capitalize">{rule.type}</Badge>
                            <Badge variant="secondary" className="text-caption">P{rule.priority}</Badge>
                            <span className="text-body-sm font-semibold text-foreground">{rule.name}</span>
                          </div>

                          {rule.explanation ? (
                            <p className="text-body-sm text-muted-foreground">{rule.explanation}</p>
                          ) : (
                            <p className="text-body-sm text-muted-foreground italic">
                              No explanation produced for this rule.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Impact</p>
                        <p className={`font-mono text-sm ${impact >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {impact >= 0 ? '+' : ''}
                          {impact}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-3 mt-4 text-caption">
                      <div className="rounded-lg border border-border bg-background/40 p-3">
                        <div className="flex items-center gap-1.5 mb-2 text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="font-semibold">Conditions Met</span>
                        </div>
                        {conditionsMet.length > 0 ? (
                          <div className="space-y-1">
                            {conditionsMet.map((condition: string, i: number) => (
                              <p key={i} className="font-mono text-muted-foreground">{condition}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground italic">None</p>
                        )}
                      </div>

                      <div className="rounded-lg border border-border bg-background/40 p-3">
                        <div className="flex items-center gap-1.5 mb-2 text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span className="font-semibold">Unmet / Missing</span>
                        </div>
                        {conditionsUnmet.length > 0 ? (
                          <div className="space-y-1">
                            {conditionsUnmet.map((condition: string, i: number) => (
                              <p key={i} className="font-mono text-muted-foreground">{condition}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground italic">None</p>
                        )}
                      </div>

                      <div className="rounded-lg border border-border bg-background/40 p-3">
                        <p className="mb-2 font-semibold text-muted-foreground">Rule Output</p>
                        <p className="font-mono text-muted-foreground break-all">{formatOutput(rule.output)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </TabsContent>
  );
}