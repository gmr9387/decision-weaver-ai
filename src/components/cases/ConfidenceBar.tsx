import { confidenceBandColors } from './constants';

interface ConfidenceBarProps {
  value?: number;
  showLabel?: boolean;
}

export function ConfidenceBar({
  value,
  showLabel = true,
}: ConfidenceBarProps) {
  if (value === undefined || value === null) {
    return (
      <span className="text-caption text-muted-foreground">
        —
      </span>
    );
  }

  const band =
    value >= 85
      ? 'very_high'
      : value >= 65
        ? 'high'
        : value >= 40
          ? 'medium'
          : 'low';

  const colorClass =
    band === 'very_high'
      ? 'bg-success'
      : band === 'high'
        ? 'bg-info'
        : band === 'medium'
          ? 'bg-warning'
          : 'bg-destructive';

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 rounded-full bg-surface-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
          }}
        />
      </div>

      {showLabel && (
        <span className="text-caption text-muted-foreground font-mono">
          {value.toFixed(1)}%
        </span>
      )}

      <span
        className={`
          text-[10px]
          uppercase
          tracking-wide
          font-semibold
          ${
            confidenceBandColors[band] === 'success'
              ? 'text-success'
              : confidenceBandColors[band] === 'info'
                ? 'text-info'
                : confidenceBandColors[band] === 'warning'
                  ? 'text-warning'
                  : 'text-destructive'
          }
        `}
      >
        {band.replace('_', ' ')}
      </span>
    </div>
  );
}