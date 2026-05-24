import { cn } from '@/lib/utils';
import {
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Code2,
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

function LeafView({ cond }: { cond: RawCondition }) {
  const op = OP_LABELS[cond.operator ?? 'equals'] ?? cond.operator ?? 'equals';
  const missingFact = !cond.fact;
  const missingValue = cond.operator !== 'exists' && cond.value === undefined;

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2',
        missingFact || missingValue
          ? 'bg-warning/5 border-warning/20'
          : 'bg-surface-2 border-border/50',
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {missingFact || missingValue ? (
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
            {missingValue ? 'missing_value' : stringify(cond.value)}
          </code>
        )}
      </div>

      {(missingFact || missingValue) && (
        <p className="mt-1 text-caption text-warning">
          {missingFact ? 'Fact key is missing. ' : ''}
          {missingValue ? 'Comparison value is missing.' : ''}
        </p>
      )}
    </div>
  );
}

function GroupView({ cond, depth }: { cond: RawCondition; depth: number }) {
  const type = cond.all ? 'all' : 'any';
  const children = cond.all ?? cond.any ?? [];

  if (children.length === 0 && !cond.fact) {
    return (
      <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-caption text-warning">
        Empty condition group
      </div>
    );
  }

  if (!cond.all && !cond.any && cond.fact) {
    return <LeafView cond={cond} />;
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
        </div>

        <span className="text-caption text-muted-foreground">
          {children.length} condition{children.length !== 1 ? 's' : ''}
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
    const parsed = JSON.parse(conditions);
    return <GroupView cond={parsed} depth={0} />;
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