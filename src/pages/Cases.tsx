import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { MOCK_CASES } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, ArrowUpDown, ChevronRight } from 'lucide-react';
import type { Case, DecisionType, SeverityLevel } from '@/lib/types';

const decisionColors: Record<DecisionType, string> = {
  approve: 'success', deny: 'destructive', flag: 'warning', escalate: 'critical',
  review: 'info', request_info: 'warning', route: 'secondary', monitor: 'secondary', unresolved: 'outline',
};

const severityColors: Record<SeverityLevel, string> = {
  low: 'success', medium: 'warning', high: 'critical', critical: 'destructive',
};

function ConfidenceBar({ value }: { value?: number }) {
  if (!value) return <span className="text-caption text-muted-foreground">—</span>;
  const color = value > 80 ? 'bg-confidence-high' : value > 55 ? 'bg-confidence-medium' : 'bg-confidence-low';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-surface-3">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-caption text-muted-foreground font-mono">{value.toFixed(0)}%</span>
    </div>
  );
}

export default function Cases() {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'createdAt' | 'confidence' | 'severity'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [decisionFilter, setDecisionFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    let cases = [...MOCK_CASES];
    if (search) {
      const q = search.toLowerCase();
      cases = cases.filter(c =>
        c.caseNumber.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.owner.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    }
    if (severityFilter !== 'all') cases = cases.filter(c => c.severity === severityFilter);
    if (decisionFilter !== 'all') cases = cases.filter(c => c.decision === decisionFilter);

    cases.sort((a, b) => {
      if (sortField === 'createdAt') return sortDir === 'desc' ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortField === 'confidence') return sortDir === 'desc' ? (b.confidence || 0) - (a.confidence || 0) : (a.confidence || 0) - (b.confidence || 0);
      const sev = { low: 0, medium: 1, high: 2, critical: 3 };
      return sortDir === 'desc' ? sev[b.severity] - sev[a.severity] : sev[a.severity] - sev[b.severity];
    });
    return cases;
  }, [search, sortField, sortDir, severityFilter, decisionFilter]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display-sm text-foreground">Cases</h1>
            <p className="text-body-sm text-muted-foreground mt-1">{MOCK_CASES.length} total cases · {filtered.length} shown</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search cases..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-surface-2 border-border" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="bg-surface-2 border border-border rounded-md px-3 py-2 text-body-sm text-foreground">
              <option value="all">All Severity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select value={decisionFilter} onChange={e => setDecisionFilter(e.target.value)} className="bg-surface-2 border border-border rounded-md px-3 py-2 text-body-sm text-foreground">
              <option value="all">All Decisions</option>
              <option value="approve">Approve</option>
              <option value="deny">Deny</option>
              <option value="flag">Flag</option>
              <option value="escalate">Escalate</option>
              <option value="review">Review</option>
              <option value="request_info">Request Info</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-gradient-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left text-overline text-muted-foreground uppercase px-4 py-3">Case</th>
                  <th className="text-left text-overline text-muted-foreground uppercase px-4 py-3">Category</th>
                  <th className="text-left text-overline text-muted-foreground uppercase px-4 py-3 cursor-pointer" onClick={() => toggleSort('severity')}>
                    <span className="flex items-center gap-1">Severity <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="text-left text-overline text-muted-foreground uppercase px-4 py-3">Decision</th>
                  <th className="text-left text-overline text-muted-foreground uppercase px-4 py-3 cursor-pointer" onClick={() => toggleSort('confidence')}>
                    <span className="flex items-center gap-1">Confidence <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="text-left text-overline text-muted-foreground uppercase px-4 py-3">Owner</th>
                  <th className="text-left text-overline text-muted-foreground uppercase px-4 py-3 cursor-pointer" onClick={() => toggleSort('createdAt')}>
                    <span className="flex items-center gap-1">Created <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map(c => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-body-sm font-medium text-foreground">{c.caseNumber}</div>
                      <div className="text-caption text-muted-foreground">{c.source}</div>
                    </td>
                    <td className="px-4 py-3 text-body-sm text-foreground">{c.category}</td>
                    <td className="px-4 py-3">
                      <Badge variant={severityColors[c.severity] as any} className="capitalize">{c.severity}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {c.decision ? (
                        <Badge variant={decisionColors[c.decision] as any} className="capitalize">{c.decision.replace('_', ' ')}</Badge>
                      ) : (
                        <span className="text-caption text-muted-foreground">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><ConfidenceBar value={c.confidence} /></td>
                    <td className="px-4 py-3 text-body-sm text-muted-foreground">{c.owner}</td>
                    <td className="px-4 py-3 text-caption text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Link to={`/cases/${c.id}`}>
                        <Button variant="ghost" size="icon" className="w-7 h-7">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
