import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Plus,
  GitCompare,
  History,
  ShieldCheck,
} from 'lucide-react';
import type { ReplayDiff } from '@/lib/replay';

interface Props {
  diff: ReplayDiff;
  ruleNameById?: Record<string, string>;
}

export function ReplayDiffCard({ diff, ruleNameById = {} }: Props) {
  const noChange =
    !diff.decisionChanged &&
    diff.confidenceDelta === 0 &&
    diff.addedRuleIds.length === 0 &&
    diff.removedRuleIds.length === 0 &&
    diff.versionShifts.length === 0 &&
    diff.addedMissingFacts.length === 0 &&
    diff.removedMissingFacts.length === 0;

  const deltaClass =
    diff.confidenceDelta > 0
      ? 'text-success'
      : diff.confidenceDelta < 0
        ? 'text-destructive'
        : 'text-foreground';

  const totalRuleChanges = diff.addedRuleIds.length + diff.removedRuleIds.length;
  const totalMissingFactChanges =
    diff.addedMissingFacts.length + diff.removedMissingFacts.length;

  return (
    <div className="rounded-xl border border-border bg-gradient-card p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Current-Rule Replay Comparison</h3>
          </div>

          <p className="mt-1 text-caption text-muted-foreground">
            This compares the original persisted run against a replay using the stored input snapshot and the current active rule set.
          </p>
        </div>

        {noChange ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            No Drift
          </Badge>
        ) : (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Drift Detected
          </Badge>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <p className="text-caption uppercase tracking-wide text-muted-foreground">Decision Drift</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {diff.decisionChanged ? 'Changed' : 'Stable'}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <p className="text-caption uppercase tracking-wide text-muted-foreground">Confidence Delta</p>
          <p className={`mt-2 text-xl font-semibold font-mono ${deltaClass}`}>
            {diff.confidenceDelta >= 0 ? '+' : ''}
            {diff.confidenceDelta.toFixed(1)}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <p className="text-caption uppercase tracking-wide text-muted-foreground">Rule Changes</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {totalRuleChanges}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <p className="text-caption uppercase tracking-wide text-muted-foreground">Missing Fact Changes</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {totalMissingFactChanges}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <p className="text-caption uppercase tracking-wide text-muted-foreground">Decision</p>
          <div className="mt-2 flex items-center gap-2 text-body-md">
            <Badge variant="outline" className="capitalize">
              {diff.originalDecision.replace('_', ' ')}
            </Badge>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge
              variant={diff.decisionChanged ? 'warning' : 'success'}
              className="capitalize"
            >
              {diff.replayedDecision.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <p className="text-caption uppercase tracking-wide text-muted-foreground">Confidence</p>
          <div className="mt-2 flex items-center gap-3 font-mono text-body-md">
            <span className="text-foreground">{diff.originalConfidence.toFixed(1)}%</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-foreground">{diff.replayedConfidence.toFixed(1)}%</span>
            <span className={deltaClass}>
              ({diff.confidenceDelta >= 0 ? '+' : ''}
              {diff.confidenceDelta.toFixed(1)})
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="text-body-sm font-semibold text-foreground">
              Replay Interpretation
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
              A stable replay means the current rule set produces the same operational outcome from the original facts.
              A drifted replay means rules, versions, or fact requirements changed enough to alter the result.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <RuleDeltaBlock
          title="Added Fired Rules"
          ids={diff.addedRuleIds}
          ruleNameById={ruleNameById}
          tone="positive"
        />
        <RuleDeltaBlock
          title="Removed Fired Rules"
          ids={diff.removedRuleIds}
          ruleNameById={ruleNameById}
          tone="negative"
        />
      </div>

      {diff.versionShifts.length > 0 && (
        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-3.5 w-3.5 text-primary" />
            <p className="text-caption uppercase tracking-wide text-muted-foreground">
              Rule Version Shifts
            </p>
          </div>
          <ul className="space-y-2">
            {diff.versionShifts.map((s) => (
              <li
                key={s.ruleId}
                className="flex items-center justify-between gap-3 text-body-sm"
              >
                <span className="text-foreground truncate">{s.ruleName}</span>
                <span className="font-mono text-caption text-muted-foreground">
                  v{s.originalVersion ?? '?'} → v{s.replayedVersion ?? '?'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <MissingFactsBlock
          title="Newly Missing Facts"
          facts={diff.addedMissingFacts}
          tone="negative"
        />
        <MissingFactsBlock
          title="Resolved Missing Facts"
          facts={diff.removedMissingFacts}
          tone="positive"
        />
      </div>
    </div>
  );
}

function RuleDeltaBlock({
  title,
  ids,
  ruleNameById,
  tone,
}: {
  title: string;
  ids: string[];
  ruleNameById: Record<string, string>;
  tone: 'positive' | 'negative';
}) {
  const Icon = tone === 'positive' ? Plus : Minus;
  const accent = tone === 'positive' ? 'text-success' : 'text-destructive';

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-3.5 w-3.5 ${accent}`} />
        <p className="text-caption uppercase tracking-wide text-muted-foreground">{title}</p>
      </div>
      {ids.length === 0 ? (
        <p className="text-caption text-muted-foreground">None</p>
      ) : (
        <ul className="space-y-1">
          {ids.map((id) => (
            <li key={id} className="text-body-sm text-foreground truncate">
              {ruleNameById[id] ?? id}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MissingFactsBlock({
  title,
  facts,
  tone,
}: {
  title: string;
  facts: string[];
  tone: 'positive' | 'negative';
}) {
  const accent = tone === 'positive' ? 'text-success' : 'text-destructive';

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4">
      <p className={`text-caption uppercase tracking-wide ${accent}`}>{title}</p>
      {facts.length === 0 ? (
        <p className="mt-2 text-caption text-muted-foreground">None</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {facts.map((f) => (
            <Badge key={f} variant="outline" className="font-mono text-caption">
              {f}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}