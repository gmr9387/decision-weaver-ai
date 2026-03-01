import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import type { InferenceResult } from '@/lib/types';

interface InferenceTabProps {
  ir: InferenceResult | undefined;
}

export function InferenceTab({ ir }: InferenceTabProps) {
  return (
    <TabsContent value="inference" className="space-y-4">
      {ir ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4">Inference Result</h3>
            <dl className="space-y-3 text-body-sm">
              {[
                ['Decision', ir.decision],
                ['Confidence', `${ir.confidence.toFixed(1)}%`],
                ['Confidence Band', ir.confidenceBand],
                ['Severity', ir.severity],
                ['Mode', ir.mode],
                ['Rules Fired', `${ir.firedRules.filter(r => r.fired).length}/${ir.firedRules.length}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-foreground font-medium capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4">Explanation</h3>
            <p className="text-body-sm text-muted-foreground leading-relaxed">{ir.explanation}</p>
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-caption text-muted-foreground uppercase mb-2">Evidence References</h4>
              <div className="flex flex-wrap gap-2">
                {ir.evidenceRefs.map(ref => <Badge key={ref} variant="secondary" className="font-mono text-caption">{ref}</Badge>)}
              </div>
            </div>
          </div>
        </div>
      ) : <p className="text-body-sm text-muted-foreground p-6">No inference results available.</p>}
    </TabsContent>
  );
}
