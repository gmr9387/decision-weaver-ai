import { StatCard, type StatCardProps } from '@/components/design-system/StatCard';

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  change?: string;
  color: string;
}

export function MetricCard(props: MetricCardProps) {
  // Backwards-compatible wrapper around the shared StatCard primitive.
  const passthrough: StatCardProps = {
    icon: props.icon,
    label: props.label,
    value: props.value,
    change: props.change,
    color: props.color,
  };
  return <StatCard {...passthrough} />;
}
