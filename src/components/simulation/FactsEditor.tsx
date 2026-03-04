import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { Case } from '@/lib/types';

interface FactsEditorProps {
  activeCase: Case;
  casesWithFacts: Case[];
  factOverrides: Record<string, string>;
  onSelectCase: (id: string) => void;
  onOverride: (key: string, value: string) => void;
}

export function FactsEditor({ activeCase, casesWithFacts, factOverrides, onSelectCase, onOverride }: FactsEditorProps) {
  return (
    <div className="rounded-xl border border-border bg-gradient-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-body-md font-semibold text-foreground">Simulate Case</h3>
        <Select value={activeCase.id} onValueChange={onSelectCase}>
          <SelectTrigger className="w-48 h-8 bg-surface-2 border-border text-body-sm">
            <SelectValue placeholder="Select case" />
          </SelectTrigger>
          <SelectContent>
            {casesWithFacts.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.caseNumber} — {c.category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-caption text-muted-foreground mb-4">Modify values to simulate different outcomes</p>
      {activeCase.facts.length === 0 ? (
        <p className="text-body-sm text-muted-foreground italic">
          No facts attached to this case. Add facts via the Cases page first.
        </p>
      ) : (
        <div className="space-y-2">
          {activeCase.facts.map(fact => (
            <div key={fact.key} className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
              <span className="text-body-sm font-mono text-muted-foreground w-40 shrink-0">{fact.key}</span>
              <Input
                className="bg-surface-3 border-border text-body-sm h-8"
                defaultValue={String(fact.value)}
                onChange={e => onOverride(fact.key, e.target.value !== String(fact.value) ? e.target.value : '')}
              />
              {factOverrides[fact.key] && (
                <Badge variant="warning" className="text-caption shrink-0">Modified</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
