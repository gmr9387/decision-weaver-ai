import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RotateCcw, SlidersHorizontal, FileSearch, AlertTriangle } from 'lucide-react';
import type { Case } from '@/lib/types';

interface FactsEditorProps {
  activeCase: Case;
  casesWithFacts: Case[];
  factOverrides: Record<string, string>;
  onSelectCase: (id: string) => void;
  onOverride: (key: string, value: string) => void;
}

function stringify(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function FactsEditor({
  activeCase,
  casesWithFacts,
  factOverrides,
  onSelectCase,
  onOverride,
}: FactsEditorProps) {
  const overrideCount = Object.keys(factOverrides).length;
  const verifiedCount = activeCase.facts.filter((f) => f.quality === 'verified').length;
  const missingCount = activeCase.facts.filter((f) => f.quality === 'missing').length;

  const resetOverrides = () => {
    for (const key of Object.keys(factOverrides)) {
      onOverride(key, '');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-gradient-card p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-body-md font-semibold text-foreground flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            Scenario Fact Editor
          </h3>
          <p className="text-caption text-muted-foreground mt-1">
            Modify case facts locally to test decision drift without changing the source case.
          </p>
        </div>

        <Select value={activeCase.id} onValueChange={onSelectCase}>
          <SelectTrigger className="w-56 h-8 bg-surface-2 border-border text-body-sm">
            <SelectValue placeholder="Select case" />
          </SelectTrigger>
          <SelectContent>
            {casesWithFacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.caseNumber} — {c.category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Facts</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{activeCase.facts.length}</p>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Verified</p>
          <p className="mt-1 text-xl font-semibold text-success">{verifiedCount}</p>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Overrides</p>
          <p className="mt-1 text-xl font-semibold text-warning">{overrideCount}</p>
        </div>
      </div>

      {overrideCount > 0 && (
        <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <p className="text-caption text-muted-foreground">
              This scenario has {overrideCount} modified fact{overrideCount !== 1 ? 's' : ''}.
            </p>
          </div>

          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={resetOverrides}>
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
        </div>
      )}

      {activeCase.facts.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-2 p-5">
          <p className="text-body-sm text-muted-foreground italic">
            No facts attached to this case. Add facts via the Cases page first.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
          {activeCase.facts.map((fact) => {
            const originalValue = stringify(fact.value);
            const hasOverride = factOverrides[fact.key] !== undefined;
            const currentValue = hasOverride ? factOverrides[fact.key] : originalValue;

            return (
              <div
                key={fact.key}
                className={`rounded-lg border p-3 ${
                  hasOverride
                    ? 'border-warning/30 bg-warning/5'
                    : 'border-border bg-surface-2'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-44 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-body-sm font-mono text-foreground truncate">
                        {fact.key}
                      </span>
                      {fact.derived && (
                        <Badge variant="info" className="text-[10px]">
                          derived
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={
                          fact.quality === 'verified'
                            ? 'success'
                            : fact.quality === 'inferred'
                              ? 'info'
                              : fact.quality === 'missing'
                                ? 'warning'
                                : 'secondary'
                        }
                        className="capitalize text-[10px]"
                      >
                        {fact.quality}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {fact.source || 'Unknown source'}
                      </span>
                    </div>
                  </div>

                  <Input
                    className="bg-surface-3 border-border text-body-sm h-8"
                    value={currentValue}
                    onChange={(e) =>
                      onOverride(
                        fact.key,
                        e.target.value !== originalValue ? e.target.value : '',
                      )
                    }
                  />

                  {hasOverride ? (
                    <Badge variant="warning" className="text-caption shrink-0">
                      Modified
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-caption shrink-0">
                      Baseline
                    </Badge>
                  )}
                </div>

                {hasOverride && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-caption">
                    <div className="rounded bg-background/40 p-2">
                      <span className="text-muted-foreground">Original: </span>
                      <span className="font-mono text-foreground">{originalValue || 'empty'}</span>
                    </div>
                    <div className="rounded bg-background/40 p-2">
                      <span className="text-muted-foreground">Scenario: </span>
                      <span className="font-mono text-warning">{currentValue || 'empty'}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
        <FileSearch className="w-4 h-4 text-primary mt-0.5" />
        <p className="text-caption text-muted-foreground">
          Scenario edits are temporary. They are sent to the inference engine with
          <span className="font-mono text-foreground"> persist: false </span>
          so the original case record stays clean.
        </p>
      </div>

      {missingCount > 0 && (
        <p className="text-caption text-warning">
          This case contains {missingCount} fact marker{missingCount !== 1 ? 's' : ''} marked missing.
        </p>
      )}
    </div>
  );
}