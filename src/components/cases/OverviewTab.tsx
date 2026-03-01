import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { Shield, Zap, Play, Loader2, FileText } from 'lucide-react';
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

export function OverviewTab({ caseData, ir, onRunInference, isRunning, canRun }: OverviewTabProps) {
  const DecIcon = ir ? (decisionIcons[ir.decision] || FileText) : FileText;

  return (
    <TabsContent value="overview" className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-gradient-card p-6 space-y-4">
          <h3 className="text-body-md font-semibold text-foreground flex items-center gap-2">
            <DecIcon className="w-4 h-4 text-primary" /> Decision Summary
          </h3>
          {ir ? (
            <>
              <p className="text-body-sm text-muted-foreground">{ir.explanation}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">Mode: {ir.mode}</Badge>
                <Badge variant="secondary">{ir.firedRules.filter(r => r.fired).length} rules fired</Badge>
                {ir.missingFacts.length > 0 && <Badge variant="warning">{ir.missingFacts.length} missing facts</Badge>}
                {ir.contradictions.length > 0 && <Badge variant="critical">{ir.contradictions.length} contradictions</Badge>}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-body-sm text-muted-foreground">Inference has not been run for this case yet.</p>
              <Button variant="hero" size="sm" className="gap-1.5" onClick={onRunInference} disabled={isRunning || !canRun}>
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
          {ir ? <ConfidenceBreakdownViz breakdown={ir.confidenceBreakdown} /> : <p className="text-body-sm text-muted-foreground">—</p>}
        </div>
      </div>

      {ir && ir.recommendations.length > 0 && (
        <div className="rounded-xl border border-border bg-gradient-card p-6">
          <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Recommended Actions
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {ir.recommendations.map((rec, i) => (
              <div key={i} className="p-4 rounded-lg bg-surface-2 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-body-sm font-medium text-foreground">{rec.title}</span>
                  <Badge variant={rec.urgency === 'critical' ? 'critical' : rec.urgency === 'high' ? 'warning' : 'secondary'} className="capitalize text-caption">{rec.urgency}</Badge>
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
          <h3 className="text-body-md font-semibold text-foreground mb-4">Case Details</h3>
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
          <h3 className="text-body-md font-semibold text-foreground mb-4">Candidate Decisions</h3>
          {ir ? (
            <div className="space-y-3">
              {ir.candidateDecisions.map((cd, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={i === 0 ? (decisionColors[cd.decision] as any) : 'secondary'} className="capitalize">{cd.decision.replace('_', ' ')}</Badge>
                    {i === 0 && <span className="text-caption text-primary">← selected</span>}
                  </div>
                  <span className="text-body-sm font-mono text-muted-foreground">{cd.score.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          ) : <p className="text-body-sm text-muted-foreground">—</p>}
        </div>
      </div>
    </TabsContent>
  );
}
