import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import type { InferenceResult } from '@/lib/types';

interface EvidenceTabProps {
  ir: InferenceResult | undefined;
}

export function EvidenceTab({ ir }: EvidenceTabProps) {
  return (
    <TabsContent value="evidence" className="space-y-4">
      <div className="rounded-xl border border-border bg-gradient-card p-6">
        <h3 className="text-body-md font-semibold text-foreground mb-4">Evidence References</h3>
        {ir ? (
          <div className="space-y-2">
            {ir.evidenceRefs.map(ref => (
              <div key={ref} className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                <span className="text-body-sm font-mono text-foreground">{ref}</span>
                <Badge variant="secondary">Source Document</Badge>
              </div>
            ))}
          </div>
        ) : <p className="text-body-sm text-muted-foreground">No evidence available.</p>}
      </div>
    </TabsContent>
  );
}
