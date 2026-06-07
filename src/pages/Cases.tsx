import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCases } from '@/hooks/use-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronRight,
  Loader2,
  Plus,
  MoreHorizontal,
  FileText,
  Play,
  ChevronLeft,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { DecisionType, SeverityLevel } from '@/lib/types';
import { useRunInference } from '@/hooks/use-actions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const decisionColors: Record<DecisionType, string> = {
  approve: 'success',
  deny: 'destructive',
  flag: 'warning',
  escalate: 'critical',
  review: 'info',
  request_info: 'warning',
  route: 'secondary',
  monitor: 'secondary',
  unresolved: 'outline',
};

const severityColors: Record<SeverityLevel, string> = {
  low: 'success',
  medium: 'warning',
  high: 'critical',
  critical: 'destructive',
};

const STATUS_OPTIONS = ['open', 'processing', 'resolved', 'escalated', 'pending_info'] as const;
const REVIEW_STATE_OPTIONS = ['unreviewed', 'in_review', 'approved', 'rejected', 'needs_info'] as const;

function ConfidenceBar({ value }: { value?: number }) {
  if (!value) return <span className="text-caption text-muted-foreground">—</span>;

  const color =
    value > 80
      ? 'bg-confidence-high'
      : value > 55
        ? 'bg-confidence-medium'
        : 'bg-confidence-low';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-surface-3">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-caption text-muted-foreground font-mono">{value.toFixed(0)}%</span>
    </div>
  );
}

function ReviewStateBadge({ value }: { value?: string }) {
  const state = value || 'unreviewed';

  if (state === 'approved') {
    return <Badge variant="success">Approved</Badge>;
  }

  if (state === 'rejected') {
    return <Badge variant="destructive">Rejected</Badge>;
  }

  if (state === 'needs_info') {
    return <Badge variant="warning">Needs Info</Badge>;
  }

  if (state === 'in_review') {
    return <Badge variant="info">In Review</Badge>;
  }

  return <Badge variant="outline">Unreviewed</Badge>;
}

