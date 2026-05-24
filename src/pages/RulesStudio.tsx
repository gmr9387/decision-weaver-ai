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

const VALID_OPERATORS = new Set([
  'equals',
  'equal',
  'notEquals',
  'notEqual',
  'greaterThan',
  'greaterThanOrEqual',
  'greaterThanInclusive',
  'lessThan',
  'lessThanOrEqual',
  'lessThanInclusive',
  'contains',
  'in',
  'exists',
]);

const VALID_DECISIONS = new Set([
  'approve',
  'deny',
  'escalate',
  'review',
  'flag',
  'request_info',
  'unresolved',
]);

type ConditionNode = {
  fact?: string;
  operator?: string;
  value?: unknown;
  all?: ConditionNode[];
  any?: ConditionNode[];
};

function normalizeJson(value: unknown, fallback: any) {
  if (typeof value !== 'string') return value ?? fallback;

  try {
    return JSON.parse(value);
  } catch {
    throw new Error('Conditions and output must be valid JSON.');
  }
}

function validateConditionTree(node: ConditionNode, path = 'conditions') {
  if (!node || typeof node !== 'object') {
    throw new Error(`${path} must be an object.`);
  }

  if (node.all) {
    if (!Array.isArray(node.all) || node.all.length === 0) {
      throw new Error(`${path}.all must contain at least one condition.`);
    }
    node.all.forEach((child, index) => validateConditionTree(child, `${path}.all[${index}]`));
    return;
  }

  if (node.any) {
    if (!Array.isArray(node.any) || node.any.length === 0) {
      throw new Error(`${path}.any must contain at least one condition.`);
    }
    node.any.forEach((child, index) => validateConditionTree(child, `${path}.any[${index}]`));
    return;
  }

  if (!node.fact || typeof node.fact !== 'string') {
    throw new Error(`${path}.fact is required.`);
  }

  const operator = node.operator || 'equals';
  if (!VALID_OPERATORS.has(operator)) {
    throw new Error(`Unsupported operator "${operator}" in ${path}.`);
  }

  if (operator !== 'exists' && node.value === undefined) {
    throw new Error(`${path}.value is required for operator "${operator}".`);
  }
}

function validateOutput(output: Record<string, any>) {
  if (!output || typeof output !== 'object') {
    throw new Error('Rule output must be an object.');
  }

  const decision = output.decision || output.action;

  if (!decision) {
    throw new Error('Rule output must include a decision or action.');
  }

  if (!VALID_DECISIONS.has(String(decision))) {
    throw new Error(`Unsupported decision "${decision}".`);
  }
}

function validateRuleForm(form: RuleForm) {
  if (!form.name?.trim()) {
    throw new Error('Rule name is required.');
  }

  if (!form.category?.trim()) {
    throw new Error('Rule category is required.');
  }

  if (!form.type?.trim()) {
    throw new Error('Rule type is required.');
  }

  if (!Number.isFinite(Number(form.priority))) {
    throw new Error('Priority must be a number.');
  }

  if (Number(form.priority) < 1 || Number(form.priority) > 10) {
    throw new Error('Priority must be between 1 and 10.');
  }

  if (!Number.isFinite(Number(form.confidenceImpact))) {
    throw new Error('Confidence impact must be a number.');
  }

  if (Number(form.confidenceImpact) < -25 || Number(form.confidenceImpact) > 25) {
    throw new Error('Confidence impact must be between -25 and 25.');
  }

  if (!form.explanationTemplate?.trim()) {
    throw new Error('Explanation template is required so the decision can be explained.');
  }

  const conditions = normalizeJson(form.conditions, {});
  const output = normalizeJson(form.output, {});

  validateConditionTree(conditions);
  validateOutput(output);

  return { conditions, output };
}

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

  useEffect(() => {
    setRules(fetchedRules);
  }, [fetchedRules]);

  const selected = selectedRule ? rules.find((r) => r.id === selectedRule) || null : null;

  const getOrgId = async () => {
    if (!user?.id) throw new Error('You must be signed in.');

    const { data, error } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data?.organization_id;
  };

  const saveMutation = useMutation({
    mutationFn: async (f: RuleForm & { id?: string }) => {
      const orgId = await getOrgId();
      if (!orgId) throw new Error('No organization found');

      const { conditions, output } = validateRuleForm(f);

      const payload = {
        name: f.name.trim(),
        description: f.description?.trim() || '',
        category: f.category.trim(),
        rule_type: f.type as any,
        priority: Number(f.priority),
        enabled: Boolean(f.enabled),
        conditions,
        output,
        confidence_impact: Number(f.confidenceImpact),
        explanation_template: f.explanationTemplate.trim(),
        organization_id: orgId,
        updated_at: new Date().toISOString(),
      };

      if (f.id) {
        const { error } = await supabase
          .from('rules')
          .update(payload)
          .eq('id', f.id)
          .eq('organization_id', orgId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('rules')
          .insert({
            ...payload,
            created_by: user?.id ?? null,
          } as any);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      setDialogOpen(false);
      toast({ title: editingId ? 'Rule updated' : 'Rule created' });
    },
    onError: (err: any) => {
      toast({
        title: 'Rule validation failed',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const orgId = await getOrgId();
      if (!orgId) throw new Error('No organization found');

      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      setSelectedRule(null);
      toast({ title: 'Rule deleted' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const orgId = await getOrgId();
      if (!orgId) throw new Error('No organization found');

      const { error } = await supabase
        .from('rules')
        .update({
          enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', orgId);

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rules'] }),
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const openCreate = () => {
    if (!requireAuth('create rules')) return;
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const ruleToForm = (rule: Rule): RuleForm => ({
    name: rule.name,
    description: rule.description,
    category: rule.category,
    type: rule.type,
    priority: rule.priority,
    enabled: rule.enabled,
    conditions: rule.conditions,
    output: rule.output,
    confidenceImpact: rule.confidenceImpact,
    explanationTemplate: rule.explanationTemplate,
  });

  const handleEdit = (rule: Rule) => {
    if (!requireAuth('edit rules')) return;
    setEditingId(rule.id);
    setForm(ruleToForm(rule));
    setDialogOpen(true);
  };

  const handleDuplicate = (rule: Rule) => {
    if (!requireAuth('duplicate rules')) return;
    setEditingId(null);
    setForm({
      ...ruleToForm(rule),
      name: `${rule.name} (Copy)`,
      enabled: false,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!requireAuth('delete rules')) return;
    deleteMutation.mutate(id);
  };

  const handleToggle = (id: string, enabled: boolean) => {
    if (!requireAuth('toggle rules')) return;
    toggleMutation.mutate({ id, enabled });
  };

  return (
    <AppLayout>
      <div className="flex h-full">
        <RuleListPanel
          rules={rules}
          search={search}
          selectedRuleId={selectedRule}
          onSearchChange={setSearch}
          onSelectRule={setSelectedRule}
          onCreateClick={openCreate}
          onToggleRule={handleToggle}
        />

        <RuleDetailPanel
          rule={selected}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
      </div>

      <RuleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        onFormChange={setForm}
        isEditing={!!editingId}
        isPending={saveMutation.isPending}
        onSave={() => saveMutation.mutate({ ...form, id: editingId || undefined })}
      />
    </AppLayout>
  );
}