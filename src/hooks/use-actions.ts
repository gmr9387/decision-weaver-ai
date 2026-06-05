import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { InferenceResult, InferenceMode } from '@/lib/types';

export function useRunInference() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      caseId,
      facts,
      mode = 'instant',
    }: {
      caseId: string;
      facts: Record<string, unknown>;
      mode?: InferenceMode;
    }): Promise<InferenceResult> => {
      const { data, error } = await supabase.functions.invoke('run-inference', {
        body: { caseId, facts, mode, persist: true },
      });

      if (error) throw error;

      return data as InferenceResult;
    },

    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['case', vars.caseId] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['inference-history', vars.caseId] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['case-outcome', vars.caseId] });
      queryClient.invalidateQueries({ queryKey: ['case-outcomes-analytics'] });

      const firedRules = Array.isArray((data as any)?.firedRules)
        ? (data as any).firedRules.filter((rule: any) => rule?.fired).length
        : 0;

      const traceId =
        (data as any)?.decisionTrace?.traceId ??
        (data as any)?.decision_trace?.traceId ??
        'not persisted';

      toast({
        title: 'Inference complete',
        description: `${String(data.decision).replace('_', ' ')} · ${Number(data.confidence ?? 0).toFixed(1)}% · ${firedRules} rule${firedRules !== 1 ? 's' : ''} fired · trace ${String(traceId).slice(0, 8)}.`,
      });
    },

    onError: (err: any) => {
      toast({
        title: 'Inference failed',
        description: err?.message || 'Could not complete inference.',
        variant: 'destructive',
      });
    },
  });
}

export function useSeedDemoData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('seed-demo-data');

      if (error) throw error;

      return data;
    },

    onSuccess: (data) => {
      if (data?.seeded) {
        queryClient.invalidateQueries({ queryKey: ['cases'] });
        queryClient.invalidateQueries({ queryKey: ['rules'] });
        queryClient.invalidateQueries({ queryKey: ['metrics'] });
        queryClient.invalidateQueries({ queryKey: ['case-outcomes-analytics'] });

        toast({
          title: 'Demo data loaded',
          description: 'Rules, cases, and metrics have been seeded.',
        });
      } else {
        toast({
          title: 'Demo data already present',
          description: 'No new demo data was added.',
        });
      }
    },

    onError: (err: any) => {
      toast({
        title: 'Seeding failed',
        description: err?.message || 'Could not seed demo data.',
        variant: 'destructive',
      });
    },
  });
}