export default function Cases() {
  const { data: allCases = [], isLoading, isError, error } = useCases();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const runInference = useRunInference();

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'createdAt' | 'confidence' | 'severity'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [decisionFilter, setDecisionFilter] = useState<string>('all');
  const [reviewFilter, setReviewFilter] = useState<string>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [newCase, setNewCase] = useState({
    category: 'General',
    source: 'Manual Entry',
    severity: 'medium' as SeverityLevel,
    description: '',
    amount: '',
  });

  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [batchRunning, setBatchRunning] = useState(false);

  useEffect(() => {
    setPage(0);
  }, [search, severityFilter, decisionFilter, reviewFilter, sortField, sortDir]);

  const filtered = useMemo(() => {
    let cases = [...allCases];

    if (search) {
      const q = search.toLowerCase();

      cases = cases.filter(
        (c) =>
          c.caseNumber.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.owner.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.source.toLowerCase().includes(q),
      );
    }

    if (severityFilter !== 'all') cases = cases.filter((c) => c.severity === severityFilter);
    if (decisionFilter !== 'all') cases = cases.filter((c) => c.decision === decisionFilter);
    if (reviewFilter !== 'all') cases = cases.filter((c) => c.reviewState === reviewFilter);

    cases.sort((a, b) => {
      if (sortField === 'createdAt') {
        return sortDir === 'desc'
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      if (sortField === 'confidence') {
        return sortDir === 'desc'
          ? (b.confidence || 0) - (a.confidence || 0)
          : (a.confidence || 0) - (b.confidence || 0);
      }

      const sev = { low: 0, medium: 1, high: 2, critical: 3 };

      return sortDir === 'desc'
        ? sev[b.severity] - sev[a.severity]
        : sev[a.severity] - sev[b.severity];
    });

    return cases;
  }, [allCases, search, sortField, sortDir, severityFilter, decisionFilter, reviewFilter]);

  const reviewSummary = useMemo(() => {
    const unreviewed = allCases.filter((c) => !c.reviewState || c.reviewState === 'pending').length;
    const inReview = allCases.filter((c) => c.reviewState === 'in_review').length;
    const approved = allCases.filter((c) => c.reviewState === 'completed').length;
    const needsInfo = allCases.filter((c) => c.reviewState === 'reopened').length;

    return { unreviewed, inReview, approved, needsInfo };
  }, [allCases]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const getProfile = async () => {
    if (!user?.id) throw new Error('You must be signed in.');

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, display_name')
      .eq('user_id', user.id)
      .single();

    if (profileError) throw profileError;

    return data;
  };

  const handleBatchInference = async () => {
    const openCases = filtered.filter((c) => c.status === 'open' || c.status === 'processing');

    if (openCases.length === 0) {
      toast({
        title: 'No eligible cases',
        description: 'No open/processing cases to run inference on.',
      });
      return;
    }

    setBatchRunning(true);

    let success = 0;
    let failed = 0;

    for (const c of openCases) {
      try {
        const factsObj: Record<string, unknown> = {};
        c.facts?.forEach((f) => {
          factsObj[f.key] = f.value;
        });

        await runInference.mutateAsync({
          caseId: c.id,
          facts: factsObj,
          mode: 'instant',
        });

        success++;
      } catch {
        failed++;
      }
    }

    setBatchRunning(false);
    queryClient.invalidateQueries({ queryKey: ['cases'] });

    toast({
      title: 'Batch complete',
      description: `${success} processed, ${failed} failed out of ${openCases.length} cases.`,
    });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const profile = await getProfile();

      if (!profile?.organization_id) throw new Error('No organization found for current user.');

      const caseNumber = `IC-${new Date().getFullYear()}-${String(allCases.length + 1001).padStart(4, '0')}`;

      const { error: insertError } = await supabase.from('cases').insert({
        organization_id: profile.organization_id,
        case_number: caseNumber,
        category: newCase.category,
        source: newCase.source,
        severity: newCase.severity as any,
        description: newCase.description,
        amount: newCase.amount ? parseFloat(newCase.amount) : null,
        owner: profile.display_name || user?.email || 'Unassigned',
        review_state: 'unreviewed' as any,
        status: 'open' as any,
      });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setCreateOpen(false);
      setNewCase({
        category: 'General',
        source: 'Manual Entry',
        severity: 'medium',
        description: '',
        amount: '',
      });
      toast({ title: 'Case created' });
    },
    onError: (err: any) =>
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error: updateError } = await supabase
        .from('cases')
        .update({ status: status as any })
        .eq('id', id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast({ title: 'Status updated' });
    },
    onError: (err: any) =>
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      }),
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, reviewState }: { id: string; reviewState: string }) => {
      const { error: updateError } = await supabase
        .from('cases')
        .update({ review_state: reviewState as any })
        .eq('id', id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast({ title: 'Review state updated' });
    },
    onError: (err: any) =>
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      }),
  });

  const assignToMeMutation = useMutation({
    mutationFn: async (id: string) => {
      const profile = await getProfile();
      const owner = profile?.display_name || user?.email || 'Current User';

      const { error: updateError } = await supabase
        .from('cases')
        .update({
          owner,
          review_state: 'in_review' as any,
        })
        .eq('id', id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast({ title: 'Case assigned to you' });
    },
    onError: (err: any) =>
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      }),
  });

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-display-sm text-foreground">Cases</h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              {isLoading ? 'Loading...' : `${allCases.length} total cases · ${filtered.length} shown`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleBatchInference}
              disabled={batchRunning}
            >
              {batchRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              Batch Inference
            </Button>

            <Button variant="hero" size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> New Case
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface-1 p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <AlertTriangle className="w-3.5 h-3.5" />
              Unreviewed
            </div>
            <p className="mt-1 text-2xl font-semibold text-foreground">{reviewSummary.unreviewed}</p>
          </div>

          <div className="rounded-xl border border-border bg-surface-1 p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <UserCheck className="w-3.5 h-3.5" />
              In Review
            </div>
            <p className="mt-1 text-2xl font-semibold text-foreground">{reviewSummary.inReview}</p>
          </div>

          <div className="rounded-xl border border-border bg-surface-1 p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approved
            </div>
            <p className="mt-1 text-2xl font-semibold text-foreground">{reviewSummary.approved}</p>
          </div>

          <div className="rounded-xl border border-border bg-surface-1 p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5" />
              Needs Info
            </div>
            <p className="mt-1 text-2xl font-semibold text-foreground">{reviewSummary.needsInfo}</p>
          </div>
        </div>

        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {(error as Error)?.message || 'Failed to load cases.'}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-surface-2 border-border"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-surface-2 border border-border rounded-md px-3 py-2 text-body-sm text-foreground"
            >
              <option value="all">All Severity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              className="bg-surface-2 border border-border rounded-md px-3 py-2 text-body-sm text-foreground"
            >
              <option value="all">All Decisions</option>
              <option value="approve">Approve</option>
              <option value="deny">Deny</option>
              <option value="flag">Flag</option>
              <option value="escalate">Escalate</option>
              <option value="review">Review</option>
              <option value="request_info">Request Info</option>
            </select>

            <select
              value={reviewFilter}
              onChange={(e) => setReviewFilter(e.target.value)}
              className="bg-surface-2 border border-border rounded-md px-3 py-2 text-body-sm text-foreground"
            >
              <option value="all">All Review States</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="needs_info">Needs Info</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-body-md text-foreground font-medium">No cases found</p>
              <p className="text-body-sm text-muted-foreground mt-1">
                Adjust filters or create a new case.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="text-left text-overline text-muted-foreground uppercase px-4 py-3">Case</th>
                    <th className="text-left text-overline text-muted-foreground uppercase px-4 py-3">Category</th>
                    <th
                      className="text-left text-overline text-muted-foreground uppercase px-4 py-3 cursor-pointer"
                      onClick={() => toggleSort('severity')}
                    >
                      <span className="flex items-center gap-1">
                        Severity <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th className="text-left text-overline text-muted-foreground uppercase px-4 py-3">Status</th>
                    <th className="text-left text-overline text-muted-foreground uppercase px-4 py-3">Review</th>
                    <th className="text-left text-overline text-muted-foreground uppercase px-4 py-3">Decision</th>
                    <th
                      className="text-left text-overline text-muted-foreground uppercase px-4 py-3 cursor-pointer"
                      onClick={() => toggleSort('confidence')}
                    >
                      <span className="flex items-center gap-1">
                        Confidence <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th className="text-left text-overline text-muted-foreground uppercase px-4 py-3">Owner</th>
                    <th
                      className="text-left text-overline text-muted-foreground uppercase px-4 py-3 cursor-pointer"
                      onClick={() => toggleSort('createdAt')}
                    >
                      <span className="flex items-center gap-1">
                        Created <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>

                <tbody>
                  {paged.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-body-sm font-medium text-foreground">{c.caseNumber}</div>
                        <div className="text-caption text-muted-foreground">{c.source}</div>
                      </td>

                      <td className="px-4 py-3 text-body-sm text-foreground">{c.category}</td>

                      <td className="px-4 py-3">
                        <Badge variant={severityColors[c.severity] as any} className="capitalize">
                          {c.severity}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="capitalize">
                          {c.status.replace('_', ' ')}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <ReviewStateBadge value={c.reviewState} />
                      </td>

                      <td className="px-4 py-3">
                        {c.decision ? (
                          <Badge variant={decisionColors[c.decision] as any} className="capitalize">
                            {c.decision.replace('_', ' ')}
                          </Badge>
                        ) : (
                          <span className="text-caption text-muted-foreground">Pending</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <ConfidenceBar value={c.confidence} />
                      </td>

                      <td className="px-4 py-3 text-body-sm text-muted-foreground">{c.owner}</td>

                      <td className="px-4 py-3 text-caption text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link to={`/cases/${c.id}`}>
                            <Button variant="ghost" size="icon" className="w-7 h-7">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </Link>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-7 h-7">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="bg-card border-border">
                              <DropdownMenuItem onClick={() => assignToMeMutation.mutate(c.id)}>
                                Assign to me
                              </DropdownMenuItem>

                              {REVIEW_STATE_OPTIONS.filter((s) => s !== c.reviewState).map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() => updateReviewMutation.mutate({ id: c.id, reviewState: s })}
                                  className="capitalize"
                                >
                                  Review: {s.replace('_', ' ')}
                                </DropdownMenuItem>
                              ))}

                              {STATUS_OPTIONS.filter((s) => s !== c.status).map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() => updateStatusMutation.mutate({ id: c.id, status: s })}
                                  className="capitalize"
                                >
                                  Status: {s.replace('_', ' ')}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-caption text-muted-foreground">
                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;

                  return (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'ghost'}
                      size="icon"
                      className="w-8 h-8 text-caption"
                      onClick={() => setPage(p)}
                    >
                      {p + 1}
                    </Button>
                  );
                })}

                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create New Case</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Category</Label>
                <select
                  value={newCase.category}
                  onChange={(e) => setNewCase((f) => ({ ...f, category: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-body-sm text-foreground"
                >
                  {[
                    'Authorization Review',
                    'Documentation Gap',
                    'Exception Handling',
                    'Compliance Check',
                    'Routing Decision',
                    'Risk Assessment',
                    'General',
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Severity</Label>
                <select
                  value={newCase.severity}
                  onChange={(e) => setNewCase((f) => ({ ...f, severity: e.target.value as SeverityLevel }))}
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-body-sm text-foreground"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Source</Label>
                <select
                  value={newCase.source}
                  onChange={(e) => setNewCase((f) => ({ ...f, source: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-body-sm text-foreground"
                >
                  {['Manual Entry', 'Portal Submission', 'API Ingest', 'Batch Upload', 'Partner Feed'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Amount</Label>
                <Input
                  type="number"
                  value={newCase.amount}
                  onChange={(e) => setNewCase((f) => ({ ...f, amount: e.target.value }))}
                  className="bg-surface-2"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Description</Label>
              <Textarea
                value={newCase.description}
                onChange={(e) => setNewCase((f) => ({ ...f, description: e.target.value }))}
                className="bg-surface-2"
                rows={3}
                placeholder="Describe the case..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>

            <Button variant="hero" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}