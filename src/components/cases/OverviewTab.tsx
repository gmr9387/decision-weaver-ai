import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import {
  Shield,
  Zap,
  Play,
  Loader2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Database,
  GitBranch,
  FileSearch,
  History,
  Fingerprint,
} from 'lucide-react';
import type { Case, InferenceResult } from '@/lib/types';
import { ConfidenceBreakdownViz } from './ConfidenceBreakdownViz';
import { decisionIcons, decisionColors } from './constants';

interface OverviewTabProps {
  caseData: Case;
  ir: InferenceResult | undefined;
  onRunInference: () => void;
  isRunning: boolean;
  canRun: boolean;
}

function arr(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function getTrace(ir: any) {
  return ir?.decisionTrace ?? ir?.decision_trace ?? null;
}

function getAllRules(ir: any) {
  return arr(ir?.firedRules ?? ir?.fired_rules);
}

function getFiredRules(ir: any) {
  return getAllRules(ir).filter((r) => r?.fired);
}

function getMissingFacts(ir: any) {
  return arr(ir?.missingFacts ?? ir?.missing_facts);
}

function getContradictions(ir: any) {
  return arr(ir?.contradictions);
}

function getCandidateDecisions(ir: any) {
  return arr(ir?.candidateDecisions ?? ir?.candidate_decisions);
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

export function OverviewTab({ caseData, ir, onRunInference, isRunning, canRun }: OverviewTabProps) {
  const DecIcon = ir ? (decisionIcons[ir.decision] || FileText) : FileText;

  const trace = getTrace(ir);
  const allRules = getAllRules(ir);
  const firedRules = getFiredRules(ir);
  const missingFacts = getMissingFacts(ir);
  const contradictions = getContradictions(ir);
  const candidateDecisions = getCandidateDecisions(ir);

  const versionedRules = allRules.filter((rule) => Boolean(getRuleVersion(rule)));
  const snapshotRules = allRules.filter((rule) => Boolean(getRuleSnapshotId(rule)));

  const positiveDrivers = firedRules
    .filter((r) => Number(r.confidenceImpact ?? 0) > 0)
    .sort((a, b) => Number(b.confidenceImpact ?? 0) - Number(a.confidenceImpact ?? 0))
    .slice(0, 3);

  const negativeDrivers = firedRules
    .filter((r) => Number(r.confidenceImpact ?? 0) < 0)
    .sort((a, b) => Number(a.confidenceImpact ?? 0) - Number(b.confidenceImpact ?? 0))
    .slice(0, 3);

  return (
    <TabsContent value="overview" className="space-y-5">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-gradient-card p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-body-md font-semibold text-foreground flex items-center gap-2">
                <DecIcon className="w-4 h-4 text-primary" /> Decision Command Summary
              </h3>
              <p className="text-caption text-muted-foreground mt-1">
                Executive view of this case’s decision, evidence gaps, rule activity, trace status, and replay metadata.
              </p>
            </div>

            {ir && (
              <div className="flex gap-2 flex-wrap">
                <Badge variant={decisionColors[ir.decision] as any} className="capitalize">
                  {ir.decision.replace('_', ' ')}
                </Badge>
                <Badge variant="confidence" className="font-mono">
                  {ir.confidence.toFixed(1)}%
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {ir.confidenceBand.replace('_', ' ')}
                </Badge>
              </div>
            )}
          </div>

          {ir ? (
            <>
              <p className="text-body-sm text-muted-foreground leading-relaxed">{ir.explanation}</p>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Rules Fired</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{firedRules.length}</p>
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Missing Facts</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{missingFacts.length}</p>
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Contradictions</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{contradictions.length}</p>
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Trace</p>
                  <p className="mt-1 truncate font-mono text-xs text-foreground">
                    {trace?.traceId ?? 'legacy'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Rules Evaluated</p>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {trace?.rulesEvaluated ?? allRules.length}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Version Coverage</p>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {versionedRules.length}
                    <span className="text-sm text-muted-foreground"> / {allRules.length}</span>
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-primary" />
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Snapshot Coverage</p>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {snapshotRules.length}
                    <span className="text-sm text-muted-foreground"> / {allRules.length}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">Mode: {ir.mode}</Badge>
                <Badge variant="secondary">{firedRules.length} rules fired</Badge>
                {missingFacts.length > 0 && <Badge variant="warning">{missingFacts.length} missing facts</Badge>}
                {contradictions.length > 0 && <Badge variant="critical">{contradictions.length} contradictions</Badge>}
                {(ir as any).deterministicDecisionPreserved && (
                  <Badge variant="outline">Deterministic preserved</Badge>
                )}
                {snapshotRules.length < allRules.length && allRules.length > 0 && (
                  <Badge variant="warning">Partial replay metadata</Badge>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-body-sm text-muted-foreground">
                Inference has not been run for this case yet.
              </p>

              <Button
                variant="hero"
                size="sm"
                className="gap-1.5"
                onClick={onRunInference}
                disabled={isRunning || !canRun}
              >
                {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Run Inference Now
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-6">
          <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Confidence
          </h3>
          {ir ? (
            <ConfidenceBreakdownViz breakdown={ir.confidenceBreakdown} />
          ) : (
            <p className="text-body-sm text-muted-foreground">—</p>
          )}
        </div>
      </div>

      {ir && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" /> Positive Decision Drivers
            </h3>
            <div className="space-y-3">
              {positiveDrivers.length > 0 ? (
                positiveDrivers.map((rule) => (
                  <div key={rule.ruleId || rule.name} className="rounded-lg bg-surface-2 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm text-foreground">{getRuleName(rule)}</span>
                      <span className="font-mono text-success">+{rule.confidenceImpact}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {getRuleVersion(rule) ? (
                        <Badge variant="confidence" className="text-caption">v{getRuleVersion(rule)}</Badge>
                      ) : (
                        <Badge variant="warning" className="text-caption">Unversioned</Badge>
                      )}
                      {getRuleSnapshotId(rule) && (
                        <Badge variant="outline" className="font-mono text-caption">
                          snapshot:{String(getRuleSnapshotId(rule)).slice(0, 8)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-body-sm text-muted-foreground">No positive drivers recorded.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> Risk / Confidence Drag
            </h3>
            <div className="space-y-3">
              {negativeDrivers.length > 0 ? (
                negativeDrivers.map((rule) => (
                  <div key={rule.ruleId || rule.name} className="rounded-lg bg-surface-2 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm text-foreground">{getRuleName(rule)}</span>
                      <span className="font-mono text-destructive">{rule.confidenceImpact}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {getRuleVersion(rule) ? (
                        <Badge variant="confidence" className="text-caption">v{getRuleVersion(rule)}</Badge>
                      ) : (
                        <Badge variant="warning" className="text-caption">Unversioned</Badge>
                      )}
                      {getRuleSnapshotId(rule) && (
                        <Badge variant="outline" className="font-mono text-caption">
                          snapshot:{String(getRuleSnapshotId(rule)).slice(0, 8)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : missingFacts.length > 0 ? (
                missingFacts.slice(0, 4).map((fact) => (
                  <div key={fact} className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                    <span className="font-mono text-body-sm text-foreground">{fact}</span>
                    <Badge variant="warning">missing</Badge>
                  </div>
                ))
              ) : (
                <p className="text-body-sm text-muted-foreground">No major risk drag recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {ir && ir.recommendations?.length > 0 && (
        <div className="rounded-xl border border-border bg-gradient-card p-6">
          <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Recommended Actions
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {ir.recommendations.map((rec, i) => (
              <div key={i} className="p-4 rounded-lg bg-surface-2 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-body-sm font-medium text-foreground">{rec.title}</span>
                  <Badge
                    variant={rec.urgency === 'critical' ? 'critical' : rec.urgency === 'high' ? 'warning' : 'secondary'}
                    className="capitalize text-caption"
                  >
                    {rec.urgency}
                  </Badge>
                </div>
                <p className="text-caption text-muted-foreground mb-2">{rec.reason}</p>
                <div className="flex items-center justify-between text-caption text-muted-foreground">
                  <span>Owner: {rec.suggestedOwner}</span>
                  <span>Impact: {rec.expectedImpact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-gradient-card p-6">
          <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-primary" /> Case Details
          </h3>
          <dl className="space-y-3 text-body-sm">
            {[
              ['Case ID', caseData.caseNumber],
              ['Category', caseData.category],
              ['Source', caseData.source],
              ['Status', caseData.status],
              ['Owner', caseData.owner],
              ['Review State', caseData.reviewState],
              ['Amount', caseData.amount ? `$${caseData.amount.toLocaleString()}` : '—'],
              ['Created', new Date(caseData.createdAt).toLocaleString()],
              ['Updated', new Date(caseData.updatedAt).toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-foreground font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-6">
          <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" /> Candidate Decisions
          </h3>
          {ir && candidateDecisions.length > 0 ? (
            <div className="space-y-3">
              {candidateDecisions.map((cd, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={i === 0 ? (decisionColors[cd.decision] as any) : 'secondary'}
                        className="capitalize"
                      >
                        {cd.decision.replace('_', ' ')}
                      </Badge>
                      {i === 0 && <span className="text-caption text-primary">← selected</span>}
                    </div>
                    <span className="text-body-sm font-mono text-muted-foreground">
                      {Number(cd.score).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${cd.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-muted-foreground">—</p>
          )}
        </div>
      </div>

      {ir && (
        <div className="rounded-xl border border-border bg-gradient-card p-6">
          <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" /> Trace Summary
          </h3>

          <div className="grid gap-3 md:grid-cols-4 text-body-sm">
            <div>
              <p className="text-muted-foreground">Trace ID</p>
              <p className="font-mono text-foreground truncate">{trace?.traceId ?? 'legacy'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rules Evaluated</p>
              <p className="text-foreground">{trace?.rulesEvaluated ?? allRules.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Versioned Rules</p>
              <p className="text-foreground">{versionedRules.length} / {allRules.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Snapshot Links</p>
              <p className="text-foreground">{snapshotRules.length} / {allRules.length}</p>
            </div>
          </div>

          {snapshotRules.length < allRules.length && allRules.length > 0 && (
            <div className="mt-4 rounded-lg border border-warning/20 bg-warning/10 p-3">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-caption font-semibold">Partial replay metadata</span>
              </div>
              <p className="mt-1 text-caption text-muted-foreground">
                Some rules do not have snapshot IDs attached to this inference. Older runs may be partially replayable only.
              </p>
            </div>
          )}
        </div>
      )}
    </TabsContent>
  );
}