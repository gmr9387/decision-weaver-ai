export function ConfidenceBar({ value }: { value?: number }) {
  if (!value) return <span className="text-caption text-muted-foreground">—</span>;
  const color = value > 80 ? 'bg-confidence-high' : value > 55 ? 'bg-confidence-medium' : 'bg-confidence-low';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-surface-3">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-caption text-muted-foreground font-mono">{value.toFixed(0)}%</span>
    </div>
  );
}
