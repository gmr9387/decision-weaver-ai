import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import {
  Brain,
  ShieldCheck,
  AlertTriangle,
  FileSearch,
  CheckCircle2,
  Scale,
  Database,
  Sparkles,
  History,
  Fingerprint,
  GitBranch,
} from 'lucide-react';
import type { InferenceResult } from '@/lib/types';

interface InferenceTabProps {
  ir: InferenceResult | undefined;
}

function arr(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
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

export function InferenceTab({ ir }: InferenceTabProps) {
  if (!ir) {
    return (
      <TabsContent value="inference">
        <p className="text-body-sm text-muted-foreground p-6">
          No inference results available.
        </p>
      </TabsContent>
    );
  }

  const trace: any =
    (ir as any).decisionTrace ||
    (ir as any).decision_trace ||
    null;

  const confidenceBreakdown: any =
    (ir as any).confidenceBreakdown ||
    (ir as any).confidence_breakdown ||
    {};

  const allRules = arr(
    (ir as any).firedRules ||
    (ir as any).fired_rules
  );

  const firedRules = allRules.filter((r: any) => r.fired);
  const versionedRules = allRules.filter((r: any) => Boolean(getRuleVersion(r)));
  const snapshotRules = allRules.filter((r: any) => Boolean(getRuleSnapshotId(r)));

  const positiveDrivers = firedRules
    .filter((r: any) => Number(r.confidenceImpact ?? 0) > 0)
    .sort(
      (a: any, b: any) =>
        Number(b.confidenceImpact ?? 0) -
        Number(a.confidenceImpact ?? 0),
    )
    .slice(0, 5);

  const negativeDrivers = firedRules
    .filter((r: any) => Number(r.confidenceImpact ?? 0) < 0)
    .sort(
      (a: any, b: any) =>
        Number(a.confidenceImpact ?? 0) -
        Number(b.confidenceImpact ?? 0),
    )
    .slice(0, 5);

  const missingFacts = arr(
    (ir as any).missingFacts ||
    (ir as any).missing_facts
  );

  const contradictions = arr(ir.contradictions);

  const candidateDecisions = arr(
    (ir as any).candidateDecisions ||
    (ir as any).candidate_decisions
  );

  return (
    <TabsContent value="inference" className="space-y-5">
      <div className="rounded-xl border border-border bg-gradient-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="text-body-md font-semibold text-foreground">
            Decision Intelligence Report
          </h3>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <div>
            <p className="text-caption text-muted-foreground">Decision</p>
            <Badge variant="default" className="mt-1 capitalize">
              {String(ir.decision).replace('_', ' ')}
            </Badge>
          </div>

          <div>
            <p className="text-caption text-muted-foreground">Confidence</p>
            <p className="font-mono text-lg text-foreground">
              {ir.confidence.toFixed(1)}%
            </p>
          </div>

          <div>
            <p className="text-caption text-muted-foreground">Band</p>
            <p className="capitalize text-foreground">
              {String(ir.confidenceBand).replace('_', ' ')}
            </p>
          </div>

          <div>
            <p className="text-caption text-muted-foreground">Severity</p>
            <p className="capitalize text-foreground">
              {ir.severity}
            </p>
          </div>

          <div>
            <p className="text-caption text-muted-foreground">Rules Fired</p>
            <p className="text-foreground">
              {firedRules.length}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch className="h-4 w-4 text-primary" />
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Rules Evaluated</p>
            </div>
            <p className="text-xl font-semibold text-foreground">{allRules.length}</p>
          </div>

          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-1">
              <History className="h-4 w-4 text-primary" />
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Version Coverage</p>
            </div>
            <p className="text-xl font-semibold text-foreground">
              {versionedRules.length}
              <span className="text-sm text-muted-foreground"> / {allRules.length}</span>
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Fingerprint className="h-4 w-4 text-primary" />
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Snapshot Coverage</p>
            </div>
            <p className="text-xl font-semibold text-foreground">
              {snapshotRules.length}
              <span className="text-sm text-muted-foreground"> / {allRules.length}</span>
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-body-sm text-muted-foreground leading-relaxed">
            {ir.explanation}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <h3 className="font-semibold text-foreground">
              Positive Drivers
            </h3>
          </div>

          <div className="space-y-2">
            {positiveDrivers.length > 0 ? (
              positiveDrivers.map((rule: any) => (
                <div
                  key={rule.ruleId || rule.rule_id || rule.name}
                  className="rounded-lg bg-surface-2 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-body-sm text-foreground">
                      {getRuleName(rule)}
                    </span>
                    <span className="font-mono text-success">
                      +{rule.confidenceImpact}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {getRuleVersion(rule) ? (
                      <Badge variant="confidence" className="text-caption">
                        v{getRuleVersion(rule)}
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-caption">
                        Unversioned
                      </Badge>
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
              <p className="text-caption text-muted-foreground">
                No positive drivers detected.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="font-semibold text-foreground">
              Negative Drivers
            </h3>
          </div>

          <div className="space-y-2">
            {negativeDrivers.length > 0 ? (
              negativeDrivers.map((rule: any) => (
                <div
                  key={rule.ruleId || rule.rule_id || rule.name}
                  className="rounded-lg bg-surface-2 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-body-sm text-foreground">
                      {getRuleName(rule)}
                    </span>
                    <span className="font-mono text-destructive">
                      {rule.confidenceImpact}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {getRuleVersion(rule) ? (
                      <Badge variant="confidence" className="text-caption">
                        v{getRuleVersion(rule)}
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-caption">
                        Unversioned
                      </Badge>
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
              <p className="text-caption text-muted-foreground">
                No negative drivers detected.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileSearch className="h-4 w-4 text-warning" />
            <h3 className="font-semibold text-foreground">
              Missing Information
            </h3>
          </div>

          {missingFacts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {missingFacts.map((fact: string) => (
                <Badge key={fact} variant="secondary">
                  {fact}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-caption text-success">
              No missing facts detected.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="h-4 w-4 text-warning" />
            <h3 className="font-semibold text-foreground">
              Contradictions
            </h3>
          </div>

          {contradictions.length > 0 ? (
            <div className="space-y-2">
              {contradictions.map((c: string, idx: number) => (
                <div
                  key={idx}
                  className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-caption"
                >
                  {c}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-caption text-success">
              No conflicting rule outcomes detected.
            </p>
          )}
        </div>
      </div>

      {candidateDecisions.length > 0 && (
        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <h3 className="font-semibold text-foreground mb-4">
            Candidate Decisions
          </h3>

          <div className="space-y-3">
            {candidateDecisions.map((cd: any, idx: number) => (
              <div key={idx}>
                <div className="flex justify-between text-caption mb-1">
                  <span className="capitalize">
                    {String(cd.decision).replace('_', ' ')}
                  </span>
                  <span>{cd.score}%</span>
                </div>

                <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${cd.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-gradient-card p-5">
        <h3 className="font-semibold text-foreground mb-4">
          Confidence Breakdown
        </h3>

        <div className="grid gap-2 lg:grid-cols-2">
          {Object.entries(confidenceBreakdown).length > 0 ? (
            Object.entries(confidenceBreakdown).map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between rounded-lg bg-surface-2 p-3"
              >
                <span className="text-caption text-muted-foreground">
                  {k.replace(/([A-Z])/g, ' $1')}
                </span>

                <span className="font-mono text-foreground">
                  {typeof v === 'number'
                    ? v.toFixed(1)
                    : String(v)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-caption text-muted-foreground">
              No confidence breakdown available.
            </p>
          )}
        </div>
      </div>

      {(ir as any).aiAssessment && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">
              AI Advisory (Non-Deterministic)
            </h3>
          </div>

          <p className="text-body-sm text-muted-foreground">
            {(ir as any).aiAssessment}
          </p>

          {(ir as any).aiSuggestedDecision && (
            <div className="mt-3">
              <Badge variant="outline">
                Suggested: {(ir as any).aiSuggestedDecision}
              </Badge>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-gradient-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">
            Trace Metadata
          </h3>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <span className="text-caption text-muted-foreground">Trace ID</span>
            <p className="font-mono text-body-sm">
              {trace?.traceId || 'legacy-trace'}
            </p>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">Mode</span>
            <p className="capitalize">{ir.mode}</p>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">Rules Evaluated</span>
            <p>{trace?.rulesEvaluated || allRules.length || 'N/A'}</p>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">Rules Fired</span>
            <p>{trace?.rulesFired || firedRules.length}</p>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">Versioned Rules</span>
            <p>{versionedRules.length} / {allRules.length}</p>
          </div>

          <div>
            <span className="text-caption text-muted-foreground">Snapshot Links</span>
            <p>{snapshotRules.length} / {allRules.length}</p>
          </div>
        </div>

        {snapshotRules.length < allRules.length && allRules.length > 0 && (
          <div className="mt-4 rounded-lg border border-warning/20 bg-warning/10 p-3">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-caption font-semibold">
                Partial replay metadata
              </span>
            </div>
            <p className="mt-1 text-caption text-muted-foreground">
              Some rules in this inference do not have snapshot IDs attached. Older runs may be partially replayable only.
            </p>
          </div>
        )}
      </div>
    </TabsContent>
  );
}