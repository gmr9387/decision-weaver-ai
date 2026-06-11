export interface DecisionTraceInput {
  traceId: string;
  organizationId: string;
  caseId?: string | null;
  mode: string;
  decision: string;
  totalRules: number;
  firedCount: number;
  firedRuleIds: string[];
  missingFacts: string[];
  contradictions: string[];
  evidenceRefs: string[];
  candidateDecisions: Array<{
    decision: string;
    score: number;
  }>;
  confidenceInputs: {
    ruleStrength: number;
    corroboratingSignals: number;
    evidenceCompleteness: number;
    dataQuality: number;
    contradictionPenalty: number;
    contradictionSeverityPenalty: number;
    missingFactPenalty: number;
    aiConfidenceAdjustment: number;
  };
  firedRules: any[];
}

export function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildDecisionTrace(input: DecisionTraceInput) {
  return {
    traceId: input.traceId,
    organizationId: input.organizationId,
    caseId: input.caseId ?? null,
    evaluatedAt: new Date().toISOString(),
    mode: input.mode,
    deterministicDecision: input.decision,
    deterministicDecisionPreserved: true,
    rulesEvaluated: input.totalRules,
    rulesFired: input.firedCount,
    firedRuleIds: input.firedRuleIds,
    missingFacts: input.missingFacts,
    contradictions: input.contradictions,
    evidenceRefs: input.evidenceRefs,
    candidateDecisions: input.candidateDecisions,
    confidenceInputs: {
      ruleStrength: roundOne(input.confidenceInputs.ruleStrength),
      corroboratingSignals: roundOne(input.confidenceInputs.corroboratingSignals),
      evidenceCompleteness: roundOne(input.confidenceInputs.evidenceCompleteness),
      dataQuality: roundOne(input.confidenceInputs.dataQuality),
      contradictionPenalty: input.confidenceInputs.contradictionPenalty,
      contradictionSeverityPenalty: input.confidenceInputs.contradictionSeverityPenalty,
      missingFactPenalty: input.confidenceInputs.missingFactPenalty,
      aiConfidenceAdjustment: input.confidenceInputs.aiConfidenceAdjustment,
    },
    ruleTrace: input.firedRules.map((rule) => ({
      ruleId: rule.ruleId,
      rule_id: rule.rule_id,
      ruleName: rule.ruleName,
      rule_name: rule.rule_name,
      ruleVersion: rule.ruleVersion,
      rule_version: rule.rule_version,
      ruleSnapshotId: rule.ruleSnapshotId,
      rule_snapshot_id: rule.rule_snapshot_id,
      name: rule.name,
      priority: rule.priority,
      fired: rule.fired,
      conditionsMet: rule.conditionsMet,
      conditionsUnmet: rule.conditionsUnmet,
      confidenceImpact: rule.confidenceImpact,
      explanation: rule.explanation,
    })),
  };
}