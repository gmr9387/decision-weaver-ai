import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCaseDetail, useInferenceHistory } from '@/hooks/use-data';
import { useRunInference } from '@/hooks/use-actions';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  GitBranch,
  FileSearch,
  Brain,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { InferenceMode } from '@/lib/types';
import { decisionColors, severityColors } from '@/components/cases/constants';
import { OverviewTab } from '@/components/cases/OverviewTab';
import { FactsTab } from '@/components/cases/FactsTab';
import { InferenceTab } from '@/components/cases/InferenceTab';
import { RulesTraceTab } from '@/components/cases/RulesTraceTab';
import { HistoryTab } from '@/components/cases/HistoryTab';
import { EvidenceTab } from '@/components/cases/EvidenceTab';

type DecisionTrace = {
  traceId?: string;
  evaluatedAt?: string;
  deterministicDecision?: string;
  deterministicDecisionPreserved?: boolean;
  rulesEvaluated?: number;
  rulesFired?: number;
  firedRuleIds?: string[];
  missingFacts?: string[];
  contradictions?: string[];
  evidenceRefs?: string[];
  candidateDecisions?: { decision: string; score: number }[];
  confidenceInputs?: Record<string, number>;
  ruleTrace?: {
    ruleId: string;
    name: string;
    priority: number;
    fired: boolean;
    conditionsMet: string[];
    conditionsUnmet: string[];
    confidenceImpact: number;
    explanation?: string;
  }[];
};

function getTrace(ir: any): DecisionTrace | null {
  return ir?.decisionTrace ?? ir?.decision_trace ?? null;
}

