import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MOCK_RULES } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Copy, Pencil, Shield, Zap, GitBranch, Route, MessageSquare } from 'lucide-react';
import type { RuleType } from '@/lib/types';

const typeIcons: Record<RuleType, any> = {
  deterministic: Shield, heuristic: Zap, derived_fact: GitBranch, routing: Route, explainability: MessageSquare,
};

const typeColors: Record<RuleType, string> = {
  deterministic: 'default', heuristic: 'info', derived_fact: 'warning', routing: 'success', explainability: 'secondary',
};

export default function RulesStudio() {
  const [search, setSearch] = useState('');
  const [rules, setRules] = useState(MOCK_RULES);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);

  const filtered = rules.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase())
  );

  const selected = selectedRule ? rules.find(r => r.id === selectedRule) : null;

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Rule List */}
        <div className="w-96 border-r border-border flex flex-col bg-surface-1">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-display-sm text-foreground">Rules Studio</h1>
              <Button size="sm" className="gap-1.5"><Plus className="w-3 h-3" /> Add</Button>
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
                    <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} onClick={e => e.stopPropagation()} />
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
                  <Button variant="outline" size="sm" className="gap-1.5"><Copy className="w-3 h-3" /> Duplicate</Button>
                  <Button variant="outline" size="sm" className="gap-1.5"><Pencil className="w-3 h-3" /> Edit</Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-gradient-card p-6">
                  <h3 className="text-body-md font-semibold text-foreground mb-4">Rule Configuration</h3>
                  <dl className="space-y-3 text-body-sm">
                    {[
                      ['Rule ID', selected.id],
                      ['Category', selected.category],
                      ['Priority', selected.priority.toString()],
                      ['Version', `v${selected.version}`],
                      ['Last Modified', selected.lastModified],
                      ['Hit Count', selected.hitCount.toLocaleString()],
                      ['Confidence Impact', `${selected.confidenceImpact >= 0 ? '+' : ''}${(selected.confidenceImpact * 100).toFixed(0)}%`],
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
    </AppLayout>
  );
}
