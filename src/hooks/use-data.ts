import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MOCK_CASES, MOCK_RULES, MOCK_METRICS } from '@/lib/mock-data';
import type {
  Case,
  Rule,
  DailyMetric,
  InferenceResult,
  Fact,
  DecisionTrace,
  ConfidenceBreakdown,
} from '@/lib/types';
import type { Tables } from '@/integrations/supabase/types';

const DEMO_MODE =
  String(import.meta.env.VITE_DEMO_MODE ?? '').toLowerCase() === 'true';

function demoFallback<T>(mockValue: T, reason: string): T {
  console.warn(`[Weaver demo fallback] ${reason}`);
  return mockValue;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asObject<T extends Record<string, unknown>>(value: unknown, fallback: T): T {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as T)
    : fallback;
}

function jsonToString(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return '{}';
  }
}

function safeDate(value?: string | null): string {
  if (!value) return '—';
  return value.split('T')[0] || value;
}

function normalizeConfidenceBreakdown(raw: unknown): ConfidenceBreakdown {
  const breakdown = asObject(raw, {});

  return {
    ruleStrength: Number(breakdown.ruleStrength ?? 0),
    corroboratingSignals: Number(breakdown.corroboratingSignals ?? 0),
    evidenceCompleteness: Number(breakdown.evidenceCompleteness ?? 0),
    dataQuality: Number(breakdown.dataQuality ?? 0),
    contradictionPenalty: Number(breakdown.contradictionPenalty ?? 0),
    missingFactPenalty: Number(breakdown.missingFactPenalty ?? 0),
    aiConfidenceAdjustment:
      breakdown.aiConfidenceAdjustment !== undefined
        ? Number(breakdown.aiConfidenceAdjustment)
        : undefined,
    finalAdjusted: Number(breakdown.finalAdjusted ?? 0),
  };
}

function normalizeDecisionTrace(raw: unknown): DecisionTrace | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  return raw as DecisionTrace;
}

function dbInferenceToResult(row: Tables<'inference_runs'>): InferenceResult {
  const candidates = asArray(row.candidate_decisions);
  const firedRules = asArray(row.fired_rules);
  const trace = normalizeDecisionTrace((row as any).decision_trace);

  return {
    decision: (row.decision || 'unresolved') as InferenceResult['decision'],
    confidence: Number(row.confidence || 0),
    confidenceBand: (row.confidence_band || 'low') as InferenceResult['confidenceBand'],
    severity: (row.severity || 'medium') as InferenceResult['severity'],
    explanation: row.explanation || '',
    candidateDecisions: candidates as InferenceResult['candidateDecisions'],
    confidenceBreakdown: normalizeConfidenceBreakdown(row.confidence_breakdown),
    firedRules: firedRules as InferenceResult['firedRules'],
    recommendations: [],
    missingFacts: asArray<string>(row.missing_facts),
    contradictions: asArray<string>(row.contradictions),
    evidenceRefs: asArray<string>(row.evidence_refs),
    mode: (row.mode || 'instant') as InferenceResult['mode'],
    deterministicDecisionPreserved:
      trace?.deterministicDecisionPreserved ??
      (row as any).deterministic_decision_preserved ??
      undefined,
    aiAssessment: (row as any).ai_assessment ?? undefined,
    aiSuggestedDecision: (row as any).ai_suggested_decision ?? undefined,
    decisionTrace: trace,
  };
}

