import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Trash2, GripVertical, GitBranch, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────

export interface ConditionLeaf {
  fact: string;
  operator: string;
  value: string | number | boolean;
}

export interface ConditionGroup {
  type: 'all' | 'any';
  children: ConditionNode[];
}

export type ConditionNode =
  | { kind: 'leaf'; data: ConditionLeaf }
  | { kind: 'group'; data: ConditionGroup };

// ── Serialization helpers ──────────────────────────────────

interface RawCondition {
  fact?: string;
  operator?: string;
  value?: unknown;
  all?: RawCondition[];
  any?: RawCondition[];
}

export function fromJson(raw: unknown): ConditionNode {
  if (!raw || typeof raw !== 'object') {
    return makeGroup('all');
  }
  const obj = raw as RawCondition;
  if (obj.all) {
    return {
      kind: 'group',
      data: { type: 'all', children: obj.all.map(fromJson) },
    };
  }
  if (obj.any) {
    return {
      kind: 'group',
      data: { type: 'any', children: obj.any.map(fromJson) },
    };
  }
  return {
    kind: 'leaf',
    data: {
      fact: obj.fact ?? '',
      operator: obj.operator ?? 'equals',
      value: obj.value as string | number | boolean ?? '',
    },
  };
}

export function toJson(node: ConditionNode): unknown {
  if (node.kind === 'leaf') {
    return {
      fact: node.data.fact,
      operator: node.data.operator,
      value: autoType(node.data.value),
    };
  }
  return {
    [node.data.type]: node.data.children.map(toJson),
  };
}

function autoType(v: string | number | boolean): string | number | boolean {
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  const n = Number(v);
  if (!isNaN(n) && v.trim() !== '') return n;
  return v;
}

// ── Factory helpers ────────────────────────────────────────

function makeLeaf(): ConditionNode {
  return { kind: 'leaf', data: { fact: '', operator: 'equals', value: '' } };
}

function makeGroup(type: 'all' | 'any'): ConditionNode {
  return { kind: 'group', data: { type, children: [makeLeaf()] } };
}

// ── Operators ──────────────────────────────────────────────

const OPERATORS = [
  { value: 'equals', label: '=' },
  { value: 'notEquals', label: '≠' },
  { value: 'greaterThan', label: '>' },
  { value: 'greaterThanOrEqual', label: '≥' },
  { value: 'lessThan', label: '<' },
  { value: 'lessThanOrEqual', label: '≤' },
  { value: 'contains', label: 'contains' },
  { value: 'in', label: 'in' },
  { value: 'exists', label: 'exists' },
];

// ── Leaf editor ────────────────────────────────────────────

function LeafEditor({
  data,
  onChange,
  onRemove,
  dragHandleProps,
}: {
  data: ConditionLeaf;
  onChange: (d: ConditionLeaf) => void;
  onRemove: () => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 p-2 group transition-colors hover:border-primary/30">
      <div
        className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        {...dragHandleProps}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      <Input
        placeholder="fact_key"
        value={data.fact}
        onChange={e => onChange({ ...data, fact: e.target.value })}
        className="bg-surface-1 h-8 text-body-sm font-mono w-32 min-w-0"
      />

      <Select value={data.operator} onValueChange={v => onChange({ ...data, operator: v })}>
        <SelectTrigger className="bg-surface-1 h-8 text-body-sm w-24 min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPERATORS.map(op => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {data.operator !== 'exists' && (
        <Input
          placeholder="value"
          value={String(data.value)}
          onChange={e => onChange({ ...data, value: e.target.value })}
          className="bg-surface-1 h-8 text-body-sm font-mono w-28 min-w-0"
        />
      )}

      <Button
        variant="ghost"
        size="icon"
        className="w-7 h-7 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all shrink-0"
        onClick={onRemove}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ── Group editor (recursive) ──────────────────────────────

