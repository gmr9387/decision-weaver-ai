import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Zap,
  GitCompare,
  Brain,
  FileSearch,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { InferenceResult } from '@/lib/types';

interface SimulationResultProps {
  simResult: InferenceResult;
  baseline?: InferenceResult;
}

function arr(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function getDecisionTrace(result: any) {
  return result?.decisionTrace ?? result?.decision_trace ?? null;
}

function getConfidenceBreakdown(result: any): Record<string, any> {
  return result?.confidenceBreakdown ?? result?.confidence_breakdown ?? {};
}

function getFiredRules(result: any) {
  return arr(result?.firedRules ?? result?.fired_rules).filter((r) => r?.fired);
}

function getAllRules(result: any) {
  return arr(result?.firedRules ?? result?.fired_rules);
}

function getMissingFacts(result: any) {
  return arr(result?.missingFacts ?? result?.missing_facts);
}

function getContradictions(result: any) {
  return arr(result?.contradictions);
}

function getCandidateDecisions(result: any) {
  return arr(result?.candidateDecisions ?? result?.candidate_decisions);
}

export function SimulationResult({ simResult, baseline }: SimulationResultProps) {
  const [showFiredRules, setShowFiredRules] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showTrace, setShowTrace] = useState(false);

  const sim: any = simResult;
  const base: any = baseline;

  const trace = getDecisionTrace(sim);
  const allRules = getAllRules(sim);
  const firedRules = getFiredRules(sim);
  const missingFacts = getMissingFacts(sim);
  const contradictions = getContradictions(sim);
  const candidateDecisions = getCandidateDecisions(sim);
  const confidenceBreakdown = getConfidenceBreakdown(sim);

  const decisionChanged = Boolean(base?.decision && base.decision !== sim.decision);
  const confidenceDelta =
    typeof base?.confidence === 'number'
      ? Number((sim.confidence - base.confidence).toFixed(1))
      : null;

  const positiveDrivers = firedRules
    .filter((r) => Number(r.confidenceImpact ?? 0) > 0)
    .sort((a, b) => Number(b.confidenceImpact ?? 0) - Number(a.confidenceImpact ?? 0))
    .slice(0, 4);

  const negativeDrivers = firedRules
    .filter((r) => Number(r.confidenceImpact ?? 0) < 0)
    .sort((a, b) => Number(a.confidenceImpact ?? 0) - Number(b.confidenceImpact ?? 0))
    .slice(0, 4);

  const stabilityScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        (decisionChanged ? 25 : 0) -
        Math.abs(confidenceDelta ?? 0) -
        contradictions.length * 12 -
        missingFacts.length * 5,
    ),
  );

  const stabilityBand =
    stabilityScore >= 80 ? 'High Stability' : stabilityScore >= 55 ? 'Medium Stability' : 'Low Stability';

  const executiveSummary =
    decisionChanged
      ? `Decision changed from ${base?.decision ?? 'unknown'} to ${sim.decision}. Confidence moved ${
          confidenceDelta !== null && confidenceDelta >= 0 ? '+' : ''
        }${confidenceDelta ?? 0}%. Review the fired rules, missing facts, and contradictions before using this scenario.`
      : `Decision remained ${sim.decision}. Confidence moved ${
          confidenceDelta !== null && confidenceDelta >= 0 ? '+' : ''
        }${confidenceDelta ?? 0}%. Scenario stability is ${stabilityBand.toLowerCase()}.`;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-foreground">Simulated Decision</h4>
            </div>
            <p className="text-caption text-muted-foreground">
              Non-persistent inference result generated from scenario facts.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default" className="capitalize">
              {String(simResult.decision).replace('_', ' ')}
            </Badge>
            <Badge variant="confidence" className="font-mono">
              {simResult.confidence.toFixed(1)}%
            </Badge>
            <Badge variant="outline" className="capitalize text-caption">
              {simResult.confidenceBand}
            </Badge>
          </div>
        </div>

        {baseline && (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Decision Drift</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={decisionChanged ? 'warning' : 'secondary'}>
                  {decisionChanged ? 'Changed' : 'Stable'}
                </Badge>
              </div>
              <p className="mt-2 text-caption text-muted-foreground">
                {base.decision} → {sim.decision}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Confidence Delta</p>
              <div className="mt-2 flex items-center gap-2">
                {confidenceDelta !== null && confidenceDelta >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                )}
                <span className="font-mono text-foreground">
                  {confidenceDelta !== null && confidenceDelta >= 0 ? '+' : ''}
                  {confidenceDelta ?? 0}%
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Stability</p>
              <div className="mt-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="font-mono text-foreground">{Math.round(stabilityScore)}%</span>
              </div>
              <p className="mt-2 text-caption text-muted-foreground">{stabilityBand}</p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface-2 p-4">
        <div className="flex items-center gap-2 mb-2">
          <GitCompare className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-foreground">Executive Summary</h4>
        </div>
        <p className="text-body-sm text-muted-foreground">{executiveSummary}</p>
        <p className="mt-3 text-body-sm text-muted-foreground">{simResult.explanation}</p>
      </div>

      {(positiveDrivers.length > 0 || negativeDrivers.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Positive Drivers
            </h4>
            <div className="space-y-2">
              {positiveDrivers.length > 0 ? (
                positiveDrivers.map((rule) => (
                  <div key={rule.ruleId || rule.name} className="flex items-center justify-between gap-3 text-caption">
                    <span className="text-foreground">{rule.name}</span>
                    <span className="font-mono text-success">+{rule.confidenceImpact}</span>
                  </div>
                ))
              ) : (
                <p className="text-caption text-muted-foreground">No positive drivers recorded.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Negative Drivers
            </h4>
            <div className="space-y-2">
              {negativeDrivers.length > 0 ? (
                negativeDrivers.map((rule) => (
                  <div key={rule.ruleId || rule.name} className="flex items-center justify-between gap-3 text-caption">
                    <span className="text-foreground">{rule.name}</span>
                    <span className="font-mono text-destructive">{rule.confidenceImpact}</span>
                  </div>
                ))
              ) : (
                <p className="text-caption text-muted-foreground">No negative drivers recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {contradictions.length > 0 && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-1">
          <span className="text-caption font-semibold text-destructive flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Contradictions
          </span>
          {contradictions.map((c, i) => (
            <p key={i} className="text-caption text-destructive/80">{c}</p>
          ))}
        </div>
      )}

      {missingFacts.length > 0 && (
        <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
          <span className="text-caption font-semibold text-warning">Missing Facts: </span>
          <span className="text-caption text-muted-foreground">{missingFacts.join(', ')}</span>
        </div>
      )}

      {candidateDecisions.length > 1 && (
        <div className="space-y-1">
          <span className="text-caption font-semibold text-muted-foreground">Candidate Decisions</span>
          <div className="flex gap-2 flex-wrap">
            {candidateDecisions.map((cd, i) => (
              <Badge key={i} variant="outline" className="capitalize text-caption">
                {String(cd.decision).replace('_', ' ')} ({cd.score}%)
              </Badge>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="flex items-center gap-1 text-caption font-medium text-primary hover:underline"
      >
        {showBreakdown ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
        Confidence Breakdown
      </button>

      {showBreakdown && Object.keys(confidenceBreakdown).length > 0 && (
        <div className="grid grid-cols-2 gap-2 text-caption">
          {Object.entries(confidenceBreakdown).map(([k, v]) => (
            <div key={k} className="flex justify-between p-2 rounded bg-surface-2">
              <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
              <span className="font-mono text-foreground">{typeof v === 'number' ? v.toFixed(1) : String(v)}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowFiredRules(!showFiredRules)}
        className="flex items-center gap-1 text-caption font-medium text-primary hover:underline"
      >
        {showFiredRules ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
        Rule Details ({allRules.length} evaluated)
      </button>

      {showFiredRules && (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {allRules.map((rule, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg text-caption ${
                rule.fired ? 'bg-primary/5 border border-primary/20' : 'bg-surface-2 border border-border'
              }`}
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {rule.fired ? (
                  <Zap className="w-3 h-3 text-primary" />
                ) : (
                  <span className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                )}
                <span className="font-medium text-foreground">{rule.name}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{rule.type}</Badge>
                <Badge variant="secondary" className="text-[10px]">P{rule.priority}</Badge>
                {rule.fired && (
                  <span className={`font-mono ${Number(rule.confidenceImpact) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {Number(rule.confidenceImpact) >= 0 ? '+' : ''}
                    {rule.confidenceImpact}
                  </span>
                )}
              </div>

              {rule.explanation && (
                <p className="text-muted-foreground ml-5 mb-1">{rule.explanation}</p>
              )}

              {arr(rule.conditionsMet).length > 0 && (
                <p className="text-success/80 ml-5">✓ {arr(rule.conditionsMet).join(', ')}</p>
              )}

              {arr(rule.conditionsUnmet).length > 0 && (
                <p className="text-destructive/70 ml-5">✗ {arr(rule.conditionsUnmet).join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowTrace(!showTrace)}
        className="flex items-center gap-1 text-caption font-medium text-primary hover:underline"
      >
        {showTrace ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
        Decision Trace
      </button>

      {showTrace && (
        <div className="rounded-lg border border-border bg-surface-2 p-3 text-caption space-y-2">
          <div className="flex items-center gap-2">
            <FileSearch className="w-3 h-3 text-primary" />
            <span className="text-muted-foreground">Trace ID:</span>
            <span className="font-mono text-foreground">{trace?.traceId ?? sim?.trace_id ?? 'simulation-only'}</span>
          </div>
          <div className="text-muted-foreground">
            Deterministic decision preserved:{' '}
            <span className="font-mono text-foreground">
              {String(trace?.deterministicDecisionPreserved ?? sim?.deterministicDecisionPreserved ?? true)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}