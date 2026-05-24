import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCases, useRules } from '@/hooks/use-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FlaskConical,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  GitCompare,
  FileSearch,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { InferenceResult } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { FactsEditor } from '@/components/simulation/FactsEditor';
import { SimulationResult } from '@/components/simulation/SimulationResult';

function getArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function getConfidenceBreakdown(result: any): Record<string, unknown> {
  return result?.confidenceBreakdown ?? result?.confidence_breakdown ?? {};
}

function getDecisionTrace(result: any) {
  return result?.decisionTrace ?? result?.decision_trace ?? null;
}

function getFiredRules(result: any) {
  return getArray(result?.firedRules ?? result?.fired_rules).filter((r) => r?.fired);
}

function getMissingFacts(result: any) {
  return getArray(result?.missingFacts ?? result?.missing_facts);
}

function getContradictions(result: any) {
  return getArray(result?.contradictions);
}

function getCandidateDecisions(result: any) {
  return getArray(result?.candidateDecisions ?? result?.candidate_decisions);
}

function SimulationTrustSummary({
  simResult,
  baseline,
}: {
  simResult: InferenceResult | null;
  baseline: InferenceResult | null | undefined;
}) {
  if (!simResult) return null;

  const sim: any = simResult;
  const base: any = baseline;
  const firedRules = getFiredRules(sim);
  const missingFacts = getMissingFacts(sim);
  const contradictions = getContradictions(sim);
  const candidateDecisions = getCandidateDecisions(sim);
  const confidenceBreakdown = getConfidenceBreakdown(sim);
  const trace = getDecisionTrace(sim);

  const decisionChanged = base?.decision && base.decision !== sim.decision;
  const confidenceDelta = typeof base?.confidence === 'number'
    ? Number((sim.confidence - base.confidence).toFixed(1))
    : null;

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="text-body-md font-semibold text-foreground">Simulation Trust Package</h3>
          </div>
          <p className="text-body-sm text-muted-foreground">
            This simulation ran without persistence and shows how the rule engine reacted to the modified facts.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Badge variant={decisionChanged ? 'warning' : 'secondary'}>
            {decisionChanged ? 'Decision Changed' : 'Decision Stable'}
          </Badge>
          {confidenceDelta !== null && (
            <Badge variant={confidenceDelta < 0 ? 'destructive' : 'confidence'} className="font-mono">
              {confidenceDelta >= 0 ? '+' : ''}{confidenceDelta}%
            </Badge>
          )}
        </div>
      </div>

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
            {trace?.traceId ?? sim?.trace_id ?? 'Simulation trace'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <div className="flex items-center gap-2 mb-3">
            <GitCompare className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-foreground">Decision Comparison</h4>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Baseline</span>
              <span className="font-mono text-foreground">{base?.decision ?? 'none'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Simulated</span>
              <span className="font-mono text-foreground">{sim?.decision ?? 'none'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-mono text-foreground">{Number(sim?.confidence ?? 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileSearch className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-foreground">Candidate Decisions</h4>
          </div>

          <div className="space-y-2 text-sm">
            {candidateDecisions.length > 0 ? (
              candidateDecisions.slice(0, 5).map((candidate: any) => (
                <div key={candidate.decision} className="flex justify-between gap-4">
                  <span className="capitalize text-foreground">{String(candidate.decision).replace('_', ' ')}</span>
                  <span className="font-mono text-muted-foreground">{candidate.score}%</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No candidate decisions returned.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <div className="flex items-center gap-2 mb-3">
            {contradictions.length > 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-primary" />
            )}
            <h4 className="font-semibold text-foreground">Quality Checks</h4>
          </div>

          <div className="space-y-2 text-sm">
            {contradictions.length > 0 ? (
              contradictions.slice(0, 3).map((item: string) => (
                <p key={item} className="text-amber-500">{item}</p>
              ))
            ) : (
              <p className="text-muted-foreground">No contradictions detected.</p>
            )}

            {missingFacts.length > 0 && (
              <p className="text-muted-foreground">
                Missing: <span className="font-mono">{missingFacts.slice(0, 4).join(', ')}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface-2 p-4">
        <h4 className="font-semibold text-foreground mb-3">Confidence Breakdown</h4>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(confidenceBreakdown).length > 0 ? (
            Object.entries(confidenceBreakdown).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3 rounded-md bg-background/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="font-mono text-foreground">{String(value)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No confidence breakdown returned.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SimulationLab() {
  const { data: cases = [] } = useCases();
  const { data: rules = [] } = useRules();
  const casesWithFacts = useMemo(() => cases.filter((c) => c.facts.length > 0), [cases]);
  const defaultCase = useMemo(() => casesWithFacts.find((c) => c.inferenceResult) || casesWithFacts[0], [casesWithFacts]);

  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(undefined);
  const activeCase = selectedCaseId ? cases.find((c) => c.id === selectedCaseId) || defaultCase : defaultCase;

  const [factOverrides, setFactOverrides] = useState<Record<string, string>>({});
  const [simResult, setSimResult] = useState<InferenceResult | null>(null);
  const [running, setRunning] = useState(false);

  const { toast } = useToast();
  const { requireAuth } = useAuthGate();

  if (!activeCase) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-body-md">No cases available for simulation.</p>
        </div>
      </AppLayout>
    );
  }

  const baseline = activeCase.inferenceResult;
  const hasOverrides = Object.keys(factOverrides).length > 0;
  const enabledRuleCount = rules.filter((r) => r.enabled).length;

  const handleOverride = (key: string, value: string) => {
    setFactOverrides((prev) => {
      const next = { ...prev };
      if (value === '') delete next[key];
      else next[key] = value;
      return next;
    });
    setSimResult(null);
  };

  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id);
    setFactOverrides({});
    setSimResult(null);
  };

  const runSimulation = async () => {
    if (!requireAuth('run simulations')) return;

    setRunning(true);

    try {
      const mergedFacts: Record<string, unknown> = {};

      for (const fact of activeCase.facts) {
        mergedFacts[fact.key] = factOverrides[fact.key] !== undefined
          ? factOverrides[fact.key]
          : fact.value;
      }

      const { data, error } = await supabase.functions.invoke('run-inference', {
        body: {
          caseId: activeCase.id,
          facts: mergedFacts,
          mode: 'instant',
          persist: false,
        },
      });

      if (error) throw error;

      const result = data as InferenceResult;
      setSimResult(result);

      const firedCount = getFiredRules(result).length;
      const missingCount = getMissingFacts(result).length;
      const contradictionCount = getContradictions(result).length;

      toast({
        title: 'Simulation complete',
        description: `${firedCount} rule${firedCount !== 1 ? 's' : ''} fired · ${missingCount} missing fact${missingCount !== 1 ? 's' : ''} · ${contradictionCount} contradiction${contradictionCount !== 1 ? 's' : ''}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Simulation failed',
        description: err?.message || 'Could not run simulation',
        variant: 'destructive',
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-display-sm text-foreground">Simulation Lab</h1>
              <p className="text-body-sm text-muted-foreground">
                Test what-if decisions against {enabledRuleCount} active rule{enabledRuleCount !== 1 ? 's' : ''} without changing the case.
              </p>
            </div>
          </div>

          <Badge variant={hasOverrides ? 'warning' : 'secondary'}>
            {hasOverrides ? `${Object.keys(factOverrides).length} override${Object.keys(factOverrides).length !== 1 ? 's' : ''}` : 'No overrides'}
          </Badge>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <FactsEditor
            activeCase={activeCase}
            casesWithFacts={casesWithFacts}
            factOverrides={factOverrides}
            onSelectCase={handleSelectCase}
            onOverride={handleOverride}
          />

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <h3 className="text-body-md font-semibold text-foreground mb-4">Baseline Result</h3>

              {baseline ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="default" className="capitalize">{baseline.decision}</Badge>
                    <Badge variant="confidence" className="font-mono">{baseline.confidence.toFixed(1)}%</Badge>
                  </div>
                  <p className="text-body-sm text-muted-foreground">{baseline.explanation}</p>
                </div>
              ) : (
                <p className="text-body-sm text-muted-foreground italic">
                  No baseline inference run exists for this case.
                </p>
              )}
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>

            <div className={`rounded-xl border p-6 ${simResult ? 'border-primary/30 bg-primary/5' : 'border-border bg-gradient-card'}`}>
              <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
                Simulated Result
                {simResult && (
                  <Badge variant="warning">
                    {getFiredRules(simResult).length} rules fired
                  </Badge>
                )}
              </h3>

              {simResult ? (
                <SimulationResult simResult={simResult} baseline={baseline} />
              ) : (
                <p className="text-body-sm text-muted-foreground">
                  {hasOverrides
                    ? 'Click "Run Simulation" to evaluate this scenario against your rules.'
                    : 'Modify facts on the left, then run the simulation.'}
                </p>
              )}
            </div>

            <Button variant="hero" className="w-full gap-2" disabled={running} onClick={runSimulation}>
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Running...
                </>
              ) : (
                <>
                  <FlaskConical className="w-4 h-4" /> Run Simulation
                </>
              )}
            </Button>
          </div>
        </div>

        <SimulationTrustSummary simResult={simResult} baseline={baseline} />
      </div>
    </AppLayout>
  );
}