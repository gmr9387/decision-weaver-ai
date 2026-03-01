import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import type { InferenceResult } from '@/lib/types';

interface RulesTraceTabProps {
  ir: InferenceResult | undefined;
}

export function RulesTraceTab({ ir }: RulesTraceTabProps) {
  return (
    <TabsContent value="rules" className="space-y-3">
      {ir ? ir.firedRules.map((rule, idx) => (
        <div key={rule.ruleId || idx} className={`rounded-xl border p-5 ${rule.fired ? 'border-primary/30 bg-primary/5' : 'border-border bg-gradient-card'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant={rule.fired ? 'default' : 'secondary'}>{rule.fired ? 'Fired' : 'Not Fired'}</Badge>
              <span className="text-body-sm font-semibold text-foreground">{rule.name}</span>
              <Badge variant="outline" className="text-caption capitalize">{rule.type}</Badge>
            </div>
            <span className="text-caption text-muted-foreground font-mono">Priority: {rule.priority}</span>
          </div>
          <p className="text-body-sm text-muted-foreground mb-3">{rule.explanation}</p>
          <div className="flex flex-wrap gap-4 text-caption">
            <div>
              <span className="text-muted-foreground">Conditions Met: </span>
              <span className="text-success font-mono">{rule.conditionsMet.join(', ')}</span>
            </div>
            {rule.conditionsUnmet.length > 0 && (
              <div>
                <span className="text-muted-foreground">Unmet: </span>
                <span className="text-destructive font-mono">{rule.conditionsUnmet.join(', ')}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Output: </span>
              <span className="text-foreground font-mono">{rule.output}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Confidence Impact: </span>
              <span className={`font-mono ${rule.confidenceImpact >= 0 ? 'text-success' : 'text-destructive'}`}>
                {rule.confidenceImpact >= 0 ? '+' : ''}{rule.confidenceImpact}
              </span>
            </div>
          </div>
        </div>
      )) : <p className="text-body-sm text-muted-foreground p-6">No rules trace available.</p>}
    </TabsContent>
  );
}
