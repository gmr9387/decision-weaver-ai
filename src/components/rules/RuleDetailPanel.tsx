import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  Copy,
  Pencil,
  Shield,
  Trash2,
  TrendingUp,
  Clock,
  Activity,
  History,
  Loader2,
  AlertTriangle,
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

type RuleVersionRow = {
  id: string;
  rule_id: string;
  version: number;
  name: string;
  description: string | null;
  category: string;
  rule_type: string;
  priority: number;
  enabled: boolean;
  conditions: unknown;
  output: unknown;
  confidence_impact: number | null;
  explanation_template: string | null;
  created_by: string | null;
  created_at: string;
};

function RuleVersionHistory({ ruleId }: { ruleId: string }) {
  const {
    data: versions = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['rule-versions', ruleId],
    queryFn: async (): Promise<RuleVersionRow[]> => {
      const { data, error: queryError } = await supabase
        .from('rule_versions' as any)
        .select(
          'id, rule_id, version, name, description, category, rule_type, priority, enabled, conditions, output, confidence_impact, explanation_template, created_by, created_at',
        )
        .eq('rule_id', ruleId)
        .order('version', { ascending: false });

      if (queryError) {
        throw new Error(queryError.message);
      }

      return (data || []) as unknown as RuleVersionRow[];
    },
    enabled: !!ruleId,
    staleTime: 30000,
  });

  return (
    <div className="rounded-xl border border-border bg-gradient-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-primary" />
        <h3 className="text-body-md font-semibold text-foreground">
          Version History
        </h3>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading version history...
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-body-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {(error as Error)?.message || 'Could not load version history.'}
          </div>
        </div>
      )}

      {!isLoading && !isError && versions.length === 0 && (
        <p className="text-body-sm text-muted-foreground">
          No version snapshots found yet. Apply the rule versioning migration to populate this history.
        </p>
      )}

      {!isLoading && !isError && versions.length > 0 && (
        <div className="space-y-3">
          {versions.map((version) => (
            <div
              key={version.id}
              className="rounded-lg border border-border bg-surface-2 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">v{version.version}</Badge>
                    <span className="text-body-sm font-medium text-foreground">
                      {version.name}
                    </span>
                    {!version.enabled && (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </div>

                  <p className="mt-1 text-caption text-muted-foreground">
                    {new Date(version.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="text-right text-caption text-muted-foreground">
                  <div>{version.category}</div>
                  <div>Priority {version.priority}</div>
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2 text-caption">
                <div className="rounded-md bg-background/50 p-2">
                  <span className="text-muted-foreground">Created by</span>
                  <div className="font-mono text-foreground truncate">
                    {version.created_by || 'System'}
                  </div>
                </div>

                <div className="rounded-md bg-background/50 p-2">
                  <span className="text-muted-foreground">Confidence Impact</span>
                  <div className="font-mono text-foreground">
                    {Number(version.confidence_impact || 0) >= 0 ? '+' : ''}
                    {Number(version.confidence_impact || 0)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

        <div className="grid lg:grid-cols-2 gap-6">
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

            <RuleVersionHistory ruleId={rule.id} />
          </div>

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