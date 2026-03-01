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
import { ArrowLeft, Loader2, Play, RotateCcw } from 'lucide-react';
import type { InferenceMode } from '@/lib/types';
import { decisionColors, severityColors } from '@/components/cases/constants';
import { OverviewTab } from '@/components/cases/OverviewTab';
import { FactsTab } from '@/components/cases/FactsTab';
import { InferenceTab } from '@/components/cases/InferenceTab';
import { RulesTraceTab } from '@/components/cases/RulesTraceTab';
import { HistoryTab } from '@/components/cases/HistoryTab';
import { EvidenceTab } from '@/components/cases/EvidenceTab';

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
            <Link to="/cases"><Button variant="ghost" className="mt-4">Back to Cases</Button></Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const ir = caseData.inferenceResult;

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
            <Button variant="hero" size="sm" className="gap-1.5" onClick={handleRunInference} disabled={runInference.isPending || caseData.facts.length === 0}>
              {runInference.isPending ? <><Loader2 className="w-3 h-3 animate-spin" /> Running...</> : <><Play className="w-3 h-3" /> Run Inference</>}
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
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
          </TabsList>

          <OverviewTab caseData={caseData} ir={ir} onRunInference={handleRunInference} isRunning={runInference.isPending} canRun={caseData.facts.length > 0} />
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
