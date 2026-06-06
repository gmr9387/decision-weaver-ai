import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import {
  Clock,
  Brain,
  ShieldCheck,
  GitBranch,
  AlertTriangle,
  FileSearch,
  History,
} from 'lucide-react';

interface HistoryItem {
  id: string;
  createdAt: string;
  mode: string;
  decision: string;
  confidence: number;
  confidenceBand: string;
  severity: string;
  explanation: string;
  firedRulesCount: number;
  totalRules: number;
  missingFacts: string[];
  contradictions: string[];
  traceId?: string;
}

interface HistoryTabProps {
  inferenceHistory: HistoryItem[];
}

function formatDate(value?: string) {
  if (!value) return 'Unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function confidenceVariant(confidence: number) {
  if (confidence >= 85) return 'confidence';
  if (confidence >= 65) return 'default';
  if (confidence >= 40) return 'warning';
  return 'destructive';
}

export function HistoryTab({ inferenceHistory }: HistoryTabProps) {
  return (
    <TabsContent value="history" className="space-y-5">
      <div className="rounded-xl border border-border bg-gradient-card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <History className="h-4 w-4 text-primary" />
              <h3 className="text-body-md font-semibold text-foreground">Inference History</h3>
            </div>

            <p className="text-body-sm text-muted-foreground">
              Historical inference runs for this case, including decision, confidence, trace ID,
              fired rules, missing facts, and contradictions.
            </p>
          </div>

          <Badge variant="secondary">
            {inferenceHistory.length} run{inferenceHistory.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {inferenceHistory.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-1 p-6 text-center">
          <Brain className="mx-auto mb-3 h-8 w-8 text-muted-foreground opacity-50" />
          <p className="text-body-sm text-muted-foreground">
            No inference history exists for this case yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {inferenceHistory.map((run, index) => (
            <div
              key={run.id}
              className="rounded-xl border border-border bg-gradient-card p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge variant={index === 0 ? 'default' : 'secondary'}>
                      {index === 0 ? 'Latest' : `Run ${inferenceHistory.length - index}`}
                    </Badge>

                    <Badge variant="outline" className="capitalize">
                      {String(run.mode).replace('_', ' ')}
                    </Badge>

                    <Badge variant="secondary" className="capitalize">
                      {String(run.severity).replace('_', ' ')}
                    </Badge>

                    {run.traceId && (
                      <Badge variant="outline" className="font-mono">
                        trace:{String(run.traceId).slice(0, 8)}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-body-sm text-muted-foreground">
                      {formatDate(run.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  <Badge variant="default" className="capitalize">
                    {String(run.decision).replace('_', ' ')}
                  </Badge>

                  <Badge variant={confidenceVariant(run.confidence) as any} className="font-mono">
                    {Number(run.confidence ?? 0).toFixed(1)}%
                  </Badge>

                  <Badge variant="outline" className="capitalize">
                    {String(run.confidenceBand).replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <p className="text-body-sm text-muted-foreground">
                {run.explanation || 'No explanation recorded.'}
              </p>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <GitBranch className="h-4 w-4 text-primary" />
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Rules</p>
                  </div>
                  <p className="text-xl font-semibold text-foreground">
                    {run.firedRulesCount}
                    <span className="text-sm text-muted-foreground"> / {run.totalRules}</span>
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileSearch className="h-4 w-4 text-primary" />
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Missing Facts</p>
                  </div>
                  <p className="text-xl font-semibold text-foreground">
                    {run.missingFacts?.length ?? 0}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Contradictions</p>
                  </div>
                  <p className="text-xl font-semibold text-foreground">
                    {run.contradictions?.length ?? 0}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Trace</p>
                  </div>
                  <p className="truncate font-mono text-sm text-foreground">
                    {run.traceId ?? 'No trace'}
                  </p>
                </div>
              </div>

              {(run.missingFacts?.length > 0 || run.contradictions?.length > 0) && (
                <div className="grid gap-3 md:grid-cols-2">
                  {run.missingFacts?.length > 0 && (
                    <div className="rounded-lg border border-warning/20 bg-warning/10 p-3">
                      <p className="text-caption font-semibold text-warning mb-2">
                        Missing Facts
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {run.missingFacts.map((fact) => (
                          <Badge key={fact} variant="outline" className="font-mono text-caption">
                            {fact}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {run.contradictions?.length > 0 && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                      <p className="text-caption font-semibold text-destructive mb-2">
                        Contradictions
                      </p>
                      <div className="space-y-1">
                        {run.contradictions.map((item, i) => (
                          <p key={i} className="text-caption text-destructive/80">
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </TabsContent>
  );
}