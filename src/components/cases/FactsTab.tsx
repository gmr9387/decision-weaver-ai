import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TabsContent } from '@/components/ui/tabs';
import { AlertTriangle, Loader2, Plus } from 'lucide-react';
import type { Case, InferenceResult } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface FactsTabProps {
  caseId: string;
  caseData: Case;
  ir: InferenceResult | undefined;
}

export function FactsTab({ caseId, caseData, ir }: FactsTabProps) {
  const [newFactKey, setNewFactKey] = useState('');
  const [newFactValue, setNewFactValue] = useState('');
  const [newFactSource, setNewFactSource] = useState('Manual');
  const { toast } = useToast();
  const { requireAuth } = useAuthGate();
  const queryClient = useQueryClient();

  const addFactMutation = useMutation({
    mutationFn: async () => {
      if (!newFactKey.trim()) throw new Error('Fact key is required');
      let parsedValue: any = newFactValue;
      if (!isNaN(Number(newFactValue)) && newFactValue.trim() !== '') parsedValue = Number(newFactValue);
      else if (newFactValue === 'true') parsedValue = true;
      else if (newFactValue === 'false') parsedValue = false;

      const { error } = await supabase.from('case_facts').insert({
        case_id: caseId,
        fact_key: newFactKey.trim(),
        fact_value: parsedValue,
        source: newFactSource,
        quality: 'unverified',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      setNewFactKey('');
      setNewFactValue('');
      toast({ title: 'Fact added' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  return (
    <TabsContent value="facts" className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-gradient-card p-6">
          <h3 className="text-body-md font-semibold text-foreground mb-4">Normalized Facts</h3>
          {caseData.facts.length > 0 ? (
            <div className="space-y-2">
              {caseData.facts.filter(f => f.quality !== 'missing').map(fact => (
                <div key={fact.key} className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                  <div>
                    <span className="text-body-sm font-medium text-foreground font-mono">{fact.key}</span>
                    {fact.derived && <Badge variant="info" className="ml-2 text-caption">derived</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm text-foreground">{String(fact.value)}</span>
                    <Badge variant={fact.quality === 'verified' ? 'success' : fact.quality === 'inferred' ? 'info' : 'warning'} className="capitalize text-caption">{fact.quality}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-muted-foreground">No facts recorded for this case yet. Add facts below to enable inference.</p>
          )}
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <h4 className="text-body-sm font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Fact
            </h4>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <span className="text-caption text-muted-foreground">Key</span>
                <Input value={newFactKey} onChange={e => setNewFactKey(e.target.value)} placeholder="e.g. amount_requested" className="bg-surface-3 h-8 text-body-sm font-mono" />
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-caption text-muted-foreground">Value</span>
                <Input value={newFactValue} onChange={e => setNewFactValue(e.target.value)} placeholder="e.g. 25000" className="bg-surface-3 h-8 text-body-sm" />
              </div>
              <div className="w-24 space-y-1">
                <span className="text-caption text-muted-foreground">Source</span>
                <Input value={newFactSource} onChange={e => setNewFactSource(e.target.value)} className="bg-surface-3 h-8 text-body-sm" />
              </div>
              <Button size="sm" variant="hero" className="h-8 gap-1" onClick={() => { if (!requireAuth('add facts')) return; addFactMutation.mutate(); }} disabled={addFactMutation.isPending || !newFactKey.trim()}>
                {addFactMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Add
              </Button>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> Missing Facts
            </h3>
            {ir && ir.missingFacts.length > 0 ? (
              <div className="space-y-2">
                {ir.missingFacts.map(mf => (
                  <div key={mf} className="p-3 rounded-lg bg-warning/5 border border-warning/20 text-body-sm text-warning font-mono">{mf}</div>
                ))}
              </div>
            ) : <p className="text-body-sm text-muted-foreground">No missing facts detected.</p>}
          </div>
          {ir && ir.contradictions.length > 0 && (
            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Contradictions
              </h3>
              <div className="space-y-2">
                {ir.contradictions.map((c, i) => (
                  <div key={i} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-body-sm text-destructive">{c}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
}
