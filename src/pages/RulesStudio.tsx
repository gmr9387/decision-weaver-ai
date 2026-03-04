import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useRules } from '@/hooks/use-data';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RuleListPanel } from '@/components/rules/RuleListPanel';
import { RuleDetailPanel } from '@/components/rules/RuleDetailPanel';
import { RuleFormDialog, emptyForm, type RuleForm } from '@/components/rules/RuleFormDialog';
import type { Rule } from '@/lib/types';

export default function RulesStudio() {
  const { data: fetchedRules = [] } = useRules();
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [rules, setRules] = useState(fetchedRules);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm);

  useEffect(() => { setRules(fetchedRules); }, [fetchedRules]);

  const selected = selectedRule ? rules.find(r => r.id === selectedRule) || null : null;

  const getOrgId = async () => {
    const { data } = await supabase.from('profiles').select('organization_id').eq('user_id', user!.id).single();
    return data?.organization_id;
  };

  const saveMutation = useMutation({
    mutationFn: async (f: RuleForm & { id?: string }) => {
      const orgId = await getOrgId();
      if (!orgId) throw new Error('No organization found');
      const payload = {
        name: f.name, description: f.description, category: f.category,
        rule_type: f.type as any, priority: f.priority, enabled: f.enabled,
        conditions: f.conditions, output: f.output,
        confidence_impact: f.confidenceImpact, explanation_template: f.explanationTemplate,
        organization_id: orgId,
      };
      if (f.id) {
        const { error } = await supabase.from('rules').update(payload).eq('id', f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rules'] }); setDialogOpen(false); toast({ title: editingId ? 'Rule updated' : 'Rule created' }); },
    onError: (err: any) => { toast({ title: 'Error', description: err.message, variant: 'destructive' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('rules').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rules'] }); setSelectedRule(null); toast({ title: 'Rule deleted' }); },
    onError: (err: any) => { toast({ title: 'Error', description: err.message, variant: 'destructive' }); },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => { const { error } = await supabase.from('rules').update({ enabled }).eq('id', id); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rules'] }),
  });

  const openCreate = () => { if (!requireAuth('create rules')) return; setEditingId(null); setForm(emptyForm); setDialogOpen(true); };

  const ruleToForm = (rule: Rule): RuleForm => ({
    name: rule.name, description: rule.description, category: rule.category,
    type: rule.type, priority: rule.priority, enabled: rule.enabled,
    conditions: rule.conditions, output: rule.output,
    confidenceImpact: rule.confidenceImpact, explanationTemplate: rule.explanationTemplate,
  });

  const handleEdit = (rule: Rule) => { if (!requireAuth('edit rules')) return; setEditingId(rule.id); setForm(ruleToForm(rule)); setDialogOpen(true); };
  const handleDuplicate = (rule: Rule) => { if (!requireAuth('duplicate rules')) return; setEditingId(null); setForm({ ...ruleToForm(rule), name: rule.name + ' (Copy)', enabled: false }); setDialogOpen(true); };
  const handleDelete = (id: string) => { if (!requireAuth('delete rules')) return; deleteMutation.mutate(id); };
  const handleToggle = (id: string, enabled: boolean) => { if (!requireAuth('toggle rules')) return; toggleMutation.mutate({ id, enabled }); };

  return (
    <AppLayout>
      <div className="flex h-full">
        <RuleListPanel
          rules={rules} search={search} selectedRuleId={selectedRule}
          onSearchChange={setSearch} onSelectRule={setSelectedRule}
          onCreateClick={openCreate} onToggleRule={handleToggle}
        />
        <RuleDetailPanel rule={selected} onEdit={handleEdit} onDuplicate={handleDuplicate} onDelete={handleDelete} />
      </div>
      <RuleFormDialog
        open={dialogOpen} onOpenChange={setDialogOpen}
        form={form} onFormChange={setForm} isEditing={!!editingId}
        isPending={saveMutation.isPending}
        onSave={() => saveMutation.mutate({ ...form, id: editingId || undefined })}
      />
    </AppLayout>
  );
}
