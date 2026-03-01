import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_COLORS = ['hsl(185, 85%, 48%)', 'hsl(38, 92%, 50%)', 'hsl(152, 69%, 41%)', 'hsl(0, 72%, 51%)', 'hsl(210, 100%, 52%)', 'hsl(280, 70%, 55%)', 'hsl(15, 90%, 55%)', 'hsl(320, 70%, 50%)'];

export function DecisionDistChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="rounded-xl border border-border bg-gradient-card p-5">
      <h2 className="text-body-md font-semibold text-foreground mb-4">Decision Distribution</h2>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: 'hsl(222, 20%, 10%)', border: '1px solid hsl(222, 15%, 18%)', borderRadius: 8, fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 mt-2">
        {data.slice(0, 5).map((d, i) => (
          <span key={d.name} className="flex items-center gap-1.5 text-caption text-muted-foreground">
            <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i] }} />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}
