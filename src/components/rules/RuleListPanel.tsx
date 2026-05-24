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
      r.category.toLowerCase().includes(search.toLowerCase()),
  );

  const enabledCount = rules.filter((r) => r.enabled).length;
  const disabledCount = rules.length - enabledCount;

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

        {/* Stats */}

        <div className="grid grid-cols-3 gap-2">
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

          <div className="rounded-lg bg-warning/10 p-2 text-center">
            <div className="text-lg font-semibold text-warning">
              {disabledCount}
            </div>
            <div className="text-caption text-muted-foreground">
              Disabled
            </div>
          </div>
        </div>

        {/* Search */}

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
        {filtered.map((rule) => {
          const Icon = typeIcons[rule.type];

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
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />

                  <span className="text-body-sm font-medium text-foreground">
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

                <span className="text-caption text-muted-foreground">
                  {rule.category}
                </span>

                <span className="text-caption text-muted-foreground ml-auto font-mono">
                  v{rule.version}
                </span>
              </div>

              <div className="flex items-center justify-between mt-3 text-caption">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <BarChart3 className="w-3 h-3" />
                  Hits
                </div>

                <span className="font-mono text-foreground">
                  {rule.hitCount ?? 0}
                </span>
              </div>

              <div className="mt-2">
                <div className="w-full h-1 rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.min(
                        100,
                        (rule.hitCount ?? 0) / 5,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { typeColors };