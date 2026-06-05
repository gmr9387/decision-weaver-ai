import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  ShieldCheck,
  XCircle,
  Zap,
  History,
  Fingerprint,
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

function getRuleId(rule: any) {
  return rule?.ruleId ?? rule?.rule_id ?? null;
}

function getRuleName(rule: any) {
  return rule?.ruleName ?? rule?.rule_name ?? rule?.name ?? 'Unnamed rule';
}

function getRuleVersion(rule: any) {
  return rule?.ruleVersion ?? rule?.rule_version ?? null;
}

function getRuleSnapshotId(rule: any) {
  return rule?.ruleSnapshotId ?? rule?.rule_snapshot_id ?? null;
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

  const versionedRules = rules.filter((rule) => Boolean(getRuleVersion(rule)));
  const snapshotRules = rules.filter((rule) => Boolean(getRuleSnapshotId(rule)));

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
                  Replay how Weaver evaluated rules, detected gaps, recorded rule versions, and arrived at the final decision.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="default">{firedRules.length} fired</Badge>
                <Badge variant="secondary">{blockedRules.length} blocked</Badge>
                <Badge variant="confidence">{versionedRules.length} versioned</Badge>
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
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Version Coverage</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {versionedRules.length}
                  <span className="text-sm text-muted-foreground"> / {rules.length}</span>
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Snapshots</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {snapshotRules.length}
                  <span className="text-sm text-muted-foreground"> linked</span>
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 mt-3">
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
                const ruleId = getRuleId(rule);
                const ruleName = getRuleName(rule);
                const ruleVersion = getRuleVersion(rule);
                const ruleSnapshotId = getRuleSnapshotId(rule);

                return (
                  <div
                    key={ruleId || `${ruleName}-${idx}`}
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
                            <Badge variant="outline" className="text-caption capitalize">
                              {rule.type ?? 'rule'}
                            </Badge>
                            <Badge variant="secondary" className="text-caption">
                              P{rule.priority}
                            </Badge>
                            {ruleVersion ? (
                              <Badge variant="confidence" className="text-caption gap-1">
                                <History className="h-3 w-3" />
                                v{ruleVersion}
                              </Badge>
                            ) : (
                              <Badge variant="warning" className="text-caption">
                                Unversioned
                              </Badge>
                            )}
                            <span className="text-body-sm font-semibold text-foreground">
                              {ruleName}
                            </span>
                          </div>

                          <div className="mb-2 flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                            {ruleId && (
                              <span className="font-mono">
                                rule:{String(ruleId).slice(0, 8)}
                              </span>
                            )}

                            {ruleSnapshotId ? (
                              <span className="inline-flex items-center gap-1 font-mono">
                                <Fingerprint className="h-3 w-3" />
                                snapshot:{String(ruleSnapshotId).slice(0, 8)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-warning" />
                                no snapshot linked
                              </span>
                            )}
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