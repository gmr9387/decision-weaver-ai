import { useMemo, useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useRules, useCases } from '@/hooks/use-data';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RuleListPanel } from '@/components/rules/RuleListPanel';
import { RuleDetailPanel } from '@/components/rules/RuleDetailPanel';
import { RuleFormDialog, emptyForm, type RuleForm } from '@/components/rules/RuleFormDialog';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  History,
} from 'lucide-react';
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

type RuleHealth = {
  ruleId: string;
  firedCount: number;
  enabled: boolean;
  priority: number;
  version: number;
  readiness: 'strong' | 'watch' | 'inactive';
  notes: string[];
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
  if (!form.name?.trim()) throw new Error('Rule name is required.');
  if (!form.category?.trim()) throw new Error('Rule category is required.');
  if (!form.type?.trim()) throw new Error('Rule type is required.');

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

function readinessBadge(readiness: RuleHealth['readiness']) {
  if (readiness === 'strong') return <Badge variant="success">Strong</Badge>;
  if (readiness === 'watch') return <Badge variant="warning">Watch</Badge>;
  return <Badge variant="outline">Inactive</Badge>;
}

function AccuracyReadinessPanel({
  rules,
  selectedRule,
}: {
  rules: Rule[];
  selectedRule: Rule | null;
}) {
  const { data: cases = [] } = useCases();

  const health = useMemo(() => {
    const map = new Map<string, RuleHealth>();

    for (const rule of rules) {
      const notes: string[] = [];

      if (!rule.enabled) notes.push('Rule is disabled.');
      if (rule.hitCount === 0) notes.push('No recorded hits yet.');
      if (rule.priority <= 2) notes.push('Critical priority rule.');
      if (!rule.explanationTemplate?.trim()) notes.push('Missing explanation template.');
      if (!rule.version || rule.version < 1) notes.push('Rule version is missing.');

      const readiness: RuleHealth['readiness'] = !rule.enabled
        ? 'inactive'
        : rule.hitCount > 0 && rule.explanationTemplate?.trim() && rule.version >= 1
          ? 'strong'
          : 'watch';

      map.set(rule.id, {
        ruleId: rule.id,
        firedCount: rule.hitCount,
        enabled: rule.enabled,
        priority: rule.priority,
        version: rule.version,
        readiness,
        notes,
      });
    }

    return map;
  }, [rules]);

  const selectedHealth = selectedRule ? health.get(selectedRule.id) : null;

  const totals = useMemo(() => {
    const enabled = rules.filter((r) => r.enabled).length;
    const withHits = rules.filter((r) => r.hitCount > 0).length;
    const versioned = rules.filter((r) => Number(r.version || 0) >= 1).length;
    const totalHits = rules.reduce((sum, rule) => sum + Number(rule.hitCount || 0), 0);
    const casesWithDecisions = cases.filter((c) => c.inferenceResult).length;

    return {
      enabled,
      withHits,
      versioned,
      totalHits,
      casesWithDecisions,
      totalRules: rules.length,
    };
  }, [rules, cases]);

  return (
    <div className="border-b border-border bg-surface-1 p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="text-body-md font-semibold text-foreground">Rule Readiness</h3>
          </div>
          <p className="text-body-sm text-muted-foreground mt-1">
            Readiness based on enabled state, versioning, explanation coverage, and observed inference activity.
          </p>
        </div>

        <Badge variant={totals.casesWithDecisions > 0 ? 'confidence' : 'secondary'}>
          {totals.casesWithDecisions > 0 ? 'Inference history found' : 'No inference history'}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Activity className="w-3.5 h-3.5" />
            Enabled
          </div>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {totals.enabled}/{totals.totalRules}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <History className="w-3.5 h-3.5" />
            Versioned
          </div>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {totals.versioned}/{totals.totalRules}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <BarChart3 className="w-3.5 h-3.5" />
            With Hits
          </div>
          <p className="mt-1 text-xl font-semibold text-foreground">{totals.withHits}</p>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Total Hits
          </div>
          <p className="mt-1 text-xl font-semibold text-foreground">{totals.totalHits}</p>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <AlertTriangle className="w-3.5 h-3.5" />
            Decisions
          </div>
          <p className="mt-1 text-xl font-semibold text-foreground">{totals.casesWithDecisions}</p>
        </div>
      </div>

      {selectedRule && selectedHealth && (
        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-body-sm font-semibold text-foreground">{selectedRule.name}</p>
              <p className="text-caption text-muted-foreground">
                Version {selectedRule.version} · {selectedRule.hitCount} recorded hit
                {selectedRule.hitCount !== 1 ? 's' : ''}
              </p>
            </div>

            {readinessBadge(selectedHealth.readiness)}
          </div>

          {selectedHealth.notes.length > 0 ? (
            <ul className="mt-3 space-y-1 text-body-sm text-muted-foreground">
              {selectedHealth.notes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-body-sm text-muted-foreground">
              No readiness warnings detected for this rule.
            </p>
          )}
        </div>
      )}
    </div>
  );
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

  const invalidateRuleData = (ruleId?: string | null) => {
    queryClient.invalidateQueries({ queryKey: ['rules'] });
    queryClient.invalidateQueries({ queryKey: ['cases'] });
    queryClient.invalidateQueries({ queryKey: ['metrics'] });

    if (ruleId) {
      queryClient.invalidateQueries({ queryKey: ['rule-versions', ruleId] });
    }
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

        return { id: f.id, action: 'updated' as const };
      }

      const { data, error } = await supabase
        .from('rules')
        .insert({
          ...payload,
          created_by: user?.id ?? null,
        } as any)
        .select('id')
        .single();

      if (error) throw error;

      return { id: data?.id as string | undefined, action: 'created' as const };
    },
    onSuccess: (result) => {
      invalidateRuleData(result.id || editingId);
      setDialogOpen(false);

      if (result.id) {
        setSelectedRule(result.id);
      }

      toast({
        title: result.action === 'updated' ? 'Rule updated' : 'Rule created',
        description: 'Version history will refresh after the database snapshot trigger completes.',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Rule validation failed',
        description: err?.message || 'Could not save rule.',
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

      return id;
    },
    onSuccess: (id) => {
      invalidateRuleData(id);
      setSelectedRule(null);
      toast({ title: 'Rule deleted' });
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err?.message || 'Could not delete rule.',
        variant: 'destructive',
      });
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

      return { id, enabled };
    },
    onSuccess: ({ id, enabled }) => {
      invalidateRuleData(id);
      toast({
        title: enabled ? 'Rule enabled' : 'Rule disabled',
        description: 'Rule version history will refresh if the snapshot trigger records this change.',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err?.message || 'Could not update rule.',
        variant: 'destructive',
      });
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

        <div className="flex flex-col flex-1 min-w-0">
          <AccuracyReadinessPanel rules={rules} selectedRule={selected} />

          <RuleDetailPanel
            rule={selected}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        </div>
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