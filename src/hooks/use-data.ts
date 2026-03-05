import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MOCK_CASES, MOCK_RULES, MOCK_METRICS } from '@/lib/mock-data';
import type { Case, Rule, DailyMetric, InferenceResult, Fact } from '@/lib/types';
import type { Tables } from '@/integrations/supabase/types';

// Transform DB row to app Case type
function dbCaseToCase(row: Tables<'cases'>, inferenceRun?: Tables<'inference_runs'> | null): Case {
  const ir = inferenceRun ? dbInferenceToResult(inferenceRun) : undefined;
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
  };
}

function dbInferenceToResult(row: Tables<'inference_runs'>): InferenceResult {
  const breakdown = (row.confidence_breakdown as any) || {};
  const candidates = (row.candidate_decisions as any[]) || [];
  const firedRules = (row.fired_rules as any[]) || [];

  return {
    decision: (row.decision || 'unresolved') as InferenceResult['decision'],
    confidence: row.confidence || 0,
    confidenceBand: (row.confidence_band || 'low') as InferenceResult['confidenceBand'],
    severity: (row.severity || 'medium') as InferenceResult['severity'],
    explanation: row.explanation || '',
    candidateDecisions: candidates,
    confidenceBreakdown: {
      ruleStrength: breakdown.ruleStrength || 0,
      corroboratingSignals: breakdown.corroboratingSignals || 0,
      evidenceCompleteness: breakdown.evidenceCompleteness || 0,
      dataQuality: breakdown.dataQuality || 0,
      contradictionPenalty: breakdown.contradictionPenalty || 0,
      missingFactPenalty: breakdown.missingFactPenalty || 0,
      finalAdjusted: breakdown.finalAdjusted || 0,
    },
    firedRules: firedRules,
    recommendations: [],
    missingFacts: row.missing_facts || [],
    contradictions: row.contradictions || [],
    evidenceRefs: row.evidence_refs || [],
    mode: (row.mode || 'instant') as InferenceResult['mode'],
  };
}

function dbRuleToRule(row: Tables<'rules'>): Rule {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category,
    type: row.rule_type as Rule['type'],
    priority: row.priority,
    enabled: row.enabled,
    conditions: typeof row.conditions === 'string' ? row.conditions : JSON.stringify(row.conditions),
    output: typeof row.output === 'string' ? row.output : JSON.stringify(row.output),
    confidenceImpact: row.confidence_impact || 0,
    explanationTemplate: row.explanation_template || '',
    version: row.version,
    lastModified: row.updated_at.split('T')[0],
    hitCount: (row as any).hit_count || 0,
  };
}

function dbMetricToMetric(row: Tables<'daily_metrics'>): DailyMetric {
  return {
    date: row.date,
    processed: row.processed || 0,
    autoResolved: row.auto_resolved || 0,
    escalated: row.escalated || 0,
    avgConfidence: row.avg_confidence || 0,
    avgTimeToDecision: row.avg_time_to_decision || 0,
  };
}

// ===== HOOKS =====

export function useCases() {
  return useQuery({
    queryKey: ['cases'],
    queryFn: async (): Promise<Case[]> => {
      // Try fetching from Supabase
      const { data: cases, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !cases || cases.length === 0) {
        // Fall back to mock data
        return MOCK_CASES;
      }

      // Fetch latest inference run and facts for each case
      const caseIds = cases.map(c => c.id);
      const [{ data: runs }, { data: facts }] = await Promise.all([
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

      // Map latest run per case
      const latestRunMap = new Map<string, Tables<'inference_runs'>>();
      if (runs) {
        for (const run of runs) {
          if (!latestRunMap.has(run.case_id)) {
            latestRunMap.set(run.case_id, run);
          }
        }
      }

      // Map facts per case
      const factsMap = new Map<string, Fact[]>();
      if (facts) {
        for (const f of facts) {
          const arr = factsMap.get(f.case_id) || [];
          arr.push({
            key: f.fact_key,
            value: f.fact_value as any,
            source: f.source || 'Unknown',
            quality: f.quality as Fact['quality'],
            derived: f.is_derived || false,
          });
          factsMap.set(f.case_id, arr);
        }
      }

      return cases.map(c => {
        const caseObj = dbCaseToCase(c, latestRunMap.get(c.id));
        caseObj.facts = factsMap.get(c.id) || [];
        return caseObj;
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

      if (error || !caseRow) {
        // Fall back to mock
        return MOCK_CASES.find(c => c.id === id) || null;
      }

      // Get inference run
      const { data: runs } = await supabase
        .from('inference_runs')
        .select('*')
        .eq('case_id', id)
        .order('created_at', { ascending: false })
        .limit(1);

      // Get facts
      const { data: facts } = await supabase
        .from('case_facts')
        .select('*')
        .eq('case_id', id);

      // Get recommendations if we have an inference run
      const run = runs?.[0] || null;
      let recs: Tables<'recommendations'>[] = [];
      if (run) {
        const { data } = await supabase
          .from('recommendations')
          .select('*')
          .eq('inference_run_id', run.id);
        recs = data || [];
      }

      const result = dbCaseToCase(caseRow, run);

      // Add facts
      if (facts && facts.length > 0) {
        result.facts = facts.map(f => ({
          key: f.fact_key,
          value: f.fact_value as any,
          source: f.source || 'Unknown',
          quality: f.quality as Fact['quality'],
          derived: f.is_derived || false,
        }));
      }

      // Add recommendations to inference result
      if (result.inferenceResult && recs.length > 0) {
        result.inferenceResult.recommendations = recs.map(r => ({
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

      if (error || !data || data.length === 0) {
        return MOCK_RULES;
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

      if (error || !data || data.length === 0) {
        return MOCK_METRICS;
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

      if (error || !data) return [];
      return data.map(row => ({
        id: row.id,
        createdAt: row.created_at,
        mode: row.mode,
        decision: row.decision || 'unresolved',
        confidence: row.confidence || 0,
        confidenceBand: row.confidence_band || 'low',
        severity: row.severity || 'medium',
        explanation: row.explanation || '',
        firedRulesCount: Array.isArray(row.fired_rules) ? (row.fired_rules as any[]).filter((r: any) => r.fired).length : 0,
        totalRules: Array.isArray(row.fired_rules) ? (row.fired_rules as any[]).length : 0,
        missingFacts: row.missing_facts || [],
        contradictions: row.contradictions || [],
      }));
    },
    enabled: !!caseId,
    staleTime: 15000,
  });
}
