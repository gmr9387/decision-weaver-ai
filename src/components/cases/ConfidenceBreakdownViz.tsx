export function ConfidenceBreakdownViz({ breakdown }: { breakdown: any }) {
  const items = [
    { label: 'Rule Strength', value: breakdown.ruleStrength, color: 'bg-primary' },
    { label: 'Corroborating Signals', value: breakdown.corroboratingSignals, color: 'bg-info' },
    { label: 'Evidence Completeness', value: breakdown.evidenceCompleteness, color: 'bg-success' },
    { label: 'Data Quality', value: breakdown.dataQuality, color: 'bg-primary' },
    { label: 'Contradiction Penalty', value: breakdown.contradictionPenalty, color: 'bg-destructive', negative: true },
    { label: 'Missing Fact Penalty', value: breakdown.missingFactPenalty, color: 'bg-warning', negative: true },
  ];

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-body-sm text-muted-foreground">{item.label}</span>
            <span className="text-caption font-mono text-foreground">
              {item.negative ? '-' : '+'}{Math.abs(item.value).toFixed(0)}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-3">
            <div
              className={`h-full rounded-full ${item.color} transition-all`}
              style={{ width: `${Math.min(100, Math.abs(item.value))}%` }}
            />
          </div>
        </div>
      ))}
      <div className="pt-3 border-t border-border flex items-center justify-between">
        <span className="text-body-sm font-semibold text-foreground">Final Adjusted</span>
        <span className="text-body-md font-semibold text-primary font-mono">
          {breakdown.finalAdjusted.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
