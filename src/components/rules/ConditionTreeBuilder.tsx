import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  GripVertical,
  GitBranch,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface RawCondition {
  fact?: string;
  operator?: string;
  value?: unknown;
  all?: RawCondition[];
  any?: RawCondition[];
}

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

export function fromJson(raw: unknown): ConditionNode {
  if (!raw || typeof raw !== 'object') return makeGroup('all');

  const obj = raw as RawCondition;

  if (obj.all) {
    return {
      kind: 'group',
      data: {
        type: 'all',
        children: obj.all.length > 0 ? obj.all.map(fromJson) : [makeLeaf()],
      },
    };
  }

  if (obj.any) {
    return {
      kind: 'group',
      data: {
        type: 'any',
        children: obj.any.length > 0 ? obj.any.map(fromJson) : [makeLeaf()],
      },
    };
  }

  return {
    kind: 'leaf',
    data: {
      fact: obj.fact ?? '',
      operator: obj.operator ?? 'equals',
      value: (obj.value as string | number | boolean) ?? '',
    },
  };
}

export function toJson(node: ConditionNode): unknown {
  if (node.kind === 'leaf') {
    const payload: Record<string, unknown> = {
      fact: node.data.fact,
      operator: node.data.operator,
    };

    if (node.data.operator !== 'exists') {
      payload.value = autoType(node.data.value);
    }

    return payload;
  }

  return {
    [node.data.type]: node.data.children.map(toJson),
  };
}

function autoType(value: string | number | boolean): string | number | boolean {
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  const trimmed = value.trim();

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  const n = Number(trimmed);
  if (!Number.isNaN(n) && trimmed !== '') return n;

  return value;
}

function makeLeaf(): ConditionNode {
  return {
    kind: 'leaf',
    data: {
      fact: '',
      operator: 'equals',
      value: '',
    },
  };
}

function makeGroup(type: 'all' | 'any'): ConditionNode {
  return {
    kind: 'group',
    data: {
      type,
      children: [makeLeaf()],
    },
  };
}

function validateLeaf(data: ConditionLeaf): string | null {
  if (!data.fact.trim()) return 'Missing fact key';
  if (!data.operator.trim()) return 'Missing operator';
  if (data.operator !== 'exists' && String(data.value ?? '').trim() === '') {
    return 'Missing value';
  }
  return null;
}

