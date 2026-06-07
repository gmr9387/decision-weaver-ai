import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRules } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Play, GitCompare } from 'lucide-react';
import { replayInferenceRun, diffReplay, type ReplayDiff } from '@/lib/replay';
import { ReplayDiffCard } from './ReplayDiffCard';

interface Props {
  caseId: string;
}

export function ReplayPanel({ caseId }: Props) {
  const { toast } = useToast();
  const { data: rules = [] } = useRules();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [diff, setDiff] = useState<ReplayDiff | null>(null);

  const ruleNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of rules) m[r.id] = r.name;
    return m;
  }, [rules]);

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['replay-runs', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inference_runs')
        .select('id, created_at, decision, confidence, input_snapshot, fired_rules, missing_facts, mode')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!caseId,
  });

  const selectedRun = useMemo(
    () => runs.find((r) => r.id === selectedRunId) ?? runs[0] ?? null,
    [runs, selectedRunId],
  );

  const replay = useMutation({
    mutationFn: async () => {
      if (!selectedRun) throw new Error('Select a run to replay.');
      const snapshot = (selectedRun.input_snapshot ?? {}) as Record<string, unknown>;
      if (!snapshot || Object.keys(snapshot).length === 0) {
        throw new Error('This run has no input snapshot to replay.');
      }
      const replayed = await replayInferenceRun(
        snapshot,
        (selectedRun.mode as any) ?? 'instant',
      );
      return diffReplay(selectedRun, replayed);
    },
    onSuccess: (d) => {
      setDiff(d);
      toast({
        title: d.decisionChanged ? 'Replay diverged' : 'Replay matches original',
        description: d.decisionChanged
          ? `${d.originalDecision} → ${d.replayedDecision}`
          : `Confidence delta ${d.confidenceDelta >= 0 ? '+' : ''}${d.confidenceDelta.toFixed(1)}`,
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Replay failed',
        description: err?.message ?? 'Could not replay this run.',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitCompare className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Replay Engine</h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Re-run any historical inference against the current rule set. Compare decision,
            confidence, fired rules, and missing facts to detect drift over time.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Inference Run
          </p>
          <Select
            value={selectedRun?.id ?? ''}
            onValueChange={(v) => {
              setSelectedRunId(v);
              setDiff(null);
            }}
            disabled={isLoading || runs.length === 0}
          >
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder={isLoading ? 'Loading runs...' : 'Select a run'} />
            </SelectTrigger>
            <SelectContent>
              {runs.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {new Date(r.created_at).toLocaleString()} — {r.decision} (
                  {Number(r.confidence).toFixed(0)}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => replay.mutate()}
          disabled={!selectedRun || replay.isPending}
          className="gap-1.5"
        >
          {replay.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Replaying...
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              Replay Run
            </>
          )}
        </Button>
      </div>

      {!isLoading && runs.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No persisted inference runs available for this case.
        </p>
      )}

      {diff && <ReplayDiffCard diff={diff} ruleNameById={ruleNameById} />}
    </div>
  );
}