function dbCaseToCase(
  row: Tables<'cases'>,
  inferenceRun?: Tables<'inference_runs'> | null,
): Case {
  const ir = inferenceRun ? dbInferenceToResult(inferenceRun) : undefined;
  const orgId = (row as any).organization_id ?? null;

  return {
    id: row.id,
    caseNumber: row.case_number,
    category: row.category,
    source: row.source,
    status: row.status as Case['status'],
    decision: ir?.decision,
    confidence: ir?.confidence,
    confidenceBand: ir?.confidenceBand,
    severity: row.severity as Case['severity'],
    owner: row.owner || 'Unassigned',
    reviewState: row.review_state as Case['reviewState'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    amount: row.amount ?? undefined,
    description: row.description || '',
    facts: [],
    inferenceResult: ir,
    tags: row.tags || [],
    organizationId: orgId,
    organization_id: orgId,
  } as Case & { organizationId?: string | null; organization_id?: string | null };
}

function dbRuleToRule(row: Tables<'rules'>): Rule {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category,
    type: row.rule_type as Rule['type'],
    priority: Number(row.priority ?? 5),
    enabled: Boolean(row.enabled),
    conditions: jsonToString(row.conditions),
    output: jsonToString(row.output),
    confidenceImpact: Number(row.confidence_impact || 0),
    explanationTemplate: row.explanation_template || '',
    version: Number(row.version || 1),
    lastModified: safeDate(row.updated_at),
    hitCount: Number((row as any).hit_count || 0),
  };
}

function dbMetricToMetric(row: Tables<'daily_metrics'>): DailyMetric {
  return {
    date: row.date,
    processed: Number(row.processed || 0),
    autoResolved: Number(row.auto_resolved || 0),
    escalated: Number(row.escalated || 0),
    avgConfidence: Number(row.avg_confidence || 0),
    avgTimeToDecision: Number(row.avg_time_to_decision || 0),
  };
}

function dbFactToFact(row: Tables<'case_facts'>): Fact {
  return {
    key: row.fact_key,
    value: row.fact_value as any,
    source: row.source || 'Unknown',
    quality: row.quality as Fact['quality'],
    derived: row.is_derived || false,
  };
}

export function useCases() {
  return useQuery({
    queryKey: ['cases'],
    queryFn: async (): Promise<Case[]> => {
      const { data: cases, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (DEMO_MODE) return demoFallback(MOCK_CASES, `cases query failed: ${error.message}`);
        throw new Error(`Failed to load cases: ${error.message}`);
      }

      if (!cases || cases.length === 0) {
        return DEMO_MODE ? demoFallback(MOCK_CASES, 'cases table empty') : [];
      }

      const caseIds = cases.map((c) => c.id);

      const [{ data: runs, error: runsError }, { data: facts, error: factsError }] =
        await Promise.all([
          supabase
            .from('inference_runs')
            .select('*')
            .in('case_id', caseIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('case_facts')
            .select('*')
            .in('case_id', caseIds),
        ]);

      if (runsError) {
        if (DEMO_MODE) return demoFallback(MOCK_CASES, `inference_runs query failed: ${runsError.message}`);
        throw new Error(`Failed to load inference runs: ${runsError.message}`);
      }

      if (factsError) {
        if (DEMO_MODE) return demoFallback(MOCK_CASES, `case_facts query failed: ${factsError.message}`);
        throw new Error(`Failed to load case facts: ${factsError.message}`);
      }

      const latestRunMap = new Map<string, Tables<'inference_runs'>>();

      for (const run of runs || []) {
        if (!latestRunMap.has(run.case_id)) {
          latestRunMap.set(run.case_id, run);
        }
      }

      const factsMap = new Map<string, Fact[]>();

      for (const fact of facts || []) {
        const list = factsMap.get(fact.case_id) || [];
        list.push(dbFactToFact(fact));
        factsMap.set(fact.case_id, list);
      }

      return cases.map((row) => {
        const mapped = dbCaseToCase(row, latestRunMap.get(row.id));
        mapped.facts = factsMap.get(row.id) || [];
        return mapped;
      });
    },
    staleTime: 30000,
  });
}

export function useCaseDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['case', id],
    queryFn: async (): Promise<Case | null> => {
      if (!id) return null;

      const { data: caseRow, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (DEMO_MODE) {
          return demoFallback(
            MOCK_CASES.find((c) => c.id === id) || null,
            `case detail query failed: ${error.message}`,
          );
        }

        throw new Error(`Failed to load case ${id}: ${error.message}`);
      }

      if (!caseRow) {
        return DEMO_MODE
          ? demoFallback(MOCK_CASES.find((c) => c.id === id) || null, `case ${id} not found`)
          : null;
      }

      const [{ data: runs, error: runsError }, { data: facts, error: factsError }] =
        await Promise.all([
          supabase
            .from('inference_runs')
            .select('*')
            .eq('case_id', id)
            .order('created_at', { ascending: false })
            .limit(1),
          supabase
            .from('case_facts')
            .select('*')
            .eq('case_id', id),
        ]);

      if (runsError) {
        throw new Error(`Failed to load inference history for case ${id}: ${runsError.message}`);
      }

      if (factsError) {
        throw new Error(`Failed to load facts for case ${id}: ${factsError.message}`);
      }

      const run = runs?.[0] || null;

      let recs: Tables<'recommendations'>[] = [];

      if (run) {
        const { data, error: recsError } = await supabase
          .from('recommendations')
          .select('*')
          .eq('inference_run_id', run.id);

        if (recsError) {
          throw new Error(`Failed to load recommendations for case ${id}: ${recsError.message}`);
        }

        recs = data || [];
      }

      const result = dbCaseToCase(caseRow, run);
      result.facts = (facts || []).map(dbFactToFact);

      if (result.inferenceResult && recs.length > 0) {
        result.inferenceResult.recommendations = recs.map((r) => ({
          title: r.title,
          reason: r.reason || '',
          urgency: (r.urgency || 'medium') as any,
          suggestedOwner: r.suggested_owner || 'Unassigned',
          expectedImpact: r.expected_impact || '',
        }));
      }

      return result;
    },
    enabled: !!id,
    staleTime: 30000,
  });
}

