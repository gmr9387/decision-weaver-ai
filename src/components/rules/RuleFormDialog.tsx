import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Code, GitBranch } from 'lucide-react';
import type { RuleType } from '@/lib/types';
import {
  ConditionTreeBuilder,
  fromJson,
  toJson,
  type ConditionNode,
} from './ConditionTreeBuilder';

const RULE_TYPES: RuleType[] = ['deterministic', 'heuristic', 'derived_fact', 'routing', 'explainability'];

export interface RuleForm {
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

export const emptyForm: RuleForm = {
  name: '', description: '', category: 'General', type: 'deterministic',
  priority: 5, enabled: true, conditions: '', output: '',
  confidenceImpact: 0, explanationTemplate: '',
};

function isValidJson(s: string) { try { JSON.parse(s); return true; } catch { return false; } }

function safeParseConditions(s: string): ConditionNode {
  try {
    return fromJson(JSON.parse(s));
  } catch {
    return fromJson(null);
  }
}

interface RuleFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: RuleForm;
  onFormChange: (updater: (f: RuleForm) => RuleForm) => void;
  isEditing: boolean;
  isPending: boolean;
  onSave: () => void;
}

export function RuleFormDialog({ open, onOpenChange, form, onFormChange, isEditing, isPending, onSave }: RuleFormDialogProps) {
  const [mode, setMode] = useState<'visual' | 'json'>('visual');

  const outputInvalid = !!form.output && !isValidJson(form.output);
  const conditionsInvalid = mode === 'json' && !!form.conditions && !isValidJson(form.conditions);
  const disabled = isPending || !form.name || conditionsInvalid || outputInvalid;

  const conditionTree = safeParseConditions(form.conditions);

  const handleTreeChange = (node: ConditionNode) => {
    const json = JSON.stringify(toJson(node), null, 2);
    onFormChange(f => ({ ...f, conditions: json }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isEditing ? 'Edit Rule' : 'Create Rule'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[65vh] overflow-auto pr-2">
          {/* Name & Description */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Name</Label>
            <Input value={form.name} onChange={e => onFormChange(f => ({ ...f, name: e.target.value }))} className="bg-surface-2" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Description</Label>
            <Textarea value={form.description} onChange={e => onFormChange(f => ({ ...f, description: e.target.value }))} className="bg-surface-2" rows={2} />
          </div>

          {/* Category & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Category</Label>
              <Input value={form.category} onChange={e => onFormChange(f => ({ ...f, category: e.target.value }))} className="bg-surface-2" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Type</Label>
              <select value={form.type} onChange={e => onFormChange(f => ({ ...f, type: e.target.value as RuleType }))} className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-body-sm text-foreground">
                {RULE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Priority & Confidence Impact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Priority</Label>
              <Input type="number" min={1} max={10} value={form.priority} onChange={e => onFormChange(f => ({ ...f, priority: +e.target.value }))} className="bg-surface-2" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Confidence Impact</Label>
              <Input type="number" step={0.05} min={-1} max={1} value={form.confidenceImpact} onChange={e => onFormChange(f => ({ ...f, confidenceImpact: +e.target.value }))} className="bg-surface-2" />
            </div>
          </div>

          {/* Conditions — Visual / JSON toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground">Conditions</Label>
              <div className="flex items-center rounded-lg border border-border bg-surface-2 p-0.5">
                <button
                  type="button"
                  onClick={() => setMode('visual')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-caption font-medium transition-all ${
                    mode === 'visual'
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <GitBranch className="w-3 h-3" /> Visual
                </button>
                <button
                  type="button"
                  onClick={() => setMode('json')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-caption font-medium transition-all ${
                    mode === 'json'
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Code className="w-3 h-3" /> JSON
                </button>
              </div>
            </div>

            {mode === 'visual' ? (
              <ConditionTreeBuilder
                value={conditionTree}
                onChange={handleTreeChange}
              />
            ) : (
              <>
                <Textarea
                  value={form.conditions}
                  onChange={e => onFormChange(f => ({ ...f, conditions: e.target.value }))}
                  className="bg-surface-2 font-mono text-body-sm"
                  rows={5}
                  placeholder='{"all": [{"fact": "amount", "operator": "greaterThan", "value": 25000}]}'
                />
                {conditionsInvalid && <p className="text-caption text-destructive">Invalid JSON</p>}
              </>
            )}
          </div>

          {/* Output */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Output (JSON)</Label>
            <Textarea value={form.output} onChange={e => onFormChange(f => ({ ...f, output: e.target.value }))} className="bg-surface-2 font-mono text-body-sm" rows={2} placeholder='{"decision": "flag", "evidence": "POLICY-001"}' />
            {outputInvalid && <p className="text-caption text-destructive">Invalid JSON</p>}
          </div>

          {/* Explanation Template */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Explanation Template</Label>
            <Textarea value={form.explanationTemplate} onChange={e => onFormChange(f => ({ ...f, explanationTemplate: e.target.value }))} className="bg-surface-2" rows={2} />
          </div>

          {/* Enabled */}
          <div className="flex items-center gap-2">
            <Switch checked={form.enabled} onCheckedChange={v => onFormChange(f => ({ ...f, enabled: v }))} />
            <Label className="text-muted-foreground">Enabled</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="hero" onClick={onSave} disabled={disabled}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
