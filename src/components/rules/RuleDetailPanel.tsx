import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Pencil, Shield, Trash2 } from 'lucide-react';
import type { Rule } from '@/lib/types';
import { typeColors } from './RuleListPanel';

interface RuleDetailPanelProps {
  rule: Rule | null;
  onEdit: (rule: Rule) => void;
  onDuplicate: (rule: Rule) => void;
  onDelete: (id: string) => void;
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

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-display-sm text-foreground">{rule.name}</h2>
              <Badge variant={typeColors[rule.type] as any} className="capitalize">{rule.type.replace('_', ' ')}</Badge>
            </div>
            <p className="text-body-sm text-muted-foreground">{rule.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onDuplicate(rule)}>
              <Copy className="w-3 h-3" /> Duplicate
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(rule)}>
              <Pencil className="w-3 h-3" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => onDelete(rule.id)}>
              <Trash2 className="w-3 h-3" /> Delete
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4">Rule Configuration</h3>
            <dl className="space-y-3 text-body-sm">
              {[
                ['Rule ID', rule.id.slice(0, 8) + '…'],
                ['Category', rule.category],
                ['Priority', rule.priority.toString()],
                ['Version', `v${rule.version}`],
                ['Last Modified', rule.lastModified],
                ['Confidence Impact', `${rule.confidenceImpact >= 0 ? '+' : ''}${rule.confidenceImpact}`],
                ['Status', rule.enabled ? 'Enabled' : 'Disabled'],
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
              <div className="p-3 rounded-lg bg-surface-2 font-mono text-body-sm text-primary">{rule.conditions}</div>
            </div>
            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <h3 className="text-body-md font-semibold text-foreground mb-3">Output</h3>
              <div className="p-3 rounded-lg bg-surface-2 font-mono text-body-sm text-foreground">{rule.output}</div>
            </div>
            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <h3 className="text-body-md font-semibold text-foreground mb-3">Explanation Template</h3>
              <div className="p-3 rounded-lg bg-surface-2 text-body-sm text-muted-foreground italic">{rule.explanationTemplate}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