export function useRules() {
  return useQuery({
    queryKey: ['rules'],
    queryFn: async (): Promise<Rule[]> => {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .order('priority', { ascending: true });

      if (error) {
        if (DEMO_MODE) return demoFallback(MOCK_RULES, `rules query failed: ${error.message}`);
        throw new Error(`Failed to load rules: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return DEMO_MODE ? demoFallback(MOCK_RULES, 'rules table empty') : [];
      }

      return data.map(dbRuleToRule);
    },
    staleTime: 30000,
  });
}

export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: async (): Promise<DailyMetric[]> => {
      const { data, error } = await supabase
        .from('daily_metrics')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        if (DEMO_MODE) return demoFallback(MOCK_METRICS, `metrics query failed: ${error.message}`);
        throw new Error(`Failed to load metrics: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return DEMO_MODE ? demoFallback(MOCK_METRICS, 'daily_metrics table empty') : [];
      }

      return data.map(dbMetricToMetric);
    },
    staleTime: 60000,
  });
}

export function useInferenceHistory(caseId: string | undefined) {
  return useQuery({
    queryKey: ['inference-history', caseId],
    queryFn: async () => {
      if (!caseId) return [];

      const { data, error } = await supabase
        .from('inference_runs')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to load inference history for case ${caseId}: ${error.message}`);
      }

      if (!data || data.length === 0) return [];

      return data.map((row) => {
        const result = dbInferenceToResult(row);

        return {
          id: row.id,
          createdAt: row.created_at,
          mode: result.mode,
          decision: result.decision,
          confidence: result.confidence,
          confidenceBand: result.confidenceBand,
          severity: result.severity,
          explanation: result.explanation,
          firedRulesCount: result.firedRules.filter((rule) => rule.fired).length,
          totalRules: result.firedRules.length,
          missingFacts: result.missingFacts,
          contradictions: result.contradictions,
          traceId: result.decisionTrace?.traceId ?? (row as any).trace_id ?? undefined,
        };
      });
    },
    enabled: !!caseId,
    staleTime: 15000,
  });
}