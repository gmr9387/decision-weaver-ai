import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Copy,
  Pencil,
  Shield,
  Trash2,
  GitBranch,
  Zap,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Activity,
} from 'lucide-react';
import type { Rule } from '@/lib/types';
import { typeColors } from './RuleListPanel';
import { ConditionTreeView } from './ConditionTreeView';

interface RuleDetailPanelProps {
  rule: Rule | null;
  onEdit: (rule: Rule) => void;
  onDuplicate: (rule: Rule) => void;
  onDelete: (id: string) => void;
}

function stringify(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getDecisionFromOutput(output: unknown) {
  const raw = typeof output === 'string'
    ? (() => {
        try {
          return JSON.parse(output);
        } catch {
          return null;
        }
      })()
    : output;

  if (!raw || typeof raw !== 'object') return 'unknown';
  return (raw as any).decision || (raw as any).action || 'unknown';
}

export function RuleDetailPanel({ rule, onEdit, onDuplicate, onDelete }: RuleDetailPanelProps) {
  if (!rule) {
    return (
      <div className="flex-1 flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-body-md">Select a rule to view details</p>
        </div>
      </div>
    );
  }

  const confidenceImpact = Number(rule.confidenceImpact ?? 0);
  const decision = getDecisionFromOutput(rule.output);
  const strength =
    confidenceImpact >= 15
      ? 'Strong Positive'
      : confidenceImpact >= 5
        ? 'Positive'
        : confidenceImpact <= -15
          ? 'Strong Negative'
          : confidenceImpact < 0
            ? 'Negative'
            : 'Neutral';

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-display-sm text-foreground">{rule.name}</h2>
              <Badge variant={typeColors[rule.type] as any} className="capitalize">
                {rule.type.replace('_', ' ')}
              </Badge>
              <Badge variant={rule.enabled ? 'success' : 'secondary'}>
                {rule.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <p className="text-body-sm text-muted-foreground max-w-3xl">{rule.description}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onDuplicate(rule)}>
              <Copy className="w-3 h-3" /> Duplicate
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(rule)}>
              <Pencil className="w-3 h-3" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => onDelete(rule.id)}
            >
              <Trash2 className="w-3 h-3" /> Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-gradient-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-caption text-muted-foreground">Confidence Impact</span>
            </div>
            <div className={`text-2xl font-semibold font-mono ${confidenceImpact >= 0 ? 'text-success' : 'text-destructive'}`}>
              {confidenceImpact >= 0 ? '+' : ''}
              {confidenceImpact}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-4 h-4 text-primary" />
              <span className="text-caption text-muted-foreground">Decision Output</span>
            </div>
            <div className="text-2xl font-semibold text-foreground capitalize">
              {String(decision).replace('_', ' ')}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-caption text-muted-foreground">Hit Count</span>
            </div>
            <div className="text-2xl font-semibold text-foreground">
              {(rule as any).hitCount ?? 0}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-5">
            <div className="flex items-center gap-2 mb-2">
              {confidenceImpact >= 0 ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-warning" />
              )}
              <span className="text-caption text-muted-foreground">Rule Strength</span>
            </div>
            <div className="text-lg font-semibold text-foreground">
              {strength}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Rule Configuration
            </h3>
            <dl className="space-y-3 text-body-sm">
              {[
                ['Rule ID', `${rule.id.slice(0, 8)}…`],
                ['Category', rule.category],
                ['Priority', rule.priority.toString()],
                ['Version', `v${rule.version}`],
                ['Last Modified', rule.lastModified],
                ['Status', rule.enabled ? 'Enabled' : 'Disabled'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-foreground font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Business Explanation
            </h3>
            <p className="text-body-sm text-muted-foreground leading-relaxed">
              {rule.explanationTemplate || 'No explanation template configured.'}
            </p>

            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-caption text-muted-foreground">
                This explanation is used when the rule fires so analysts can understand the business reason behind the decision.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-3 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" /> Condition Tree
            </h3>
            <ConditionTreeView conditions={rule.conditions} />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <h3 className="text-body-md font-semibold text-foreground mb-3">Output Contract</h3>
              <pre className="p-3 rounded-lg bg-surface-2 font-mono text-caption text-foreground overflow-auto max-h-48">
                {stringify(rule.output)}
              </pre>
            </div>

            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <h3 className="text-body-md font-semibold text-foreground mb-3">Rule Governance Notes</h3>
              <div className="space-y-2 text-body-sm text-muted-foreground">
                <p>Priority determines which decision signals carry the most weight.</p>
                <p>Confidence impact contributes to the decision confidence model.</p>
                <p>Disabled rules do not participate in inference runs.</p>
                <p>Duplicated rules are created disabled so they can be reviewed before activation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}