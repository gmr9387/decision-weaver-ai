import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import { History } from 'lucide-react';
import { decisionColors } from './constants';

interface InferenceHistoryRun {
  id: string;
  decision: string;
  confidence: number;
  confidenceBand: string;
  mode: string;
  explanation: string;
  firedRulesCount: number;
  totalRules: number;
  missingFacts: string[];
  contradictions: string[];
  createdAt: string;
}

interface HistoryTabProps {
  inferenceHistory: InferenceHistoryRun[];
}

export function HistoryTab({ inferenceHistory }: HistoryTabProps) {
  return (
    <TabsContent value="history" className="space-y-4">
      <div className="rounded-xl border border-border bg-gradient-card p-6">
        <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-primary" /> Inference History
        </h3>
        {inferenceHistory.length > 0 ? (
          <div className="space-y-3">
            {inferenceHistory.map((run, idx) => {
              const prevRun = inferenceHistory[idx + 1];
              const decisionChanged = prevRun && prevRun.decision !== run.decision;
              const confidenceDelta = prevRun ? run.confidence - prevRun.confidence : null;
              return (
                <div key={run.id} className={`p-4 rounded-lg border ${idx === 0 ? 'border-primary/30 bg-primary/5' : 'border-border bg-surface-2'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {idx === 0 && <Badge variant="default" className="text-caption">Latest</Badge>}
                      <Badge variant={(decisionColors as any)[run.decision] || 'secondary'} className="capitalize">{run.decision.replace('_', ' ')}</Badge>
                      <span className="text-body-sm font-mono text-foreground">{run.confidence.toFixed(1)}%</span>
                      {confidenceDelta !== null && (
                        <span className={`text-caption font-mono ${confidenceDelta >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ({confidenceDelta >= 0 ? '+' : ''}{confidenceDelta.toFixed(1)})
                        </span>
                      )}
                    </div>
                    <span className="text-caption text-muted-foreground">{new Date(run.createdAt).toLocaleString()}</span>
                  </div>
                  {decisionChanged && (
                    <div className="mb-2 px-2 py-1 rounded bg-warning/10 border border-warning/20 text-caption text-warning">
                      Decision changed from <span className="font-semibold capitalize">{prevRun.decision}</span> → <span className="font-semibold capitalize">{run.decision}</span>
                    </div>
                  )}
                  <p className="text-caption text-muted-foreground line-clamp-2">{run.explanation}</p>
                  <div className="flex items-center gap-3 mt-2 text-caption text-muted-foreground">
                    <span>Mode: <span className="text-foreground capitalize">{run.mode}</span></span>
                    <span>Rules: <span className="text-foreground">{run.firedRulesCount}/{run.totalRules}</span></span>
                    <span>Band: <span className="text-foreground capitalize">{run.confidenceBand}</span></span>
                    {run.missingFacts.length > 0 && <Badge variant="warning" className="text-caption">{run.missingFacts.length} missing</Badge>}
                    {run.contradictions.length > 0 && <Badge variant="critical" className="text-caption">{run.contradictions.length} conflicts</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-body-sm text-muted-foreground">No inference runs recorded yet. Run inference to see history.</p>
        )}
      </div>
    </TabsContent>
  );
}
