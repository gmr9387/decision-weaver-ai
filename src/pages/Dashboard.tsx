import { AppLayout } from '@/components/layout/AppLayout';
import { MOCK_CASES, MOCK_METRICS, MOCK_RULES } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Activity, TrendingUp, AlertTriangle, Clock, CheckCircle2,
  ArrowUpRight, Zap, BarChart3
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const resolved = MOCK_CASES.filter(c => c.status === 'resolved').length;
const escalated = MOCK_CASES.filter(c => c.status === 'escalated').length;
const avgConf = MOCK_CASES.filter(c => c.confidence).reduce((s, c) => s + (c.confidence || 0), 0) / MOCK_CASES.filter(c => c.confidence).length;

const decisionDist = Object.entries(
  MOCK_CASES.filter(c => c.decision).reduce<Record<string, number>>((acc, c) => {
    acc[c.decision!] = (acc[c.decision!] || 0) + 1; return acc;
  }, {})
).map(([name, value]) => ({ name, value }));

const severityDist = Object.entries(
  MOCK_CASES.reduce<Record<string, number>>((acc, c) => {
    acc[c.severity] = (acc[c.severity] || 0) + 1; return acc;
  }, {})
).map(([name, value]) => ({ name, value }));

const CHART_COLORS = ['hsl(185, 85%, 48%)', 'hsl(38, 92%, 50%)', 'hsl(152, 69%, 41%)', 'hsl(0, 72%, 51%)', 'hsl(210, 100%, 52%)', 'hsl(280, 70%, 55%)', 'hsl(15, 90%, 55%)', 'hsl(320, 70%, 50%)'];

const topRules = [...MOCK_RULES].sort((a, b) => b.hitCount - a.hitCount).slice(0, 5);

function MetricCard({ icon: Icon, label, value, change, color }: { icon: any; label: string; value: string; change?: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-gradient-card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        {change && (
          <span className="flex items-center gap-0.5 text-caption text-success">
            <ArrowUpRight className="w-3 h-3" /> {change}
          </span>
        )}
      </div>
      <div className="text-display-sm text-foreground">{value}</div>
      <div className="text-caption text-muted-foreground mt-1">{label}</div>
    </motion.div>
  );
}

export default function Dashboard() {
  const recentMetrics = MOCK_METRICS.slice(-14);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display-sm text-foreground">Dashboard</h1>
            <p className="text-body-sm text-muted-foreground mt-1">Real-time inference intelligence overview</p>
          </div>
          <Badge variant="confidence" className="gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            System Healthy
          </Badge>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={Activity} label="Total Processed" value={MOCK_CASES.length.toString()} change="+12%" color="bg-primary/10 text-primary" />
          <MetricCard icon={CheckCircle2} label="Auto-Resolved" value={`${Math.round(resolved / MOCK_CASES.length * 100)}%`} change="+5%" color="bg-success/10 text-success" />
          <MetricCard icon={AlertTriangle} label="Escalated" value={`${Math.round(escalated / MOCK_CASES.length * 100)}%`} color="bg-warning/10 text-warning" />
          <MetricCard icon={TrendingUp} label="Avg Confidence" value={`${avgConf.toFixed(1)}%`} change="+2.3%" color="bg-info/10 text-info" />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Throughput Chart */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-gradient-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-body-md font-semibold text-foreground">Processing Volume</h2>
              <Badge variant="secondary">Last 14 days</Badge>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={recentMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 14%)" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(222, 20%, 10%)', border: '1px solid hsl(222, 15%, 18%)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="autoResolved" name="Auto-Resolved" fill="hsl(185, 85%, 48%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="escalated" name="Escalated" fill="hsl(38, 92%, 50%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Decision Distribution */}
          <div className="rounded-xl border border-border bg-gradient-card p-5">
            <h2 className="text-body-md font-semibold text-foreground mb-4">Decision Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={decisionDist} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {decisionDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(222, 20%, 10%)', border: '1px solid hsl(222, 15%, 18%)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {decisionDist.slice(0, 5).map((d, i) => (
                <span key={d.name} className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i] }} />
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Confidence Trend */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-gradient-card p-5">
            <h2 className="text-body-md font-semibold text-foreground mb-4">Confidence Trend</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={recentMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 15%, 14%)" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                <YAxis domain={[50, 100]} tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(222, 20%, 10%)', border: '1px solid hsl(222, 15%, 18%)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="avgConfidence" stroke="hsl(185, 85%, 48%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Rules */}
          <div className="rounded-xl border border-border bg-gradient-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="text-body-md font-semibold text-foreground">Top Fired Rules</h2>
            </div>
            <div className="space-y-3">
              {topRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-body-sm text-foreground">{rule.name}</div>
                    <div className="text-caption text-muted-foreground">{rule.category}</div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-caption">{rule.hitCount}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Severity Mix */}
        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="text-body-md font-semibold text-foreground">Severity Distribution</h2>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {severityDist.map(s => {
              const colors: Record<string, string> = { low: 'text-severity-low', medium: 'text-severity-medium', high: 'text-severity-high', critical: 'text-severity-critical' };
              return (
                <div key={s.name} className="text-center p-4 rounded-lg bg-surface-2">
                  <div className={`text-display-sm ${colors[s.name] || 'text-foreground'}`}>{s.value}</div>
                  <div className="text-caption text-muted-foreground capitalize mt-1">{s.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
