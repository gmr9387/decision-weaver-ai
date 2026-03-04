import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Shield, Zap, GitBranch, Route, MessageSquare } from 'lucide-react';
import type { Rule, RuleType } from '@/lib/types';

const typeIcons: Record<RuleType, any> = {
  deterministic: Shield, heuristic: Zap, derived_fact: GitBranch, routing: Route, explainability: MessageSquare,
};

const typeColors: Record<RuleType, string> = {
  deterministic: 'default', heuristic: 'info', derived_fact: 'warning', routing: 'success', explainability: 'secondary',
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

export function RuleListPanel({ rules, search, selectedRuleId, onSearchChange, onSelectRule, onCreateClick, onToggleRule }: RuleListPanelProps) {
  const filtered = rules.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-96 border-r border-border flex flex-col bg-surface-1">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-display-sm text-foreground">Rules Studio</h1>
          <Button size="sm" className="gap-1.5" onClick={onCreateClick}><Plus className="w-3 h-3" /> Add</Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search rules..." value={search} onChange={e => onSearchChange(e.target.value)} className="pl-9 bg-surface-2" />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {filtered.map(rule => {
          const Icon = typeIcons[rule.type];
          return (
            <button
              key={rule.id}
              onClick={() => onSelectRule(rule.id)}
              className={`w-full text-left p-4 border-b border-border/50 hover:bg-surface-hover transition-colors ${selectedRuleId === rule.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-body-sm font-medium text-foreground">{rule.name}</span>
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(v) => onToggleRule(rule.id, v)}
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
  );
}

export { typeColors };
