import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCases, useRules } from '@/hooks/use-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FlaskConical, ArrowRight, AlertTriangle, CheckCircle2,
  Loader2, ChevronDown, ChevronRight as ChevronRightIcon, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Case, InferenceResult } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuthGate } from '@/hooks/use-auth-gate';

export default function SimulationLab() {
  const { data: cases = [] } = useCases();
  const { data: rules = [] } = useRules();
  const casesWithFacts = useMemo(() => cases.filter(c => c.facts.length > 0), [cases]);
  const defaultCase = useMemo(() => casesWithFacts.find(c => c.inferenceResult) || casesWithFacts[0], [casesWithFacts]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>(undefined);
  const activeCase = selectedCaseId ? cases.find(c => c.id === selectedCaseId) || defaultCase : defaultCase;
  const [factOverrides, setFactOverrides] = useState<Record<string, string>>({});
  const [simResult, setSimResult] = useState<InferenceResult | null>(null);
  const [running, setRunning] = useState(false);
  const [showFiredRules, setShowFiredRules] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
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

  const handleOverride = (key: string, value: string) => {
    setFactOverrides(prev => {
      const next = { ...prev };
      if (value === '') delete next[key];
      else next[key] = value;
      return next;
    });
    // Clear previous result when facts change
    setSimResult(null);
  };

  const runSimulation = async () => {
    if (!requireAuth('run simulations')) return;
    setRunning(true);
    try {
      // Build merged facts: baseline + overrides
      const mergedFacts: Record<string, unknown> = {};
      for (const fact of activeCase.facts) {
        mergedFacts[fact.key] = factOverrides[fact.key] !== undefined
          ? factOverrides[fact.key]
          : fact.value;
      }

      const { data, error } = await supabase.functions.invoke('run-inference', {
        body: { facts: mergedFacts, mode: 'instant', persist: false },
      });

      if (error) throw error;

      setSimResult(data as InferenceResult);
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

  const enabledRuleCount = rules.filter(r => r.enabled).length;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-display-sm text-foreground">Simulation Lab</h1>
            <p className="text-body-sm text-muted-foreground">
              Test what-if scenarios against {enabledRuleCount} active rule{enabledRuleCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Facts Editor */}
          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-body-md font-semibold text-foreground">Simulate Case</h3>
              <Select value={activeCase.id} onValueChange={id => { setSelectedCaseId(id); setFactOverrides({}); setSimResult(null); }}>
                <SelectTrigger className="w-48 h-8 bg-surface-2 border-border text-body-sm">
                  <SelectValue placeholder="Select case" />
                </SelectTrigger>
                <SelectContent>
                  {casesWithFacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.caseNumber} — {c.category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-caption text-muted-foreground mb-4">Modify values to simulate different outcomes</p>
            {activeCase.facts.length === 0 ? (
              <p className="text-body-sm text-muted-foreground italic">
                No facts attached to this case. Add facts via the Cases page first.
              </p>
            ) : (
              <div className="space-y-2">
                {activeCase.facts.map(fact => (
                  <div key={fact.key} className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                    <span className="text-body-sm font-mono text-muted-foreground w-40 shrink-0">{fact.key}</span>
                    <Input
                      className="bg-surface-3 border-border text-body-sm h-8"
                      defaultValue={String(fact.value)}
                      onChange={e => handleOverride(fact.key, e.target.value !== String(fact.value) ? e.target.value : '')}
                    />
                    {factOverrides[fact.key] && (
                      <Badge variant="warning" className="text-caption shrink-0">Modified</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results Comparison */}
          <div className="space-y-4">
            {/* Baseline */}
            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <h3 className="text-body-md font-semibold text-foreground mb-4">Baseline Result</h3>
              {baseline ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="capitalize">{baseline.decision}</Badge>
                    <Badge variant="confidence" className="font-mono">{baseline.confidence.toFixed(1)}%</Badge>
                  </div>
                  <p className="text-body-sm text-muted-foreground">{baseline.explanation}</p>
                </div>
              ) : (
                <p className="text-body-sm text-muted-foreground italic">No baseline inference run exists for this case.</p>
              )}
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>

            {/* Simulated Result */}
            <div className={`rounded-xl border p-6 ${simResult ? 'border-primary/30 bg-primary/5' : 'border-border bg-gradient-card'}`}>
              <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
                Simulated Result
                {simResult && <Badge variant="warning">{(simResult as any).firedRules?.filter((r: any) => r.fired).length || 0} rules fired</Badge>}
              </h3>

              {simResult ? (
                <div className="space-y-4">
                  {/* Decision & Confidence */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="default" className="capitalize">{simResult.decision}</Badge>
                    <Badge variant="confidence" className="font-mono">{simResult.confidence.toFixed(1)}%</Badge>
                    <Badge variant="outline" className="capitalize text-caption">{simResult.confidenceBand}</Badge>
                    {baseline && (
                      simResult.confidence < baseline.confidence ? (
                        <span className="text-caption text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> -{(baseline.confidence - simResult.confidence).toFixed(1)}%
                        </span>
                      ) : simResult.confidence > baseline.confidence ? (
                        <span className="text-caption text-success flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> +{(simResult.confidence - baseline.confidence).toFixed(1)}%
                        </span>
                      ) : null
                    )}
                  </div>

                  {/* Explanation */}
                  <p className="text-body-sm text-muted-foreground">{simResult.explanation}</p>

                  {/* Contradictions */}
                  {simResult.contradictions.length > 0 && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-1">
                      <span className="text-caption font-semibold text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Contradictions
                      </span>
                      {simResult.contradictions.map((c, i) => (
                        <p key={i} className="text-caption text-destructive/80">{c}</p>
                      ))}
                    </div>
                  )}

                  {/* Missing Facts */}
                  {simResult.missingFacts.length > 0 && (
                    <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
                      <span className="text-caption font-semibold text-warning">Missing Facts: </span>
                      <span className="text-caption text-muted-foreground">{simResult.missingFacts.join(', ')}</span>
                    </div>
                  )}

                  {/* Candidate Decisions */}
                  {simResult.candidateDecisions.length > 1 && (
                    <div className="space-y-1">
                      <span className="text-caption font-semibold text-muted-foreground">Candidate Decisions</span>
                      <div className="flex gap-2 flex-wrap">
                        {simResult.candidateDecisions.map((cd, i) => (
                          <Badge key={i} variant="outline" className="capitalize text-caption">
                            {cd.decision} ({cd.score}%)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confidence Breakdown (collapsible) */}
                  <button
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className="flex items-center gap-1 text-caption font-medium text-primary hover:underline"
                  >
                    {showBreakdown ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                    Confidence Breakdown
                  </button>
                  {showBreakdown && simResult.confidenceBreakdown && (
                    <div className="grid grid-cols-2 gap-2 text-caption">
                      {Object.entries(simResult.confidenceBreakdown).map(([k, v]) => (
                        <div key={k} className="flex justify-between p-2 rounded bg-surface-2">
                          <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-mono text-foreground">{typeof v === 'number' ? v.toFixed(1) : v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fired Rules (collapsible) */}
                  <button
                    onClick={() => setShowFiredRules(!showFiredRules)}
                    className="flex items-center gap-1 text-caption font-medium text-primary hover:underline"
                  >
                    {showFiredRules ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                    Rule Details ({simResult.firedRules.length} evaluated)
                  </button>
                  {showFiredRules && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {simResult.firedRules.map((rule, i) => (
                        <div key={i} className={`p-3 rounded-lg text-caption ${rule.fired ? 'bg-primary/5 border border-primary/20' : 'bg-surface-2 border border-border'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            {rule.fired ? (
                              <Zap className="w-3 h-3 text-primary" />
                            ) : (
                              <span className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                            )}
                            <span className="font-medium text-foreground">{rule.name}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">{rule.type}</Badge>
                            {rule.fired && <span className="text-primary font-mono">+{rule.confidenceImpact}</span>}
                          </div>
                          {rule.conditionsMet.length > 0 && (
                            <p className="text-success/80 ml-5">✓ {rule.conditionsMet.join(', ')}</p>
                          )}
                          {rule.conditionsUnmet.length > 0 && (
                            <p className="text-destructive/70 ml-5">✗ {rule.conditionsUnmet.join(', ')}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-body-sm text-muted-foreground">
                  {hasOverrides ? 'Click "Run Simulation" to evaluate against your rules.' : 'Modify facts on the left, then run the simulation.'}
                </p>
              )}
            </div>

            <Button
              variant="hero"
              className="w-full gap-2"
              disabled={running}
              onClick={runSimulation}
            >
              {running ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
              ) : (
                <><FlaskConical className="w-4 h-4" /> Run Simulation</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
