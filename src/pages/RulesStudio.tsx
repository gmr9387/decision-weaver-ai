import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useRules } from '@/hooks/use-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Search, Plus, Copy, Pencil, Shield, Zap, GitBranch, Route, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import type { RuleType } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const typeIcons: Record<RuleType, any> = {
  deterministic: Shield, heuristic: Zap, derived_fact: GitBranch, routing: Route, explainability: MessageSquare,
};

const typeColors: Record<RuleType, string> = {
  deterministic: 'default', heuristic: 'info', derived_fact: 'warning', routing: 'success', explainability: 'secondary',
};

const RULE_TYPES: RuleType[] = ['deterministic', 'heuristic', 'derived_fact', 'routing', 'explainability'];

interface RuleForm {
  name: string;
  description: string;
  category: string;
  type: RuleType;
  priority: number;
  enabled: boolean;
  conditions: string;
  output: string;
  confidenceImpact: number;
  explanationTemplate: string;
}

const emptyForm: RuleForm = {
  name: '', description: '', category: 'General', type: 'deterministic',
  priority: 5, enabled: true, conditions: '', output: '',
  confidenceImpact: 0, explanationTemplate: '',
};

export default function RulesStudio() {
  const { data: fetchedRules = [] } = useRules();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [rules, setRules] = useState(fetchedRules);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm);

  useEffect(() => { setRules(fetchedRules); }, [fetchedRules]);

  const filtered = rules.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase())
  );

  const selected = selectedRule ? rules.find(r => r.id === selectedRule) : null;

  const getOrgId = async () => {
    const { data } = await supabase.from('profiles').select('organization_id').eq('user_id', user!.id).single();
    return data?.organization_id;
  };

  const saveMutation = useMutation({
    mutationFn: async (f: RuleForm & { id?: string }) => {
      const orgId = await getOrgId();
      if (!orgId) throw new Error('No organization found');

      const payload = {
        name: f.name,
        description: f.description,
        category: f.category,
        rule_type: f.type as any,
        priority: f.priority,
        enabled: f.enabled,
        conditions: f.conditions,
        output: f.output,
        confidence_impact: f.confidenceImpact,
        explanation_template: f.explanationTemplate,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      setDialogOpen(false);
      toast({ title: editingId ? 'Rule updated' : 'Rule created' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rules').delete().eq('id', id);
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
      const { error } = await supabase.from('rules').update({ enabled }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rules'] }),
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (rule: typeof selected) => {
    if (!rule) return;
    setEditingId(rule.id);
    setForm({
      name: rule.name, description: rule.description, category: rule.category,
      type: rule.type, priority: rule.priority, enabled: rule.enabled,
      conditions: rule.conditions, output: rule.output,
      confidenceImpact: rule.confidenceImpact, explanationTemplate: rule.explanationTemplate,
    });
    setDialogOpen(true);
  };
  const openDuplicate = (rule: typeof selected) => {
    if (!rule) return;
    setEditingId(null);
    setForm({
      name: rule.name + ' (Copy)', description: rule.description, category: rule.category,
      type: rule.type, priority: rule.priority, enabled: false,
      conditions: rule.conditions, output: rule.output,
      confidenceImpact: rule.confidenceImpact, explanationTemplate: rule.explanationTemplate,
    });
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Rule List */}
        <div className="w-96 border-r border-border flex flex-col bg-surface-1">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-display-sm text-foreground">Rules Studio</h1>
              <Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="w-3 h-3" /> Add</Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search rules..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-surface-2" />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {filtered.map(rule => {
              const Icon = typeIcons[rule.type];
              return (
                <button
                  key={rule.id}
                  onClick={() => setSelectedRule(rule.id)}
                  className={`w-full text-left p-4 border-b border-border/50 hover:bg-surface-hover transition-colors ${selectedRule === rule.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-body-sm font-medium text-foreground">{rule.name}</span>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(v) => { toggleMutation.mutate({ id: rule.id, enabled: v }); }}
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={typeColors[rule.type] as any} className="text-caption capitalize">{rule.type.replace('_', ' ')}</Badge>
                    <span className="text-caption text-muted-foreground">{rule.category}</span>
                    <span className="text-caption text-muted-foreground ml-auto font-mono">v{rule.version}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rule Detail */}
        <div className="flex-1 overflow-auto">
          {selected ? (
            <div className="p-6 lg:p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-display-sm text-foreground">{selected.name}</h2>
                    <Badge variant={typeColors[selected.type] as any} className="capitalize">{selected.type.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-body-sm text-muted-foreground">{selected.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openDuplicate(selected)}>
                    <Copy className="w-3 h-3" /> Duplicate
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(selected)}>
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(selected.id)}>
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-gradient-card p-6">
                  <h3 className="text-body-md font-semibold text-foreground mb-4">Rule Configuration</h3>
                  <dl className="space-y-3 text-body-sm">
                    {[
                      ['Rule ID', selected.id.slice(0, 8) + '…'],
                      ['Category', selected.category],
                      ['Priority', selected.priority.toString()],
                      ['Version', `v${selected.version}`],
                      ['Last Modified', selected.lastModified],
                      ['Confidence Impact', `${selected.confidenceImpact >= 0 ? '+' : ''}${selected.confidenceImpact}`],
                      ['Status', selected.enabled ? 'Enabled' : 'Disabled'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="text-foreground font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-gradient-card p-6">
                    <h3 className="text-body-md font-semibold text-foreground mb-3">Conditions</h3>
                    <div className="p-3 rounded-lg bg-surface-2 font-mono text-body-sm text-primary">{selected.conditions}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-gradient-card p-6">
                    <h3 className="text-body-md font-semibold text-foreground mb-3">Output</h3>
                    <div className="p-3 rounded-lg bg-surface-2 font-mono text-body-sm text-foreground">{selected.output}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-gradient-card p-6">
                    <h3 className="text-body-md font-semibold text-foreground mb-3">Explanation Template</h3>
                    <div className="p-3 rounded-lg bg-surface-2 text-body-sm text-muted-foreground italic">{selected.explanationTemplate}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-body-md">Select a rule to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingId ? 'Edit Rule' : 'Create Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-auto pr-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-surface-2" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-surface-2" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Category</Label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="bg-surface-2" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Type</Label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as RuleType }))} className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-body-sm text-foreground">
                  {RULE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Priority</Label>
                <Input type="number" min={1} max={10} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: +e.target.value }))} className="bg-surface-2" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Confidence Impact</Label>
                <Input type="number" step={0.05} min={-1} max={1} value={form.confidenceImpact} onChange={e => setForm(f => ({ ...f, confidenceImpact: +e.target.value }))} className="bg-surface-2" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Conditions (JSON)</Label>
              <Textarea value={form.conditions} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} className="bg-surface-2 font-mono text-body-sm" rows={3} placeholder='{"all": [{"fact": "amount", "operator": "greaterThan", "value": 25000}]}' />
              {form.conditions && (() => { try { JSON.parse(form.conditions); return null; } catch { return <p className="text-caption text-destructive">Invalid JSON</p>; } })()}
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Output (JSON)</Label>
              <Textarea value={form.output} onChange={e => setForm(f => ({ ...f, output: e.target.value }))} className="bg-surface-2 font-mono text-body-sm" rows={2} placeholder='{"decision": "flag", "evidence": "POLICY-001"}' />
              {form.output && (() => { try { JSON.parse(form.output); return null; } catch { return <p className="text-caption text-destructive">Invalid JSON</p>; } })()}
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Explanation Template</Label>
              <Textarea value={form.explanationTemplate} onChange={e => setForm(f => ({ ...f, explanationTemplate: e.target.value }))} className="bg-surface-2" rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} />
              <Label className="text-muted-foreground">Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })} disabled={saveMutation.isPending || !form.name || (!!form.conditions && (() => { try { JSON.parse(form.conditions); return false; } catch { return true; } })()) || (!!form.output && (() => { try { JSON.parse(form.output); return false; } catch { return true; } })())}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
