import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TabsContent } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Loader2,
  Plus,
  Database,
  CheckCircle2,
  GitBranch,
  FileSearch,
} from 'lucide-react';
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

function arr(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function parseFactValue(value: string): any {
  const trimmed = value.trim();

  if (trimmed === '') return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (!Number.isNaN(Number(trimmed))) return Number(trimmed);

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function getRuleUsageForFact(ir: any, factKey: string) {
  const firedRules = arr(ir?.firedRules ?? ir?.fired_rules);

  return firedRules.filter((rule) => {
    const met = arr(rule.conditionsMet).join(' ');
    const unmet = arr(rule.conditionsUnmet).join(' ');
    return met.includes(factKey) || unmet.includes(factKey);
  });
}

export function FactsTab({ caseId, caseData, ir }: FactsTabProps) {
  const [newFactKey, setNewFactKey] = useState('');
  const [newFactValue, setNewFactValue] = useState('');
  const [newFactSource, setNewFactSource] = useState('Manual');
  const { toast } = useToast();
  const { requireAuth } = useAuthGate();
  const queryClient = useQueryClient();

  const facts = caseData.facts ?? [];
  const presentFacts = facts.filter((f) => f.quality !== 'missing');
  const verifiedFacts = presentFacts.filter((f) => f.quality === 'verified');
  const inferredFacts = presentFacts.filter((f) => f.quality === 'inferred');
  const unverifiedFacts = presentFacts.filter((f) => f.quality === 'unverified');
  const missingFacts = arr((ir as any)?.missingFacts ?? (ir as any)?.missing_facts);
  const contradictions = arr((ir as any)?.contradictions);

  const completeness =
    presentFacts.length + missingFacts.length > 0
      ? Math.round((presentFacts.length / (presentFacts.length + missingFacts.length)) * 100)
      : 100;

  const addFactMutation = useMutation({
    mutationFn: async () => {
      if (!newFactKey.trim()) throw new Error('Fact key is required');

      const parsedValue = parseFactValue(newFactValue);

      const { error } = await supabase.from('case_facts').insert({
        case_id: caseId,
        fact_key: newFactKey.trim(),
        fact_value: parsedValue,
        source: newFactSource.trim() || 'Manual',
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
    onError: (err: any) =>
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      }),
  });

  return (
    <TabsContent value="facts" className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-caption text-muted-foreground">Facts Present</span>
          </div>
          <div className="text-2xl font-semibold text-foreground">{presentFacts.length}</div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-caption text-muted-foreground">Verified</span>
          </div>
          <div className="text-2xl font-semibold text-success">{verifiedFacts.length}</div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-caption text-muted-foreground">Missing</span>
          </div>
          <div className="text-2xl font-semibold text-warning">{missingFacts.length}</div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileSearch className="w-4 h-4 text-primary" />
            <span className="text-caption text-muted-foreground">Completeness</span>
          </div>
          <div className="text-2xl font-semibold text-primary">{completeness}%</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-gradient-card p-6">
          <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" /> Normalized Facts
          </h3>

          {presentFacts.length > 0 ? (
            <div className="space-y-2">
              {presentFacts.map((fact) => {
                const usedByRules = getRuleUsageForFact(ir, fact.key);

                return (
                  <div key={fact.key} className="p-3 rounded-lg bg-surface-2 border border-border/50">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <span className="text-body-sm font-medium text-foreground font-mono">{fact.key}</span>
                        {fact.derived && <Badge variant="info" className="ml-2 text-caption">derived</Badge>}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-body-sm text-foreground">{String(fact.value)}</span>
                        <Badge
                          variant={fact.quality === 'verified' ? 'success' : fact.quality === 'inferred' ? 'info' : 'warning'}
                          className="capitalize text-caption"
                        >
                          {fact.quality}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-caption text-muted-foreground">
                      <span>Source: {fact.source || 'Unknown'}</span>
                      {usedByRules.length > 0 ? (
                        <span className="text-primary">{usedByRules.length} rule{usedByRules.length !== 1 ? 's' : ''} referenced this fact</span>
                      ) : (
                        <span>No rule references detected</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-body-sm text-muted-foreground">
              No facts recorded for this case yet. Add facts below to enable inference.
            </p>
          )}

          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <h4 className="text-body-sm font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Fact
            </h4>

            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <span className="text-caption text-muted-foreground">Key</span>
                <Input
                  value={newFactKey}
                  onChange={(e) => setNewFactKey(e.target.value)}
                  placeholder="e.g. amount_requested"
                  className="bg-surface-3 h-8 text-body-sm font-mono"
                />
              </div>

              <div className="flex-1 space-y-1">
                <span className="text-caption text-muted-foreground">Value</span>
                <Input
                  value={newFactValue}
                  onChange={(e) => setNewFactValue(e.target.value)}
                  placeholder="e.g. 25000"
                  className="bg-surface-3 h-8 text-body-sm"
                />
              </div>

              <div className="w-24 space-y-1">
                <span className="text-caption text-muted-foreground">Source</span>
                <Input
                  value={newFactSource}
                  onChange={(e) => setNewFactSource(e.target.value)}
                  className="bg-surface-3 h-8 text-body-sm"
                />
              </div>

              <Button
                size="sm"
                variant="hero"
                className="h-8 gap-1"
                onClick={() => {
                  if (!requireAuth('add facts')) return;
                  addFactMutation.mutate();
                }}
                disabled={addFactMutation.isPending || !newFactKey.trim()}
              >
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

            {missingFacts.length > 0 ? (
              <div className="space-y-2">
                {missingFacts.map((mf: string) => (
                  <div key={mf} className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-body-sm text-warning font-mono">{mf}</span>
                      <Badge variant="warning">Needed</Badge>
                    </div>
                    <p className="mt-1 text-caption text-muted-foreground">
                      This fact was requested by one or more rules and may improve decision confidence.
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body-sm text-muted-foreground">No missing facts detected.</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" /> Fact Quality Mix
            </h3>

            <div className="space-y-3 text-body-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Verified</span>
                <span className="font-mono text-success">{verifiedFacts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Inferred</span>
                <span className="font-mono text-primary">{inferredFacts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unverified</span>
                <span className="font-mono text-warning">{unverifiedFacts.length}</span>
              </div>
            </div>
          </div>

          {contradictions.length > 0 && (
            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Contradictions
              </h3>

              <div className="space-y-2">
                {contradictions.map((c: string, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-body-sm text-destructive"
                  >
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
}