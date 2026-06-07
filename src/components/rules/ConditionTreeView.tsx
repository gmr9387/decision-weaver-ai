import { cn } from '@/lib/utils';
import {
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Code2,
  ListChecks,
} from 'lucide-react';

interface RawCondition {
  fact?: string;
  operator?: string;
  value?: unknown;
  all?: RawCondition[];
  any?: RawCondition[];
}

const OP_LABELS: Record<string, string> = {
  equals: '=',
  equal: '=',
  notEquals: '≠',
  notEqual: '≠',
  greaterThan: '>',
  greaterThanOrEqual: '≥',
  greaterThanInclusive: '≥',
  lessThan: '<',
  lessThanOrEqual: '≤',
  lessThanInclusive: '≤',
  contains: 'contains',
  in: 'in',
  exists: 'exists',
};

function stringify(value: unknown) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function countLeaves(cond: RawCondition): number {
  if (cond.all) return cond.all.reduce((sum, child) => sum + countLeaves(child), 0);
  if (cond.any) return cond.any.reduce((sum, child) => sum + countLeaves(child), 0);
  return 1;
}

function countGroups(cond: RawCondition): number {
  if (cond.all) return 1 + cond.all.reduce((sum, child) => sum + countGroups(child), 0);
  if (cond.any) return 1 + cond.any.reduce((sum, child) => sum + countGroups(child), 0);
  return 0;
}

function validateLeaf(cond: RawCondition): string | null {
  if (!cond.fact) return 'Fact key is missing.';
  if (!cond.operator) return 'Operator is missing.';
  if (cond.operator !== 'exists' && cond.value === undefined) return 'Comparison value is missing.';

  if (cond.operator === 'in' && !Array.isArray(cond.value)) {
    return 'Expected list/array value for "in" operator.';
  }

  return null;
}

function LeafView({ cond }: { cond: RawCondition }) {
  const op = OP_LABELS[cond.operator ?? 'equals'] ?? cond.operator ?? 'equals';
  const issue = validateLeaf(cond);

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2',
        issue
          ? 'bg-warning/5 border-warning/20'
          : 'bg-surface-2 border-border/50',
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {issue ? (
          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
        )}

        <code className="text-primary text-body-sm font-mono">
          {cond.fact || 'missing_fact'}
        </code>

        <span className="text-muted-foreground text-caption font-semibold">
          {op}
        </span>

        {cond.operator !== 'exists' && (
          <code className="text-foreground text-body-sm font-mono">
            {cond.value === undefined ? 'missing_value' : stringify(cond.value)}
          </code>
        )}
      </div>

      {issue && (
        <p className="mt-1 text-caption text-warning">
          {issue}
        </p>
      )}
    </div>
  );
}

function GroupView({ cond, depth }: { cond: RawCondition; depth: number }) {
  const type = cond.all ? 'all' : 'any';
  const children = cond.all ?? cond.any ?? [];

  if (!cond.all && !cond.any) {
    return <LeafView cond={cond} />;
  }

  if (children.length === 0) {
    return (
      <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-caption text-warning">
        Empty {type === 'all' ? 'AND' : 'OR'} group
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-3',
        type === 'all' ? 'border-primary/30' : 'border-accent/30',
        depth === 0 ? 'bg-surface-1' : 'bg-surface-2/30',
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5">
          <GitBranch
            className={cn(
              'w-3.5 h-3.5',
              type === 'all' ? 'text-primary' : 'text-accent',
            )}
          />
          <span
            className={cn(
              'text-caption font-bold uppercase',
              type === 'all' ? 'text-primary' : 'text-accent',
            )}
          >
            {type === 'all' ? 'AND' : 'OR'}
          </span>

          <span className="text-caption text-muted-foreground">
            {type === 'all' ? 'all must match' : 'any can match'}
          </span>
        </div>

        <span className="text-caption text-muted-foreground">
          {children.length} node{children.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-1.5">
        {children.map((child, index) => (
          <div key={index}>
            {index > 0 && (
              <div className="flex items-center gap-2 py-0.5 pl-2">
                <div className="h-px flex-1 bg-border/40" />
                <span
                  className={cn(
                    'text-[10px] font-semibold',
                    type === 'all' ? 'text-primary/40' : 'text-accent/40',
                  )}
                >
                  {type === 'all' ? 'AND' : 'OR'}
                </span>
                <div className="h-px flex-1 bg-border/40" />
              </div>
            )}

            {child.all || child.any ? (
              <GroupView cond={child} depth={depth + 1} />
            ) : (
              <LeafView cond={child} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConditionTreeView({ conditions }: { conditions: string }) {
  try {
    const parsed = JSON.parse(conditions) as RawCondition;
    const leaves = countLeaves(parsed);
    const groups = countGroups(parsed);

    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              <div>
                <p className="text-body-sm font-semibold text-foreground">
                  Condition Tree
                </p>
                <p className="text-caption text-muted-foreground">
                  Read-only view of the rule logic used by the engine.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <span className="rounded-md bg-background/50 px-2 py-1 text-caption text-muted-foreground">
                {leaves} condition{leaves !== 1 ? 's' : ''}
              </span>
              <span className="rounded-md bg-background/50 px-2 py-1 text-caption text-muted-foreground">
                {groups} group{groups !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <GroupView cond={parsed} depth={0} />
      </div>
    );
  } catch {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Code2 className="w-4 h-4 text-destructive" />
          <span className="text-body-sm font-semibold text-destructive">
            Invalid condition JSON
          </span>
        </div>
        <div className="rounded bg-surface-2 p-3 font-mono text-body-sm text-muted-foreground break-all">
          {conditions}
        </div>
      </div>
    );
  }
}