import { cn } from '@/lib/utils';
import { GitBranch, ChevronRight } from 'lucide-react';

/**
 * Read-only visualization of a condition JSON tree.
 * Used in RuleDetailPanel to replace raw JSON display.
 */

interface RawCondition {
  fact?: string;
  operator?: string;
  value?: unknown;
  all?: RawCondition[];
  any?: RawCondition[];
}

const OP_LABELS: Record<string, string> = {
  equals: '=', equal: '=', notEquals: '≠', notEqual: '≠',
  greaterThan: '>', greaterThanOrEqual: '≥', greaterThanInclusive: '≥',
  lessThan: '<', lessThanOrEqual: '≤', lessThanInclusive: '≤',
  contains: 'contains', in: 'in', exists: 'exists',
};

function LeafView({ cond }: { cond: RawCondition }) {
  const op = OP_LABELS[cond.operator ?? 'equals'] ?? cond.operator;
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface-2 border border-border/50 px-3 py-2">
      <code className="text-primary text-body-sm font-mono">{cond.fact}</code>
      <span className="text-muted-foreground text-caption font-semibold">{op}</span>
      {cond.operator !== 'exists' && (
        <code className="text-foreground text-body-sm font-mono">{JSON.stringify(cond.value)}</code>
      )}
    </div>
  );
}

function GroupView({ cond, depth }: { cond: RawCondition; depth: number }) {
  const type = cond.all ? 'all' : 'any';
  const children = cond.all ?? cond.any ?? [];

  if (children.length === 0 && !cond.fact) {
    return <span className="text-muted-foreground text-caption">Empty</span>;
  }

  // Single leaf at root
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
      <div className="flex items-center gap-1.5 mb-2">
        <GitBranch className={cn('w-3 h-3', type === 'all' ? 'text-primary' : 'text-accent')} />
        <span className={cn(
          'text-caption font-bold uppercase',
          type === 'all' ? 'text-primary' : 'text-accent',
        )}>
          {type === 'all' ? 'AND' : 'OR'}
        </span>
      </div>
      <div className="space-y-1.5">
        {children.map((child, i) => (
          <div key={i}>
            {i > 0 && (
              <div className="flex items-center gap-2 py-0.5 pl-2">
                <div className="h-px flex-1 bg-border/40" />
                <span className={cn(
                  'text-[10px] font-semibold',
                  type === 'all' ? 'text-primary/40' : 'text-accent/40',
                )}>
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
    // Fallback to raw display
    return (
      <div className="p-3 rounded-lg bg-surface-2 font-mono text-body-sm text-primary break-all">
        {conditions}
      </div>
    );
  }
}