function GroupEditor({
  data,
  onChange,
  onRemove,
  depth,
  isRoot,
}: {
  data: ConditionGroup;
  onChange: (d: ConditionGroup) => void;
  onRemove?: () => void;
  depth: number;
  isRoot?: boolean;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateChild = useCallback((i: number, node: ConditionNode) => {
    const next = [...data.children];
    next[i] = node;
    onChange({ ...data, children: next });
  }, [data, onChange]);

  const removeChild = useCallback((i: number) => {
    const next = data.children.filter((_, idx) => idx !== i);
    onChange({ ...data, children: next.length === 0 ? [makeLeaf().data as any].map(() => makeLeaf()) : next });
  }, [data, onChange]);

  const addCondition = () => onChange({ ...data, children: [...data.children, makeLeaf()] });
  const addGroup = () => onChange({ ...data, children: [...data.children, makeGroup(data.type === 'all' ? 'any' : 'all')] });

  const toggleType = () => onChange({ ...data, type: data.type === 'all' ? 'any' : 'all' });

  // Drag & drop reorder
  const handleDragStart = (i: number) => (e: React.DragEvent) => {
    setDragIdx(i);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(i));
  };
  const handleDragOver = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setOverIdx(i);
  };
  const handleDrop = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setOverIdx(null); return; }
    const next = [...data.children];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    onChange({ ...data, children: next });
    setDragIdx(null);
    setOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  const borderColor = data.type === 'all'
    ? 'border-primary/40'
    : 'border-accent/40';

  const bgColor = depth === 0
    ? 'bg-surface-1'
    : depth === 1
      ? 'bg-surface-2/50'
      : 'bg-surface-3/30';

  return (
    <div
      ref={containerRef}
      className={cn(
        'rounded-xl border-2 transition-colors',
        borderColor,
        bgColor,
        isRoot ? 'p-4' : 'p-3',
      )}
    >
      {/* Group header */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={toggleType}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm font-semibold transition-all cursor-pointer select-none',
            data.type === 'all'
              ? 'bg-primary/15 text-primary hover:bg-primary/25'
              : 'bg-accent/15 text-accent hover:bg-accent/25',
          )}
        >
          <GitBranch className="w-3.5 h-3.5" />
          {data.type === 'all' ? 'AND' : 'OR'}
          <ChevronDown className="w-3 h-3 opacity-50" />
        </button>

        <span className="text-caption text-muted-foreground">
          {data.type === 'all' ? 'All conditions must match' : 'Any condition can match'}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-caption gap-1 text-muted-foreground hover:text-foreground" onClick={addCondition}>
            <Plus className="w-3 h-3" /> Condition
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-caption gap-1 text-muted-foreground hover:text-foreground" onClick={addGroup}>
            <Plus className="w-3 h-3" /> Group
          </Button>
          {onRemove && (
            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive" onClick={onRemove}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Children */}
      <div className="space-y-2">
        {data.children.map((child, i) => {
          const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;
          return (
            <div
              key={i}
              draggable
              onDragStart={handleDragStart(i)}
              onDragOver={handleDragOver(i)}
              onDrop={handleDrop(i)}
              onDragEnd={handleDragEnd}
              className={cn(
                'transition-all',
                dragIdx === i && 'opacity-40',
                isOver && 'ring-2 ring-primary/50 rounded-lg',
              )}
            >
              {/* Connector label between siblings */}
              {i > 0 && (
                <div className="flex items-center gap-2 py-1 pl-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className={cn(
                    'text-caption font-semibold px-2',
                    data.type === 'all' ? 'text-primary/60' : 'text-accent/60',
                  )}>
                    {data.type === 'all' ? 'AND' : 'OR'}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}

              {child.kind === 'leaf' ? (
                <LeafEditor
                  data={child.data}
                  onChange={d => updateChild(i, { kind: 'leaf', data: d })}
                  onRemove={() => removeChild(i)}
                  dragHandleProps={{
                    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
                  }}
                />
              ) : (
                <GroupEditor
                  data={child.data}
                  onChange={d => updateChild(i, { kind: 'group', data: d })}
                  onRemove={() => removeChild(i)}
                  depth={depth + 1}
                />
              )}
            </div>
          );
        })}
      </div>

      {data.children.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-body-sm">
          Empty group — add a condition or sub-group above.
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────

interface ConditionTreeBuilderProps {
  value: ConditionNode;
  onChange: (node: ConditionNode) => void;
}

export function ConditionTreeBuilder({ value, onChange }: ConditionTreeBuilderProps) {
  // Ensure root is always a group
  const rootGroup = value.kind === 'group' ? value : makeGroup('all') as { kind: 'group'; data: ConditionGroup };

  return (
    <GroupEditor
      data={rootGroup.data}
      onChange={d => onChange({ kind: 'group', data: d })}
      depth={0}
      isRoot
    />
  );
}
