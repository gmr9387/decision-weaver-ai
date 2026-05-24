import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Copy,
  Pencil,
  Shield,
  Trash2,
  TrendingUp,
  Clock,
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

export function RuleDetailPanel({
  rule,
  onEdit,
  onDuplicate,
  onDelete,
}: RuleDetailPanelProps) {
  if (!rule) {
    return (
      <div className="flex-1 flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-body-md">Select a rule to inspect</p>
        </div>
      </div>
    );
  }

  const confidenceClass =
    rule.confidenceImpact >= 0
      ? 'text-success'
      : 'text-destructive';

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 lg:p-8 space-y-6">

        {/* Header */}

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-display-sm text-foreground">
                {rule.name}
              </h2>

              <Badge
                variant={typeColors[rule.type] as any}
                className="capitalize"
              >
                {rule.type.replace('_', ' ')}
              </Badge>

              {!rule.enabled && (
                <Badge variant="secondary">
                  Disabled
                </Badge>
              )}
            </div>

            <p className="text-body-sm text-muted-foreground">
              {rule.description}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onDuplicate(rule)}
            >
              <Copy className="w-3 h-3" />
              Duplicate
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onEdit(rule)}
            >
              <Pencil className="w-3 h-3" />
              Edit
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => onDelete(rule.id)}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
          </div>
        </div>

        {/* Metrics */}

        <div className="grid md:grid-cols-4 gap-4">

          <div className="rounded-xl border border-border bg-gradient-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-caption text-muted-foreground">
                Hit Count
              </span>
            </div>
            <div className="text-xl font-semibold text-foreground">
              {rule.hitCount}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-caption text-muted-foreground">
                Confidence
              </span>
            </div>
            <div className={`text-xl font-semibold ${confidenceClass}`}>
              {rule.confidenceImpact >= 0 ? '+' : ''}
              {rule.confidenceImpact}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-caption text-muted-foreground">
                Priority
              </span>
            </div>
            <div className="text-xl font-semibold text-foreground">
              {rule.priority}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-caption text-muted-foreground">
                Version
              </span>
            </div>
            <div className="text-xl font-semibold text-foreground">
              v{rule.version}
            </div>
          </div>

        </div>

        {/* Main */}

        <div className="grid lg:grid-cols-2 gap-6">

          {/* Left */}

          <div className="space-y-4">

            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <h3 className="text-body-md font-semibold text-foreground mb-4">
                Rule Metadata
              </h3>

              <dl className="space-y-3 text-body-sm">
                {[
                  ['Category', rule.category],
                  ['Priority', String(rule.priority)],
                  ['Version', `v${rule.version}`],
                  ['Status', rule.enabled ? 'Enabled' : 'Disabled'],
                  ['Last Modified', rule.lastModified],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between"
                  >
                    <dt className="text-muted-foreground">
                      {label}
                    </dt>

                    <dd className="text-foreground font-medium">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <h3 className="text-body-md font-semibold text-foreground mb-4">
                Output
              </h3>

              <pre className="rounded-lg bg-surface-2 p-3 overflow-auto text-caption font-mono text-foreground whitespace-pre-wrap">
                {rule.output}
              </pre>
            </div>

          </div>

          {/* Right */}

          <div className="space-y-4">

            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <h3 className="text-body-md font-semibold text-foreground mb-4">
                Conditions
              </h3>

              <ConditionTreeView
                conditions={rule.conditions}
              />
            </div>

            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <h3 className="text-body-md font-semibold text-foreground mb-4">
                Explanation Template
              </h3>

              <div className="rounded-lg bg-surface-2 p-4 text-body-sm text-muted-foreground italic">
                {rule.explanationTemplate || 'No explanation template'}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}