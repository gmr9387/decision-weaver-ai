import {
  Shield,
  Database,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  TrendingUp,
} from 'lucide-react';

interface Props {
  breakdown: any;
}

export function ConfidenceBreakdownViz({ breakdown }: Props) {
  if (!breakdown) {
    return (
      <div className="text-body-sm text-muted-foreground">
        No confidence data available.
      </div>
    );
  }

  const items = [
    {
      label: 'Rule Strength',
      icon: Shield,
      value: breakdown.ruleStrength ?? 0,
      positive: true,
      description: 'How strongly the rules support the decision',
    },
    {
      label: 'Corroboration',
      icon: CheckCircle2,
      value: breakdown.corroboratingSignals ?? 0,
      positive: true,
      description: 'Multiple rules agreeing on outcome',
    },
    {
      label: 'Evidence',
      icon: Database,
      value: breakdown.evidenceCompleteness ?? 0,
      positive: true,
      description: 'Evidence and documentation coverage',
    },
    {
      label: 'Data Quality',
      icon: TrendingUp,
      value: breakdown.dataQuality ?? 0,
      positive: true,
      description: 'Quality and completeness of input facts',
    },
    {
      label: 'Contradictions',
      icon: GitBranch,
      value: breakdown.contradictionPenalty ?? 0,
      positive: false,
      description: 'Conflicting rule outcomes',
    },
    {
      label: 'Missing Facts',
      icon: AlertTriangle,
      value: breakdown.missingFactPenalty ?? 0,
      positive: false,
      description: 'Required facts not supplied',
    },
  ];

  const finalScore = breakdown.finalAdjusted ?? 0;

  const scoreColor =
    finalScore >= 85
      ? 'text-success'
      : finalScore >= 65
      ? 'text-primary'
      : finalScore >= 40
      ? 'text-warning'
      : 'text-destructive';

  return (
    <div className="space-y-4">
      {/* Score Card */}
      <div className="rounded-xl border border-border bg-surface-2 p-4 text-center">
        <p className="text-caption uppercase tracking-wide text-muted-foreground mb-1">
          Decision Confidence
        </p>

        <div className={`text-4xl font-bold font-mono ${scoreColor}`}>
          {finalScore.toFixed(1)}%
        </div>

        <div className="mt-2 h-2 rounded-full bg-surface-3 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(100, finalScore)}%` }}
          />
        </div>
      </div>

      {/* Decision DNA */}
      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-lg border border-border bg-surface-2 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-body-sm font-medium text-foreground">
                    {item.label}
                  </span>
                </div>

                <span
                  className={`font-mono text-sm ${
                    item.positive
                      ? 'text-success'
                      : 'text-destructive'
                  }`}
                >
                  {item.positive ? '+' : '-'}
                  {Math.abs(item.value).toFixed(0)}
                </span>
              </div>

              <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    item.positive
                      ? 'bg-primary'
                      : 'bg-destructive'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.abs(item.value)
                    )}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-caption text-muted-foreground">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Engine Summary */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="text-caption font-semibold text-primary mb-1">
          Decision DNA Summary
        </div>

        <p className="text-caption text-muted-foreground">
          Confidence is derived from rule strength, corroboration,
          evidence completeness, and data quality, then adjusted for
          contradictions and missing information.
        </p>
      </div>
    </div>
  );
}