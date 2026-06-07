import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

export interface StatCardProps {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  change?: string;
  color?: string;
  hint?: ReactNode;
}

export function StatCard({ icon: Icon, label, value, change, color, hint }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-gradient-card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        {Icon ? (
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${color ?? 'bg-primary/10 text-primary'}`}
          >
            <Icon className="w-4 h-4" />
          </div>
        ) : (
          <span />
        )}
        {change && (
          <span className="flex items-center gap-0.5 text-caption text-success">
            <ArrowUpRight className="w-3 h-3" /> {change}
          </span>
        )}
      </div>
      <div className="text-display-sm text-foreground">{value}</div>
      <div className="text-caption text-muted-foreground mt-1">{label}</div>
      {hint && <div className="text-caption text-muted-foreground mt-2">{hint}</div>}
    </motion.div>
  );
}
