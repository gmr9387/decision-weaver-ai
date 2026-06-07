import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Search,
  Plus,
  Shield,
  Zap,
  GitBranch,
  Route,
  MessageSquare,
  BarChart3,
  History,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type { Rule, RuleType } from '@/lib/types';

const typeIcons: Record<RuleType, any> = {
  deterministic: Shield,
  heuristic: Zap,
  derived_fact: GitBranch,
  routing: Route,
  explainability: MessageSquare,
};

const typeColors: Record<RuleType, string> = {
  deterministic: 'default',
  heuristic: 'info',
  derived_fact: 'warning',
  routing: 'success',
  explainability: 'secondary',
};

interface RuleListPanelProps {
  rules: Rule[];
  search: string;
  selectedRuleId: string | null;
  onSearchChange: (v: string) => void;
  onSelectRule: (id: string) => void;
  onCreateClick: () => void;
  onToggleRule: (id: string, enabled: boolean) => void;
}

function getReadiness(rule: Rule) {
  if (!rule.enabled) {
    return {
      label: 'Inactive',
      variant: 'outline',
      icon: AlertTriangle,
      detail: 'Disabled',
    };
  }

  if (rule.version >= 1 && rule.explanationTemplate?.trim() && rule.hitCount > 0) {
    return {
      label: 'Strong',
      variant: 'success',
      icon: CheckCircle2,
      detail: 'Versioned + active',
    };
  }

  return {
    label: 'Watch',
    variant: 'warning',
    icon: AlertTriangle,
    detail: 'Needs traffic or metadata',
  };
}

export function RuleListPanel({
  rules,
  search,
  selectedRuleId,
  onSearchChange,
  onSelectRule,
  onCreateClick,
  onToggleRule,
}: RuleListPanelProps) {
  const filtered = rules.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase()) ||
      r.type.toLowerCase().includes(search.toLowerCase()),
  );

  const enabledCount = rules.filter((r) => r.enabled).length;
  const disabledCount = rules.length - enabledCount;
  const versionedCount = rules.filter((r) => Number(r.version || 0) >= 1).length;

  return (
    <div className="w-96 border-r border-border flex flex-col bg-surface-1">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-display-sm text-foreground">
            Rules Studio
          </h1>

          <Button
            size="sm"
            className="gap-1.5"
            onClick={onCreateClick}
          >
            <Plus className="w-3 h-3" />
            Add
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-lg bg-surface-2 p-2 text-center">
            <div className="text-lg font-semibold text-foreground">
              {rules.length}
            </div>
            <div className="text-caption text-muted-foreground">
              Total
            </div>
          </div>

          <div className="rounded-lg bg-success/10 p-2 text-center">
            <div className="text-lg font-semibold text-success">
              {enabledCount}
            </div>
            <div className="text-caption text-muted-foreground">
              Enabled
            </div>
          </div>

          <div className="rounded-lg bg-primary/10 p-2 text-center">
            <div className="text-lg font-semibold text-primary">
              {versionedCount}
            </div>
            <div className="text-caption text-muted-foreground">
              Versioned
            </div>
          </div>

          <div className="rounded-lg bg-warning/10 p-2 text-center">
            <div className="text-lg font-semibold text-warning">
              {disabledCount}
            </div>
            <div className="text-caption text-muted-foreground">
              Disabled
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

          <Input
            placeholder="Search rules..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-surface-2"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-body-sm text-muted-foreground">
            No rules match your search.
          </div>
        ) : (
          filtered.map((rule) => {
            const Icon = typeIcons[rule.type];
            const readiness = getReadiness(rule);
            const ReadinessIcon = readiness.icon;
            const hitScore = Math.min(100, Math.max(0, (rule.hitCount ?? 0) * 10));

            return (
              <button
                key={rule.id}
                onClick={() => onSelectRule(rule.id)}
                className={`w-full text-left p-4 border-b border-border/50 hover:bg-surface-hover transition-colors ${
                  selectedRuleId === rule.id
                    ? 'bg-primary/5 border-l-2 border-l-primary'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

                    <span className="text-body-sm font-medium text-foreground truncate">
                      {rule.name}
                    </span>
                  </div>

                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(v) =>
                      onToggleRule(rule.id, v)
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge
                    variant={typeColors[rule.type] as any}
                    className="text-caption capitalize"
                  >
                    {rule.type.replace('_', ' ')}
                  </Badge>

                  <Badge
                    variant={readiness.variant as any}
                    className="text-caption gap-1"
                  >
                    <ReadinessIcon className="w-3 h-3" />
                    {readiness.label}
                  </Badge>

                  <span className="text-caption text-muted-foreground">
                    {rule.category}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-caption">
                  <div className="rounded-md bg-surface-2 p-2">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <History className="w-3 h-3" />
                      Version
                    </div>

                    <div className="mt-1 font-mono text-foreground">
                      v{rule.version}
                    </div>
                  </div>

                  <div className="rounded-md bg-surface-2 p-2">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <BarChart3 className="w-3 h-3" />
                      Hits
                    </div>

                    <div className="mt-1 font-mono text-foreground">
                      {rule.hitCount ?? 0}
                    </div>
                  </div>

                  <div className="rounded-md bg-surface-2 p-2">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Shield className="w-3 h-3" />
                      Priority
                    </div>

                    <div className="mt-1 font-mono text-foreground">
                      P{rule.priority}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-caption text-muted-foreground">
                      Activity
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {readiness.detail}
                    </span>
                  </div>

                  <div className="w-full h-1 rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${hitScore}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export { typeColors };