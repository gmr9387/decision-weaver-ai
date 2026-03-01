import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import type { DailyMetric } from '@/lib/types';

export function ConfidenceTrendChart({ metrics }: { metrics: DailyMetric[] }) {
  return (
    <div className="lg:col-span-2 rounded-xl border border-border bg-gradient-card p-5">
      <h2 className="text-body-md font-semibold text-foreground mb-4">Confidence Trend</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={metrics}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 14%)" />
          <XAxis dataKey="date" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
          <YAxis domain={[50, 100]} tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
          <Tooltip contentStyle={{ background: 'hsl(222, 20%, 10%)', border: '1px solid hsl(222, 15%, 18%)', borderRadius: 8, fontSize: 12 }} />
          <Line type="monotone" dataKey="avgConfidence" stroke="hsl(185, 85%, 48%)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
