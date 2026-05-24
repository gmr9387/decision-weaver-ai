import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  Code,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type { RuleType } from '@/lib/types';
import {
  ConditionTreeBuilder,
  fromJson,
  toJson,
  type ConditionNode,
} from './ConditionTreeBuilder';

const RULE_TYPES: RuleType[] = [
  'deterministic',
  'heuristic',
  'derived_fact',
  'routing',
  'explainability',
];

const VALID_DECISIONS = [
  'approve',
  'deny',
  'escalate',
  'review',
  'flag',
  'request_info',
  'unresolved',
];

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
  name: '',
  description: '',
  category: 'General',
  type: 'deterministic',
  priority: 5,
  enabled: true,
  conditions: JSON.stringify(
    {
      all: [
        {
          fact: '',
          operator: 'equals',
          value: '',
        },
      ],
    },
    null,
    2,
  ),
  output: JSON.stringify(
    {
      decision: 'review',
      evidence: '',
    },
    null,
    2,
  ),
  confidenceImpact: 0,
  explanationTemplate: '',
};

function parseJson<T>(value: string, fallback: T): { ok: boolean; value: T; error?: string } {
  try {
    return { ok: true, value: JSON.parse(value) as T };
  } catch (err) {
    return {
      ok: false,
      value: fallback,
      error: err instanceof Error ? err.message : 'Invalid JSON',
    };
  }
}

function safeParseConditions(value: string): ConditionNode {
  const parsed = parseJson(value, null);
  if (!parsed.ok) return fromJson(null);
  return fromJson(parsed.value);
}

function validateOutput(outputJson: string): string[] {
  const errors: string[] = [];
  const parsed = parseJson<Record<string, any>>(outputJson, {});

  if (!parsed.ok) {
    errors.push('Output must be valid JSON.');
    return errors;
  }

  const output = parsed.value;
  const decision = output.decision || output.action;

  if (!decision) {
    errors.push('Output should include a decision or action.');
  } else if (!VALID_DECISIONS.includes(String(decision))) {
    errors.push(`Decision "${decision}" is not in the supported decision set.`);
  }

  return errors;
}