function formatDate(value?: string) {
  if (!value) return 'Not recorded';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function DecisionTrustPanel({ ir }: { ir: any }) {
  if (!ir) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-border bg-surface-2 p-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">No inference run yet</h2>
            <p className="text-sm text-muted-foreground">
              Run inference to generate a deterministic decision trace for this case.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const trace = getTrace(ir);
  const confidenceBreakdown = ir.confidenceBreakdown ?? ir.confidence_breakdown ?? {};
  const firedRules = trace?.ruleTrace?.filter((r) => r.fired) ?? ir.firedRules?.filter((r: any) => r.fired) ?? [];
  const missingFacts = trace?.missingFacts ?? ir.missingFacts ?? ir.missing_facts ?? [];
  const contradictions = trace?.contradictions ?? ir.contradictions ?? [];
  const evidenceRefs = trace?.evidenceRefs ?? ir.evidenceRefs ?? ir.evidence_refs ?? [];
  const candidateDecisions = trace?.candidateDecisions ?? ir.candidateDecisions ?? ir.candidate_decisions ?? [];

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Decision Trust Package</h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            This view explains how Weaver reached its decision: rules fired, facts missing,
            contradictions found, evidence referenced, and confidence inputs used.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={decisionColors[ir.decision] as any} className="capitalize">
            {String(ir.decision || 'unresolved').replace('_', ' ')}
          </Badge>
          <Badge variant="confidence" className="font-mono">
            {Number(ir.confidence ?? 0).toFixed(1)}%
          </Badge>
          <Badge variant={severityColors[ir.severity] as any} className="capitalize">
            {ir.severity || 'medium'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Rules Fired</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {trace?.rulesFired ?? firedRules.length}
            <span className="text-sm text-muted-foreground"> / {trace?.rulesEvaluated ?? '—'}</span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Missing Facts</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{missingFacts.length}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Contradictions</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{contradictions.length}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Trace ID</p>
          <p className="mt-1 truncate font-mono text-sm text-foreground">
            {trace?.traceId ?? ir.trace_id ?? 'Not persisted'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface-2 p-4 xl:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Decision Timeline</h3>
          </div>

          <div className="space-y-3">
            <TimelineRow
              icon={<FileSearch className="h-4 w-4" />}
              title="Facts evaluated"
              detail={`${Object.keys(ir.input_snapshot ?? {}).length || 'Case'} facts were evaluated against enabled rules.`}
            />
            <TimelineRow
              icon={<CheckCircle2 className="h-4 w-4" />}
              title="Rules fired"
              detail={`${trace?.rulesFired ?? firedRules.length} rule(s) fired and contributed to the decision.`}
            />
            <TimelineRow
              icon={contradictions.length > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              title="Contradiction check"
              detail={contradictions.length > 0 ? `${contradictions.length} contradiction(s) found.` : 'No contradictions detected.'}
            />
            <TimelineRow
              icon={<Brain className="h-4 w-4" />}
              title="Final decision"
              detail={`Deterministic decision preserved: ${String(trace?.deterministicDecision ?? ir.decision).replace('_', ' ')}.`}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <h3 className="font-semibold text-foreground mb-3">Confidence Inputs</h3>
          <div className="space-y-2">
            {Object.entries(confidenceBreakdown).length > 0 ? (
              Object.entries(confidenceBreakdown).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="font-mono text-foreground">{String(value)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No confidence breakdown available.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <h3 className="font-semibold text-foreground mb-3">Top Candidate Decisions</h3>
          <div className="space-y-2">
            {candidateDecisions.length > 0 ? (
              candidateDecisions.map((c: any) => (
                <div key={c.decision} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-foreground">{String(c.decision).replace('_', ' ')}</span>
                  <span className="font-mono text-muted-foreground">{c.score}%</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No alternate decisions recorded.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <h3 className="font-semibold text-foreground mb-3">Missing Facts</h3>
          <div className="space-y-2">
            {missingFacts.length > 0 ? (
              missingFacts.slice(0, 6).map((fact: string) => (
                <div key={fact} className="flex items-center gap-2 text-sm">
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                  <span className="font-mono text-foreground">{fact}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No missing facts detected.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <h3 className="font-semibold text-foreground mb-3">Evidence References</h3>
          <div className="space-y-2">
            {evidenceRefs.length > 0 ? (
              evidenceRefs.slice(0, 6).map((ref: string) => (
                <div key={ref} className="text-sm font-mono text-foreground truncate">{ref}</div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No evidence references recorded.</p>
            )}
          </div>
        </div>
      </div>

      {ir.aiAssessment && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-foreground">AI Advisory</h3>
            <Badge variant="outline">Non-deterministic</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{ir.aiAssessment}</p>
          {ir.aiSuggestedDecision && (
            <p className="mt-2 text-xs text-muted-foreground">
              Suggested: <span className="font-mono">{ir.aiSuggestedDecision}</span>. Deterministic decision was preserved.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TimelineRow({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 rounded-lg border border-border bg-background p-1.5 text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export default function CaseDetail() {
  const { id } = useParams();
  const { data: caseData, isLoading } = useCaseDetail(id);
  const { data: inferenceHistory = [] } = useInferenceHistory(id);
  const runInference = useRunInference();
  const [inferenceMode, setInferenceMode] = useState<InferenceMode>('instant');
  const { requireAuth } = useAuthGate();

  const handleRunInference = () => {
    if (!requireAuth('run inference')) return;
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
            <Link to="/cases">
              <Button variant="ghost" className="mt-4">Back to Cases</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const ir = caseData.inferenceResult;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-start gap-4">
          <Link to="/cases">
            <Button variant="ghost" size="icon" className="mt-1">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-display-sm text-foreground">{caseData.caseNumber}</h1>
              <Badge variant={severityColors[caseData.severity] as any} className="capitalize">
                {caseData.severity}
              </Badge>
              {ir && (
                <Badge variant={decisionColors[ir.decision] as any} className="capitalize">
                  {ir.decision.replace('_', ' ')}
                </Badge>
              )}
              {ir && (
                <Badge variant="confidence" className="font-mono">
                  {ir.confidence.toFixed(1)}%
                </Badge>
              )}
            </div>

            <p className="text-body-sm text-muted-foreground">
              {caseData.category} · {caseData.source} · {caseData.owner}
            </p>
          </div>

          <div className="flex gap-2 items-center">
            <Select value={inferenceMode} onValueChange={(v) => setInferenceMode(v as InferenceMode)}>
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
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Running...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" /> Run Inference
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleRunInference}
              disabled={runInference.isPending}
            >
              <RotateCcw className="w-3 h-3" /> Re-run
            </Button>
          </div>
        </div>

        <DecisionTrustPanel ir={ir} />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-surface-2 border border-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="facts">Facts</TabsTrigger>
            <TabsTrigger value="inference">Inference</TabsTrigger>
            <TabsTrigger value="rules">Rules Trace</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
          </TabsList>

          <OverviewTab
            caseData={caseData}
            ir={ir}
            onRunInference={handleRunInference}
            isRunning={runInference.isPending}
            canRun={caseData.facts.length > 0}
          />
          <FactsTab caseId={id!} caseData={caseData} ir={ir} />
          <InferenceTab ir={ir} />
          <RulesTraceTab ir={ir} />
          <HistoryTab inferenceHistory={inferenceHistory} />
          <EvidenceTab ir={ir} />
        </Tabs>
      </div>
    </AppLayout>
  );
}