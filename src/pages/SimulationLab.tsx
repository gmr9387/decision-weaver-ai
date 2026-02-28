import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCases } from '@/hooks/use-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FlaskConical, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Case } from '@/lib/types';

export default function SimulationLab() {
  const { data: cases = [] } = useCases();
  const defaultCase = useMemo(() => cases.find(c => c.inferenceResult) || cases[0], [cases]);
  const [selectedCase, setSelectedCase] = useState<Case | undefined>(undefined);
  const activeCase = selectedCase || defaultCase;
  const [factOverrides, setFactOverrides] = useState<Record<string, string>>({});

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
  };

  // Simulate: shift confidence based on overrides
  const simConfidence = baseline
    ? Math.max(10, Math.min(99, baseline.confidence + (hasOverrides ? -5 * Object.keys(factOverrides).length + Math.random() * 10 : 0)))
    : 0;
  const simDecision = simConfidence < 50 ? 'review' : baseline?.decision;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-display-sm text-foreground">Simulation Lab</h1>
            <p className="text-body-sm text-muted-foreground">Test what-if scenarios by modifying facts</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Facts Editor */}
          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4">
              Facts — {activeCase.caseNumber}
            </h3>
            <p className="text-caption text-muted-foreground mb-4">Modify values to simulate different outcomes</p>
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
          </div>

          {/* Results Comparison */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <h3 className="text-body-md font-semibold text-foreground mb-4">Baseline Result</h3>
              {baseline && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="capitalize">{baseline.decision}</Badge>
                    <Badge variant="confidence" className="font-mono">{baseline.confidence.toFixed(1)}%</Badge>
                  </div>
                  <p className="text-body-sm text-muted-foreground">{baseline.explanation}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>

            <div className={`rounded-xl border p-6 ${hasOverrides ? 'border-primary/30 bg-primary/5' : 'border-border bg-gradient-card'}`}>
              <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
                Simulated Result
                {hasOverrides && <Badge variant="warning">{Object.keys(factOverrides).length} changes</Badge>}
              </h3>
              {hasOverrides && baseline ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="capitalize">{simDecision}</Badge>
                    <Badge variant="confidence" className="font-mono">{simConfidence.toFixed(1)}%</Badge>
                    {simConfidence < baseline.confidence ? (
                      <span className="text-caption text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> -{(baseline.confidence - simConfidence).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-caption text-success flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> +{(simConfidence - baseline.confidence).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <p className="text-body-sm text-muted-foreground">
                    {simDecision !== baseline.decision
                      ? `Decision changed from "${baseline.decision}" to "${simDecision}" due to modified facts.`
                      : 'Decision unchanged, but confidence shifted based on modified inputs.'}
                  </p>
                </div>
              ) : (
                <p className="text-body-sm text-muted-foreground">Modify facts on the left to see simulated results.</p>
              )}
            </div>

            <Button variant="hero" className="w-full gap-2" disabled={!hasOverrides}>
              <FlaskConical className="w-4 h-4" /> Run Full Simulation
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
