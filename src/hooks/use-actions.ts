import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { InferenceResult, InferenceMode } from '@/lib/types';

export function useRunInference() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ caseId, facts, mode = 'instant' }: {
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
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['case', vars.caseId] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast({ title: 'Inference complete', description: 'Results have been saved.' });
    },
    onError: (err: any) => {
      toast({ title: 'Inference failed', description: err.message, variant: 'destructive' });
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
        toast({ title: 'Demo data loaded', description: 'Rules, cases, and metrics have been seeded.' });
      }
    },
    onError: (err: any) => {
      toast({ title: 'Seeding failed', description: err.message, variant: 'destructive' });
    },
  });
}