function LeafEditor({
  data,
  onChange,
  onRemove,
  dragHandleProps,
}: {
  data: ConditionLeaf;
  onChange: (data: ConditionLeaf) => void;
  onRemove: () => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  const issue = validateLeaf(data);

  return (
    <div
      className={cn(
        'rounded-lg border p-2 group transition-colors',
        issue
          ? 'border-warning/30 bg-warning/5'
          : 'border-border bg-surface-2 hover:border-primary/30',
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          {...dragHandleProps}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <Input
          placeholder="fact_key"
          value={data.fact}
          onChange={(e) => onChange({ ...data, fact: e.target.value })}
          className="bg-surface-1 h-8 text-body-sm font-mono w-36 min-w-0"
        />

        <Select
          value={data.operator}
          onValueChange={(value) => onChange({ ...data, operator: value })}
        >
          <SelectTrigger className="bg-surface-1 h-8 text-body-sm w-28 min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.map((operator) => (
              <SelectItem key={operator.value} value={operator.value}>
                {operator.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {data.operator !== 'exists' && (
          <Input
            placeholder="value"
            value={String(data.value)}
            onChange={(e) => onChange({ ...data, value: e.target.value })}
            className="bg-surface-1 h-8 text-body-sm font-mono w-32 min-w-0"
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

      {issue && (
        <div className="mt-2 flex items-center gap-1.5 text-caption text-warning">
          <AlertTriangle className="w-3 h-3" />
          {issue}
        </div>
      )}
    </div>
  );
}

function GroupEditor({
  data,
  onChange,
  onRemove,
  depth,
  isRoot,
}: {
  data: ConditionGroup;
  onChange: (data: ConditionGroup) => void;
  onRemove?: () => void;
  depth: number;
  isRoot?: boolean;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateChild = useCallback(
    (index: number, node: ConditionNode) => {
      const next = [...data.children];
      next[index] = node;
      onChange({ ...data, children: next });
    },
    [data, onChange],
  );

  const removeChild = useCallback(
    (index: number) => {
      const next = data.children.filter((_, idx) => idx !== index);
      onChange({ ...data, children: next.length > 0 ? next : [makeLeaf()] });
    },
    [data, onChange],
  );

  const addCondition = () => {
    onChange({ ...data, children: [...data.children, makeLeaf()] });
  };

  const addGroup = () => {
    onChange({
      ...data,
      children: [...data.children, makeGroup(data.type === 'all' ? 'any' : 'all')],
    });
  };

  const toggleType = () => {
    onChange({ ...data, type: data.type === 'all' ? 'any' : 'all' });
  };

  const handleDragStart = (index: number) => (event: React.DragEvent) => {
    setDragIdx(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (index: number) => (event: React.DragEvent) => {
    event.preventDefault();
    setOverIdx(index);
  };

  const handleDrop = (index: number) => (event: React.DragEvent) => {
    event.preventDefault();

    if (dragIdx === null || dragIdx === index) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }

    const next = [...data.children];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(index, 0, moved);

    onChange({ ...data, children: next });
    setDragIdx(null);
    setOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  const borderColor = data.type === 'all' ? 'border-primary/40' : 'border-accent/40';
  const bgColor =
    depth === 0 ? 'bg-surface-1' : depth === 1 ? 'bg-surface-2/50' : 'bg-surface-3/30';

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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-caption gap-1 text-muted-foreground hover:text-foreground"
            onClick={addCondition}
          >
            <Plus className="w-3 h-3" /> Condition
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-caption gap-1 text-muted-foreground hover:text-foreground"
            onClick={addGroup}
          >
            <Plus className="w-3 h-3" /> Group
          </Button>

          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {data.children.map((child, index) => {
          const isOver = overIdx === index && dragIdx !== null && dragIdx !== index;

          return (
            <div
              key={index}
              draggable
              onDragStart={handleDragStart(index)}
              onDragOver={handleDragOver(index)}
              onDrop={handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'transition-all',
                dragIdx === index && 'opacity-40',
                isOver && 'ring-2 ring-primary/50 rounded-lg',
              )}
            >
              {index > 0 && (
                <div className="flex items-center gap-2 py-1 pl-4">
                  <div className="h-px flex-1 bg-border" />
                  <span
                    className={cn(
                      'text-caption font-semibold px-2',
                      data.type === 'all' ? 'text-primary/60' : 'text-accent/60',
                    )}
                  >
                    {data.type === 'all' ? 'AND' : 'OR'}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}

              {child.kind === 'leaf' ? (
                <LeafEditor
                  data={child.data}
                  onChange={(next) => updateChild(index, { kind: 'leaf', data: next })}
                  onRemove={() => removeChild(index)}
                  dragHandleProps={{
                    onMouseDown: (event: React.MouseEvent) => event.stopPropagation(),
                  }}
                />
              ) : (
                <GroupEditor
                  data={child.data}
                  onChange={(next) => updateChild(index, { kind: 'group', data: next })}
                  onRemove={() => removeChild(index)}
                  depth={depth + 1}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ConditionTreeBuilderProps {
  value: ConditionNode;
  onChange: (node: ConditionNode) => void;
}

export function ConditionTreeBuilder({ value, onChange }: ConditionTreeBuilderProps) {
  const rootGroup =
    value.kind === 'group'
      ? value
      : ({ kind: 'group', data: makeGroup('all').data } as {
          kind: 'group';
          data: ConditionGroup;
        });

  return (
    <GroupEditor
      data={rootGroup.data}
      onChange={(data) => onChange({ kind: 'group', data })}
      depth={0}
      isRoot
    />
  );
}