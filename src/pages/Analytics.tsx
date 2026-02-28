import { AppLayout } from '@/components/layout/AppLayout';
import { MOCK_CASES, MOCK_RULES, MOCK_METRICS } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, AlertTriangle, FileSearch, Zap } from 'lucide-react';

const COLORS = ['hsl(185, 85%, 48%)', 'hsl(38, 92%, 50%)', 'hsl(152, 69%, 41%)', 'hsl(0, 72%, 51%)', 'hsl(210, 100%, 52%)', 'hsl(280, 70%, 55%)'];

const categoryDist = Object.entries(
  MOCK_CASES.reduce<Record<string, number>>((acc, c) => { acc[c.category] = (acc[c.category] || 0) + 1; return acc; }, {})
).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

const missingFactsAgg = MOCK_CASES
  .flatMap(c => c.inferenceResult?.missingFacts || [])
  .reduce<Record<string, number>>((acc, f) => { acc[f] = (acc[f] || 0) + 1; return acc; }, {});
const topMissing = Object.entries(missingFactsAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);

const topRules = [...MOCK_RULES].sort((a, b) => b.hitCount - a.hitCount).slice(0, 8).map(r => ({ name: r.name.length > 20 ? r.name.slice(0, 20) + '…' : r.name, hits: r.hitCount }));

const escalationTrend = MOCK_METRICS.slice(-14).map(m => ({ date: m.date.slice(5), rate: Math.round(m.escalated / m.processed * 100) }));

export default function Analytics() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-display-sm text-foreground">Analytics</h1>
          <p className="text-body-sm text-muted-foreground mt-1">Insights across inference runs, rules, and case patterns</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Category Distribution */}
          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Case Categories
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 14%)" />
                <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(222, 20%, 10%)', border: '1px solid hsl(222, 15%, 18%)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(185, 85%, 48%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Most Influential Rules */}
          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Most Influential Rules
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topRules} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 14%)" />
                <XAxis type="number" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'hsl(222, 20%, 10%)', border: '1px solid hsl(222, 15%, 18%)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="hits" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Escalation Trend */}
          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> Escalation Rate Trend
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={escalationTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 14%)" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} unit="%" />
                <Tooltip contentStyle={{ background: 'hsl(222, 20%, 10%)', border: '1px solid hsl(222, 15%, 18%)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="rate" fill="hsl(15, 90%, 55%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Missing Facts */}
          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-warning" /> Most Common Missing Facts
            </h3>
            <div className="space-y-3">
              {topMissing.map(([fact, count]) => (
                <div key={fact} className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                  <span className="text-body-sm font-mono text-foreground">{fact}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-warning" style={{ width: `${(count / topMissing[0][1]) * 100}%` }} />
                    </div>
                    <Badge variant="secondary" className="font-mono text-caption">{count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
