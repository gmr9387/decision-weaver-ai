import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCases, useRules } from '@/hooks/use-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FlaskConical, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { InferenceResult } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { FactsEditor } from '@/components/simulation/FactsEditor';
import { SimulationResult } from '@/components/simulation/SimulationResult';

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
        mergedFacts[fact.key] = factOverrides[fact.key] !== undefined ? factOverrides[fact.key] : fact.value;
      }
      const { data, error } = await supabase.functions.invoke('run-inference', {
        body: { facts: mergedFacts, mode: 'instant', persist: false },
      });
      if (error) throw error;
      setSimResult(data as InferenceResult);
    } catch (err: any) {
      toast({ title: 'Simulation failed', description: err?.message || 'Could not run simulation', variant: 'destructive' });
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

            <div className={`rounded-xl border p-6 ${simResult ? 'border-primary/30 bg-primary/5' : 'border-border bg-gradient-card'}`}>
              <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
                Simulated Result
                {simResult && <Badge variant="warning">{(simResult as any).firedRules?.filter((r: any) => r.fired).length || 0} rules fired</Badge>}
              </h3>
              {simResult ? (
                <SimulationResult simResult={simResult} baseline={baseline} />
              ) : (
                <p className="text-body-sm text-muted-foreground">
                  {hasOverrides ? 'Click "Run Simulation" to evaluate against your rules.' : 'Modify facts on the left, then run the simulation.'}
                </p>
              )}
            </div>

            <Button variant="hero" className="w-full gap-2" disabled={running} onClick={runSimulation}>
              {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</> : <><FlaskConical className="w-4 h-4" /> Run Simulation</>}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