function collectConditionIssues(node: ConditionNode, issues: string[] = []): string[] {
  if (node.kind === 'group') {
    if (!node.data.children.length) {
      issues.push('A condition group cannot be empty.');
    }

    node.data.children.forEach((child) => collectConditionIssues(child, issues));
    return issues;
  }

  if (!node.data.fact.trim()) {
    issues.push('At least one condition is missing a fact key.');
  }

  if (!node.data.operator.trim()) {
    issues.push('At least one condition is missing an operator.');
  }

  if (node.data.operator !== 'exists' && String(node.data.value ?? '').trim() === '') {
    issues.push('At least one condition is missing a comparison value.');
  }

  return issues;
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

export function RuleFormDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  isEditing,
  isPending,
  onSave,
}: RuleFormDialogProps) {
  const [mode, setMode] = useState<'visual' | 'json'>('visual');

  const conditionsParsed = parseJson(form.conditions, null);
  const conditionTree = safeParseConditions(form.conditions);
  const conditionIssues = useMemo(() => collectConditionIssues(conditionTree), [conditionTree]);
  const outputIssues = useMemo(() => validateOutput(form.output), [form.output]);

  const priorityWarning =
    form.priority < 1 || form.priority > 10
      ? 'Priority should be between 1 and 10.'
      : null;

  const impactWarning =
    form.confidenceImpact < -25 || form.confidenceImpact > 25
      ? 'Confidence impact should stay between -25 and 25.'
      : null;

  const governanceIssues = [
    !form.name.trim() ? 'Rule name is required.' : null,
    !form.category.trim() ? 'Category is required.' : null,
    !form.description.trim() ? 'Description is recommended for governance.' : null,
    !form.explanationTemplate.trim() ? 'Explanation template is required for auditability.' : null,
    mode === 'json' && !conditionsParsed.ok ? 'Conditions must be valid JSON.' : null,
    priorityWarning,
    impactWarning,
    ...conditionIssues,
    ...outputIssues,
  ].filter(Boolean) as string[];

  const blockingIssues = governanceIssues.filter(
    (issue) =>
      !issue.includes('recommended') &&
      !issue.includes('should stay'),
  );

  const disabled = isPending || blockingIssues.length > 0;

  const handleTreeChange = (node: ConditionNode) => {
    const json = JSON.stringify(toJson(node), null, 2);
    onFormChange((f) => ({ ...f, conditions: json }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            {isEditing ? 'Edit Rule' : 'Create Rule'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[68vh] overflow-auto pr-2">
          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-2">
              {blockingIssues.length === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-warning" />
              )}
              <h3 className="text-body-sm font-semibold text-foreground">
                Rule Governance Check
              </h3>
            </div>

            {governanceIssues.length > 0 ? (
              <div className="space-y-1">
                {governanceIssues.slice(0, 6).map((issue) => (
                  <p key={issue} className="text-caption text-muted-foreground">
                    • {issue}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-caption text-success">
                Rule passes basic governance checks.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => onFormChange((f) => ({ ...f, name: e.target.value }))}
              className="bg-surface-2"
              placeholder="e.g. High Dollar Claim Escalation"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => onFormChange((f) => ({ ...f, description: e.target.value }))}
              className="bg-surface-2"
              rows={2}
              placeholder="Describe the business purpose of this rule."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Category</Label>
              <Input
                value={form.category}
                onChange={(e) => onFormChange((f) => ({ ...f, category: e.target.value }))}
                className="bg-surface-2"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Type</Label>
              <select
                value={form.type}
                onChange={(e) => onFormChange((f) => ({ ...f, type: e.target.value as RuleType }))}
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-body-sm text-foreground"
              >
                {RULE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Priority</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.priority}
                onChange={(e) => onFormChange((f) => ({ ...f, priority: Number(e.target.value) }))}
                className="bg-surface-2"
              />
              <p className="text-caption text-muted-foreground">
                1 = strongest, 10 = weakest
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Confidence Impact</Label>
              <Input
                type="number"
                step={1}
                min={-25}
                max={25}
                value={form.confidenceImpact}
                onChange={(e) =>
                  onFormChange((f) => ({ ...f, confidenceImpact: Number(e.target.value) }))
                }
                className="bg-surface-2"
              />
              <p className="text-caption text-muted-foreground">
                Recommended range: -25 to +25
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Status</Label>
              <div className="h-10 px-3 rounded-md border border-border bg-surface-2 flex items-center justify-between">
                <span className="text-body-sm text-foreground">
                  {form.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(v) => onFormChange((f) => ({ ...f, enabled: v }))}
                />
              </div>
              <p className="text-caption text-muted-foreground">
                Disabled rules do not run.
              </p>
            </div>
          </div>

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
              <ConditionTreeBuilder value={conditionTree} onChange={handleTreeChange} />
            ) : (
              <>
                <Textarea
                  value={form.conditions}
                  onChange={(e) => onFormChange((f) => ({ ...f, conditions: e.target.value }))}
                  className="bg-surface-2 font-mono text-body-sm"
                  rows={7}
                  placeholder='{"all": [{"fact": "amount", "operator": "greaterThan", "value": 25000}]}'
                />
                {!conditionsParsed.ok && (
                  <p className="text-caption text-destructive">{conditionsParsed.error}</p>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Output Contract JSON</Label>
            <Textarea
              value={form.output}
              onChange={(e) => onFormChange((f) => ({ ...f, output: e.target.value }))}
              className="bg-surface-2 font-mono text-body-sm"
              rows={4}
              placeholder='{"decision": "flag", "evidence": "POLICY-001"}'
            />
            {outputIssues.length > 0 && (
              <div className="space-y-1">
                {outputIssues.map((issue) => (
                  <p key={issue} className="text-caption text-destructive">
                    {issue}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Explanation Template</Label>
            <Textarea
              value={form.explanationTemplate}
              onChange={(e) =>
                onFormChange((f) => ({ ...f, explanationTemplate: e.target.value }))
              }
              className="bg-surface-2"
              rows={3}
              placeholder="Explain why this rule fired. Use {{fact_key}} placeholders when useful."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="hero" onClick={onSave} disabled={disabled}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isEditing ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}