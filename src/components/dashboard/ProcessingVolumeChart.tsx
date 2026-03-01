import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import type { DailyMetric } from '@/lib/types';

export function ProcessingVolumeChart({ metrics }: { metrics: DailyMetric[] }) {
  return (
    <div className="lg:col-span-2 rounded-xl border border-border bg-gradient-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-body-md font-semibold text-foreground">Processing Volume</h2>
        <Badge variant="secondary">Last 14 days</Badge>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={metrics}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 14%)" />
          <XAxis dataKey="date" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
          <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
          <Tooltip contentStyle={{ background: 'hsl(222, 20%, 10%)', border: '1px solid hsl(222, 15%, 18%)', borderRadius: 8, fontSize: 12 }} />
          <Bar dataKey="autoResolved" name="Auto-Resolved" fill="hsl(185, 85%, 48%)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="escalated" name="Escalated" fill="hsl(38, 92%, 50%)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
