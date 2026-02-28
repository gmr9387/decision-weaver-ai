import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCaseDetail } from '@/hooks/use-data';
import { useRunInference } from '@/hooks/use-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Clock, Shield,
  FileText, Zap, RotateCcw, BrainCircuit, Loader2, Play, Plus, Trash2
} from 'lucide-react';
import type { DecisionType, SeverityLevel, InferenceMode } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const decisionIcons: Record<string, any> = {
  approve: CheckCircle2, deny: AlertTriangle, flag: BrainCircuit, escalate: ArrowLeft,
  review: FileText, request_info: FileText, route: Zap, monitor: BrainCircuit, unresolved: Clock,
};

const decisionColors: Record<DecisionType, string> = {
  approve: 'success', deny: 'destructive', flag: 'warning', escalate: 'critical',
  review: 'info', request_info: 'warning', route: 'secondary', monitor: 'secondary', unresolved: 'outline',
};

const severityColors: Record<SeverityLevel, string> = {
  low: 'success', medium: 'warning', high: 'critical', critical: 'destructive',
};

function ConfidenceBreakdownViz({ breakdown }: { breakdown: any }) {
  const items = [
    { label: 'Rule Strength', value: breakdown.ruleStrength, color: 'bg-primary' },
    { label: 'Corroborating Signals', value: breakdown.corroboratingSignals, color: 'bg-info' },
    { label: 'Evidence Completeness', value: breakdown.evidenceCompleteness, color: 'bg-success' },
    { label: 'Data Quality', value: breakdown.dataQuality, color: 'bg-primary' },
    { label: 'Contradiction Penalty', value: breakdown.contradictionPenalty, color: 'bg-destructive', negative: true },
    { label: 'Missing Fact Penalty', value: breakdown.missingFactPenalty, color: 'bg-warning', negative: true },
  ];

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.label}>
    <div className="flex items-center justify-between mb-1">
            <span className="text-body-sm text-muted-foreground">{item.label}</span>
            <span className="text-caption font-mono text-foreground">
              {item.negative ? '-' : '+'}{Math.abs(item.value).toFixed(0)}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-3">
            <div
              className={`h-full rounded-full ${item.color} transition-all`}
              style={{ width: `${Math.min(100, Math.abs(item.value))}%` }}
            />
          </div>
        </div>
      ))}
      <div className="pt-3 border-t border-border flex items-center justify-between">
        <span className="text-body-sm font-semibold text-foreground">Final Adjusted</span>
        <span className="text-body-md font-semibold text-primary font-mono">
          {breakdown.finalAdjusted.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export default function CaseDetail() {
  const { id } = useParams();
  const { data: caseData, isLoading } = useCaseDetail(id);
  const runInference = useRunInference();
  const [inferenceMode, setInferenceMode] = useState<InferenceMode>('instant');
  const [newFactKey, setNewFactKey] = useState('');
  const [newFactValue, setNewFactValue] = useState('');
  const [newFactSource, setNewFactSource] = useState('Manual');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addFactMutation = useMutation({
    mutationFn: async () => {
      if (!id || !newFactKey.trim()) throw new Error('Fact key is required');
      let parsedValue: any = newFactValue;
      if (!isNaN(Number(newFactValue)) && newFactValue.trim() !== '') parsedValue = Number(newFactValue);
      else if (newFactValue === 'true') parsedValue = true;
      else if (newFactValue === 'false') parsedValue = false;

      const { error } = await supabase.from('case_facts').insert({
        case_id: id,
        fact_key: newFactKey.trim(),
        fact_value: parsedValue,
        source: newFactSource,
        quality: 'unverified',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      setNewFactKey('');
      setNewFactValue('');
      toast({ title: 'Fact added' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const handleRunInference = () => {
    if (!caseData || !id) return;
    const factsMap: Record<string, unknown> = {};
    for (const f of caseData.facts) {
      factsMap[f.key] = f.value;
    }
    runInference.mutate({ caseId: id, facts: factsMap, mode: inferenceMode });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!caseData) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-display-sm text-foreground">Case not found</h2>
            <Link to="/cases"><Button variant="ghost" className="mt-4">Back to Cases</Button></Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const ir = caseData.inferenceResult;
  const DecIcon = ir ? (decisionIcons[ir.decision] || FileText) : Clock;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Link to="/cases">
            <Button variant="ghost" size="icon" className="mt-1"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-display-sm text-foreground">{caseData.caseNumber}</h1>
              <Badge variant={severityColors[caseData.severity] as any} className="capitalize">{caseData.severity}</Badge>
              {ir && <Badge variant={decisionColors[ir.decision] as any} className="capitalize">{ir.decision.replace('_', ' ')}</Badge>}
              {ir && <Badge variant="confidence" className="font-mono">{ir.confidence.toFixed(1)}%</Badge>}
            </div>
            <p className="text-body-sm text-muted-foreground">{caseData.category} · {caseData.source} · {caseData.owner}</p>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={inferenceMode} onValueChange={v => setInferenceMode(v as InferenceMode)}>
              <SelectTrigger className="w-32 h-9 bg-surface-2 border-border text-body-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant</SelectItem>
                <SelectItem value="deep">Deep</SelectItem>
                <SelectItem value="assisted">AI Assisted</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="hero"
              size="sm"
              className="gap-1.5"
              onClick={handleRunInference}
              disabled={runInference.isPending || caseData.facts.length === 0}
            >
              {runInference.isPending ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Running...</>
              ) : (
                <><Play className="w-3 h-3" /> Run Inference</>
              )}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRunInference} disabled={runInference.isPending}>
              <RotateCcw className="w-3 h-3" /> Re-run
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-surface-2 border border-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="facts">Facts</TabsTrigger>
            <TabsTrigger value="inference">Inference</TabsTrigger>
            <TabsTrigger value="rules">Rules Trace</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-xl border border-border bg-gradient-card p-6 space-y-4">
                <h3 className="text-body-md font-semibold text-foreground flex items-center gap-2">
                  <DecIcon className="w-4 h-4 text-primary" /> Decision Summary
                </h3>
                {ir ? (
                  <>
                    <p className="text-body-sm text-muted-foreground">{ir.explanation}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">Mode: {ir.mode}</Badge>
                      <Badge variant="secondary">{ir.firedRules.filter(r => r.fired).length} rules fired</Badge>
                      {ir.missingFacts.length > 0 && <Badge variant="warning">{ir.missingFacts.length} missing facts</Badge>}
                      {ir.contradictions.length > 0 && <Badge variant="critical">{ir.contradictions.length} contradictions</Badge>}
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-body-sm text-muted-foreground">Inference has not been run for this case yet.</p>
                    <Button variant="hero" size="sm" className="gap-1.5" onClick={handleRunInference} disabled={runInference.isPending || caseData.facts.length === 0}>
                      {runInference.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      Run Inference Now
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-gradient-card p-6">
                <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Confidence
                </h3>
                {ir ? <ConfidenceBreakdownViz breakdown={ir.confidenceBreakdown} /> : <p className="text-body-sm text-muted-foreground">—</p>}
              </div>
            </div>

            {ir && ir.recommendations.length > 0 && (
              <div className="rounded-xl border border-border bg-gradient-card p-6">
                <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" /> Recommended Actions
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {ir.recommendations.map((rec, i) => (
                    <div key={i} className="p-4 rounded-lg bg-surface-2 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-body-sm font-medium text-foreground">{rec.title}</span>
                        <Badge variant={rec.urgency === 'critical' ? 'critical' : rec.urgency === 'high' ? 'warning' : 'secondary'} className="capitalize text-caption">{rec.urgency}</Badge>
                      </div>
                      <p className="text-caption text-muted-foreground mb-2">{rec.reason}</p>
                      <div className="flex items-center justify-between text-caption text-muted-foreground">
                        <span>Owner: {rec.suggestedOwner}</span>
                        <span>Impact: {rec.expectedImpact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-gradient-card p-6">
                <h3 className="text-body-md font-semibold text-foreground mb-4">Case Details</h3>
                <dl className="space-y-3 text-body-sm">
                  {[
                    ['Case ID', caseData.caseNumber],
                    ['Category', caseData.category],
                    ['Source', caseData.source],
                    ['Status', caseData.status],
                    ['Owner', caseData.owner],
                    ['Review State', caseData.reviewState],
                    ['Amount', caseData.amount ? `$${caseData.amount.toLocaleString()}` : '—'],
                    ['Created', new Date(caseData.createdAt).toLocaleString()],
                    ['Updated', new Date(caseData.updatedAt).toLocaleString()],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="text-foreground font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="rounded-xl border border-border bg-gradient-card p-6">
                <h3 className="text-body-md font-semibold text-foreground mb-4">Candidate Decisions</h3>
                {ir ? (
                  <div className="space-y-3">
                    {ir.candidateDecisions.map((cd, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={i === 0 ? (decisionColors[cd.decision] as any) : 'secondary'} className="capitalize">{cd.decision.replace('_', ' ')}</Badge>
                          {i === 0 && <span className="text-caption text-primary">← selected</span>}
                        </div>
                        <span className="text-body-sm font-mono text-muted-foreground">{cd.score.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-body-sm text-muted-foreground">—</p>}
              </div>
            </div>
          </TabsContent>

          {/* Facts */}
          <TabsContent value="facts" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-gradient-card p-6">
                <h3 className="text-body-md font-semibold text-foreground mb-4">Normalized Facts</h3>
                {caseData.facts.length > 0 ? (
                  <div className="space-y-2">
                    {caseData.facts.filter(f => f.quality !== 'missing').map(fact => (
                      <div key={fact.key} className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                        <div>
                          <span className="text-body-sm font-medium text-foreground font-mono">{fact.key}</span>
                          {fact.derived && <Badge variant="info" className="ml-2 text-caption">derived</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-body-sm text-foreground">{String(fact.value)}</span>
                          <Badge variant={fact.quality === 'verified' ? 'success' : fact.quality === 'inferred' ? 'info' : 'warning'} className="capitalize text-caption">{fact.quality}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-sm text-muted-foreground">No facts recorded for this case yet. Add facts below to enable inference.</p>
                )}
                {/* Add fact form */}
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <h4 className="text-body-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Fact
                  </h4>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <span className="text-caption text-muted-foreground">Key</span>
                      <Input value={newFactKey} onChange={e => setNewFactKey(e.target.value)} placeholder="e.g. amount_requested" className="bg-surface-3 h-8 text-body-sm font-mono" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="text-caption text-muted-foreground">Value</span>
                      <Input value={newFactValue} onChange={e => setNewFactValue(e.target.value)} placeholder="e.g. 25000" className="bg-surface-3 h-8 text-body-sm" />
                    </div>
                    <div className="w-24 space-y-1">
                      <span className="text-caption text-muted-foreground">Source</span>
                      <Input value={newFactSource} onChange={e => setNewFactSource(e.target.value)} className="bg-surface-3 h-8 text-body-sm" />
                    </div>
                    <Button size="sm" variant="hero" className="h-8 gap-1" onClick={() => addFactMutation.mutate()} disabled={addFactMutation.isPending || !newFactKey.trim()}>
                      {addFactMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Add
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-gradient-card p-6">
                  <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" /> Missing Facts
                  </h3>
                  {ir && ir.missingFacts.length > 0 ? (
                    <div className="space-y-2">
                      {ir.missingFacts.map(mf => (
                        <div key={mf} className="p-3 rounded-lg bg-warning/5 border border-warning/20 text-body-sm text-warning font-mono">{mf}</div>
                      ))}
                    </div>
                  ) : <p className="text-body-sm text-muted-foreground">No missing facts detected.</p>}
                </div>
                {ir && ir.contradictions.length > 0 && (
                  <div className="rounded-xl border border-border bg-gradient-card p-6">
                    <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" /> Contradictions
                    </h3>
                    <div className="space-y-2">
                      {ir.contradictions.map((c, i) => (
                        <div key={i} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-body-sm text-destructive">{c}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Inference */}
          <TabsContent value="inference" className="space-y-4">
            {ir ? (
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-gradient-card p-6">
                  <h3 className="text-body-md font-semibold text-foreground mb-4">Inference Result</h3>
                  <dl className="space-y-3 text-body-sm">
                    {[
                      ['Decision', ir.decision],
                      ['Confidence', `${ir.confidence.toFixed(1)}%`],
                      ['Confidence Band', ir.confidenceBand],
                      ['Severity', ir.severity],
                      ['Mode', ir.mode],
                      ['Rules Fired', `${ir.firedRules.filter(r => r.fired).length}/${ir.firedRules.length}`],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="text-foreground font-medium capitalize">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="rounded-xl border border-border bg-gradient-card p-6">
                  <h3 className="text-body-md font-semibold text-foreground mb-4">Explanation</h3>
                  <p className="text-body-sm text-muted-foreground leading-relaxed">{ir.explanation}</p>
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="text-caption text-muted-foreground uppercase mb-2">Evidence References</h4>
                    <div className="flex flex-wrap gap-2">
                      {ir.evidenceRefs.map(ref => <Badge key={ref} variant="secondary" className="font-mono text-caption">{ref}</Badge>)}
                    </div>
                  </div>
                </div>
              </div>
            ) : <p className="text-body-sm text-muted-foreground p-6">No inference results available.</p>}
          </TabsContent>

          {/* Rules Trace */}
          <TabsContent value="rules" className="space-y-3">
            {ir ? ir.firedRules.map((rule, idx) => (
              <div key={rule.ruleId || idx} className={`rounded-xl border p-5 ${rule.fired ? 'border-primary/30 bg-primary/5' : 'border-border bg-gradient-card'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={rule.fired ? 'default' : 'secondary'}>{rule.fired ? 'Fired' : 'Not Fired'}</Badge>
                    <span className="text-body-sm font-semibold text-foreground">{rule.name}</span>
                    <Badge variant="outline" className="text-caption capitalize">{rule.type}</Badge>
                  </div>
                  <span className="text-caption text-muted-foreground font-mono">Priority: {rule.priority}</span>
                </div>
                <p className="text-body-sm text-muted-foreground mb-3">{rule.explanation}</p>
                <div className="flex flex-wrap gap-4 text-caption">
                  <div>
                    <span className="text-muted-foreground">Conditions Met: </span>
                    <span className="text-success font-mono">{rule.conditionsMet.join(', ')}</span>
                  </div>
                  {rule.conditionsUnmet.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Unmet: </span>
                      <span className="text-destructive font-mono">{rule.conditionsUnmet.join(', ')}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Output: </span>
                    <span className="text-foreground font-mono">{rule.output}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence Impact: </span>
                    <span className={`font-mono ${rule.confidenceImpact >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {rule.confidenceImpact >= 0 ? '+' : ''}{rule.confidenceImpact}
                    </span>
                  </div>
                </div>
              </div>
            )) : <p className="text-body-sm text-muted-foreground p-6">No rules trace available.</p>}
          </TabsContent>

          {/* Evidence */}
          <TabsContent value="evidence" className="space-y-4">
            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <h3 className="text-body-md font-semibold text-foreground mb-4">Evidence References</h3>
              {ir ? (
                <div className="space-y-2">
                  {ir.evidenceRefs.map(ref => (
                    <div key={ref} className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                      <span className="text-body-sm font-mono text-foreground">{ref}</span>
                      <Badge variant="secondary">Source Document</Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="text-body-sm text-muted-foreground">No evidence available.</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
