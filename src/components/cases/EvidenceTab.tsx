import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Shield,
  FileSearch,
  TrendingUp,
  GitBranch,
  Fingerprint,
  History,
} from 'lucide-react';
import type { InferenceResult } from '@/lib/types';

interface EvidenceTabProps {
  ir: InferenceResult | undefined;
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

function getRuleVersion(rule: any) {
  return rule?.ruleVersion ?? rule?.rule_version ?? null;
}

function getRuleSnapshotId(rule: any) {
  return rule?.ruleSnapshotId ?? rule?.rule_snapshot_id ?? null;
}

export function EvidenceTab({ ir }: EvidenceTabProps) {
  if (!ir) {
    return (
      <TabsContent value="evidence">
        <div className="rounded-xl border border-border bg-gradient-card p-6">
          <p className="text-body-sm text-muted-foreground">
            No evidence available.
          </p>
        </div>
      </TabsContent>
    );
  }

  const trace = getTrace(ir);
  const evidenceRefs = ir.evidenceRefs ?? [];
  const missingFacts = ir.missingFacts ?? [];
  const contradictions = ir.contradictions ?? [];

  const allRules = getAllRules(ir);
  const versionedRules = allRules.filter((rule) => Boolean(getRuleVersion(rule)));
  const snapshotRules = allRules.filter((rule) => Boolean(getRuleSnapshotId(rule)));

  const completeness =
    evidenceRefs.length + missingFacts.length > 0
      ? Math.round(
          (evidenceRefs.length /
            (evidenceRefs.length + missingFacts.length)) *
            100
        )
      : 100;

  const readiness =
    Math.max(
      0,
      Math.min(
        100,
        ir.confidence -
          missingFacts.length * 5 -
          contradictions.length * 5 -
          (snapshotRules.length < allRules.length && allRules.length > 0 ? 10 : 0)
      )
    );

  const replayReady =
    allRules.length > 0 &&
    versionedRules.length === allRules.length &&
    snapshotRules.length === allRules.length;

  return (
    <TabsContent value="evidence" className="space-y-4">
      <div className="grid md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-caption text-muted-foreground">
              Evidence Items
            </span>
          </div>

          <div className="text-2xl font-semibold text-foreground">
            {evidenceRefs.length}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-caption text-muted-foreground">
              Missing Facts
            </span>
          </div>

          <div className="text-2xl font-semibold text-foreground">
            {missingFacts.length}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-caption text-muted-foreground">
              Completeness
            </span>
          </div>

          <div className="text-2xl font-semibold text-success">
            {completeness}%
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-caption text-muted-foreground">
              Decision Readiness
            </span>
          </div>

          <div className="text-2xl font-semibold text-primary">
            {Math.round(readiness)}%
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="w-4 h-4 text-primary" />
            <span className="text-caption text-muted-foreground">
              Rules Evaluated
            </span>
          </div>

          <div className="text-2xl font-semibold text-foreground">
            {allRules.length}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <History className="w-4 h-4 text-primary" />
            <span className="text-caption text-muted-foreground">
              Versioned Rules
            </span>
          </div>

          <div className="text-2xl font-semibold text-foreground">
            {versionedRules.length}
            <span className="text-sm text-muted-foreground"> / {allRules.length}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Fingerprint className="w-4 h-4 text-primary" />
            <span className="text-caption text-muted-foreground">
              Snapshot Links
            </span>
          </div>

          <div className="text-2xl font-semibold text-foreground">
            {snapshotRules.length}
            <span className="text-sm text-muted-foreground"> / {allRules.length}</span>
          </div>
        </div>
      </div>

      <div
        className={`rounded-xl border p-5 ${
          replayReady
            ? 'border-success/20 bg-success/5'
            : 'border-warning/20 bg-warning/10'
        }`}
      >
        <div className="flex items-start gap-3">
          {replayReady ? (
            <CheckCircle2 className="mt-0.5 w-5 h-5 text-success" />
          ) : (
            <AlertTriangle className="mt-0.5 w-5 h-5 text-warning" />
          )}

          <div>
            <h3 className="text-body-md font-semibold text-foreground">
              {replayReady ? 'Replay Metadata Complete' : 'Partial Replay Metadata'}
            </h3>

            <p className="mt-1 text-body-sm text-muted-foreground">
              {replayReady
                ? 'This decision includes rule versions and snapshot references for every evaluated rule.'
                : 'Some evaluated rules are missing version or snapshot references. The decision can still be reviewed, but historical replay may be partial.'}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="font-mono">
                trace:{String(trace?.traceId ?? 'legacy').slice(0, 12)}
              </Badge>
              <Badge variant={replayReady ? 'secondary' : 'warning'}>
                {versionedRules.length}/{allRules.length} versioned
              </Badge>
              <Badge variant={replayReady ? 'secondary' : 'warning'}>
                {snapshotRules.length}/{allRules.length} snapshots
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-gradient-card p-6">
        <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-primary" />
          Evidence Package
        </h3>

        {evidenceRefs.length > 0 ? (
          <div className="space-y-2">
            {evidenceRefs.map((ref) => (
              <div
                key={ref}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-success" />

                  <span className="text-body-sm font-mono text-foreground">
                    {ref}
                  </span>
                </div>

                <Badge variant="secondary">
                  Referenced Evidence
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-muted-foreground">
            No evidence references were attached to this decision.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-gradient-card p-6">
        <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Missing Information
        </h3>

        {missingFacts.length > 0 ? (
          <div className="space-y-2">
            {missingFacts.map((fact) => (
              <div
                key={fact}
                className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20"
              >
                <span className="font-mono text-body-sm text-foreground">
                  {fact}
                </span>

                <Badge variant="warning">
                  Missing
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-body-sm">
              No missing evidence detected.
            </span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-gradient-card p-6">
        <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Evidence Impact
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-body-sm text-muted-foreground">
              Confidence Score
            </span>

            <span className="font-mono text-primary font-semibold">
              {ir.confidence.toFixed(1)}%
            </span>
          </div>

          <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{
                width: `${Math.min(100, ir.confidence)}%`,
              }}
            />
          </div>

          <p className="text-caption text-muted-foreground">
            Confidence is influenced by evidence completeness,
            corroborating signals, rule strength, contradictions,
            missing information, and replay metadata completeness.
          </p>
        </div>
      </div>
    </TabsContent>
  );
}