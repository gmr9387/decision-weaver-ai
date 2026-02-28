import type { Case, Rule, DailyMetric, InferenceResult, Fact, FiredRule, ConfidenceBreakdown, Recommendation } from './types';

const categories = ['Authorization Review', 'Documentation Gap', 'Exception Handling', 'Compliance Check', 'Routing Decision', 'Risk Assessment', 'Denial Analysis', 'Threshold Trigger'];
const sources = ['Portal Submission', 'API Ingest', 'Batch Upload', 'Manual Entry', 'Partner Feed', 'Internal Scan'];
const owners = ['Sarah Chen', 'Marcus Rivera', 'Priya Patel', 'James Mitchell', 'Unassigned', 'Auto-Queue', 'Elena Vasquez', 'David Park'];
const tags = ['urgent', 'auto-resolved', 'needs-review', 'escalated', 'documentation', 'high-value', 'recurring', 'first-time', 'complex', 'compliance'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function genFacts(category: string): Fact[] {
  const base: Fact[] = [
    { key: 'submission_date', value: '2024-01-15', source: 'Portal', quality: 'verified' },
    { key: 'document_count', value: Math.floor(Math.random() * 8) + 1, source: 'System', quality: 'verified' },
    { key: 'amount_requested', value: Math.floor(Math.random() * 50000) + 500, source: 'Form', quality: 'verified' },
    { key: 'prior_authorization', value: Math.random() > 0.3, source: 'Registry', quality: Math.random() > 0.5 ? 'verified' : 'unverified' },
    { key: 'requester_tier', value: pick(['standard', 'premium', 'enterprise']), source: 'CRM', quality: 'verified' },
    { key: 'turnaround_days', value: Math.floor(Math.random() * 30) + 1, source: 'System', quality: 'verified' },
    { key: 'exception_code', value: pick(['NONE', 'EXC-001', 'EXC-003', 'EXC-007', 'EXC-012']), source: 'Rules', quality: 'inferred', derived: true },
    { key: 'risk_score', value: +(Math.random() * 100).toFixed(1), source: 'Model', quality: 'inferred', derived: true },
  ];
  if (category === 'Documentation Gap') {
    base.push({ key: 'missing_documents', value: 'authorization_letter', source: 'Scan', quality: 'missing' });
  }
  return base;
}

function genConfidenceBreakdown(conf: number): ConfidenceBreakdown {
  return {
    ruleStrength: Math.min(1, conf / 100 + 0.1),
    corroboratingSignals: Math.min(1, conf / 100 + Math.random() * 0.15),
    evidenceCompleteness: Math.min(1, conf / 100 - Math.random() * 0.1),
    dataQuality: 0.7 + Math.random() * 0.3,
    contradictionPenalty: Math.random() > 0.7 ? -(Math.random() * 0.15) : 0,
    missingFactPenalty: Math.random() > 0.5 ? -(Math.random() * 0.1) : 0,
    finalAdjusted: conf / 100,
  };
}

function genRecommendations(decision: string): Recommendation[] {
  const map: Record<string, Recommendation[]> = {
    approve: [{ title: 'Auto-close case', reason: 'High confidence approval with complete evidence', urgency: 'low', suggestedOwner: 'Auto-Queue', expectedImpact: 'Reduces manual workload' }],
    deny: [
      { title: 'Generate denial notice', reason: 'Policy threshold not met', urgency: 'medium', suggestedOwner: 'Communications', expectedImpact: 'Timely stakeholder notification' },
      { title: 'Flag for appeal eligibility', reason: 'Denial may be contested', urgency: 'low', suggestedOwner: 'Appeals Team', expectedImpact: 'Proactive dispute handling' },
    ],
    escalate: [{ title: 'Route to specialist', reason: 'Complex case requires domain expertise', urgency: 'high', suggestedOwner: 'Senior Analyst', expectedImpact: 'Expert review within SLA' }],
    flag: [{ title: 'Add to monitoring queue', reason: 'Anomaly detected in submission pattern', urgency: 'medium', suggestedOwner: 'Risk Team', expectedImpact: 'Early risk detection' }],
    request_info: [{ title: 'Send documentation request', reason: 'Missing required authorization', urgency: 'high', suggestedOwner: 'Intake Team', expectedImpact: 'Case completion acceleration' }],
    review: [{ title: 'Assign to reviewer', reason: 'Borderline confidence requires human judgment', urgency: 'medium', suggestedOwner: 'Review Queue', expectedImpact: 'Quality assurance' }],
  };
  return map[decision] || [{ title: 'Manual review required', reason: 'System could not determine clear path', urgency: 'medium', suggestedOwner: 'Review Queue', expectedImpact: 'Case resolution' }];
}

function genInferenceResult(severity: string): InferenceResult {
  const decisions = ['approve', 'deny', 'flag', 'escalate', 'review', 'request_info', 'route', 'monitor'] as const;
  const decision = pick([...decisions]);
  const confidence = decision === 'approve' ? 70 + Math.random() * 28 :
                     decision === 'deny' ? 60 + Math.random() * 35 :
                     decision === 'escalate' ? 40 + Math.random() * 30 :
                     30 + Math.random() * 60;
  const band = confidence > 85 ? 'very_high' : confidence > 70 ? 'high' : confidence > 50 ? 'medium' : 'low';
  const mode = confidence > 80 ? 'instant' : confidence > 55 ? 'deep' : 'assisted';

  return {
    decision,
    confidence: +confidence.toFixed(1),
    confidenceBand: band as any,
    severity: severity as any,
    explanation: `Based on ${Math.floor(Math.random() * 6 + 3)} evaluated rules and ${Math.floor(Math.random() * 5 + 2)} evidence signals. ${
      decision === 'approve' ? 'All critical conditions met with strong corroborating evidence.' :
      decision === 'deny' ? 'Policy threshold not satisfied. Key documentation or authorization requirements unmet.' :
      decision === 'escalate' ? 'Case complexity exceeds automated resolution capacity. Expert review recommended.' :
      decision === 'flag' ? 'Anomalous pattern detected requiring further investigation.' :
      decision === 'request_info' ? 'Insufficient evidence to reach determination. Additional documentation required.' :
      'Multiple factors contribute to this determination. See rule trace for details.'
    }`,
    candidateDecisions: [
      { decision, score: confidence },
      { decision: pick(decisions.filter(d => d !== decision)), score: +(confidence - 15 - Math.random() * 20).toFixed(1) },
      { decision: pick(decisions.filter(d => d !== decision)), score: +(confidence - 30 - Math.random() * 15).toFixed(1) },
    ],
    confidenceBreakdown: genConfidenceBreakdown(confidence),
    firedRules: genFiredRules(),
    recommendations: genRecommendations(decision),
    missingFacts: Math.random() > 0.5 ? pickN(['authorization_letter', 'supporting_documentation', 'prior_approval_reference', 'cost_breakdown', 'timeline_verification'], Math.floor(Math.random() * 3 + 1)) : [],
    contradictions: Math.random() > 0.7 ? ['Amount exceeds stated authorization limit', 'Date range conflicts with prior submission'] : [],
    evidenceRefs: pickN(['DOC-2024-001', 'AUTH-REF-445', 'POLICY-3.2.1', 'SRC-PORTAL-LOG', 'HIST-CASE-892', 'REG-CHECK-2024'], Math.floor(Math.random() * 4 + 1)),
    mode,
  };
}

function genFiredRules(): FiredRule[] {
  const ruleNames = [
    'Amount Threshold Check', 'Documentation Completeness', 'Authorization Validation',
    'Risk Score Evaluation', 'Turnaround SLA Check', 'Exception Code Handler',
    'Prior History Assessment', 'Compliance Requirement', 'Auto-Resolution Eligibility',
  ];
  return pickN(ruleNames, Math.floor(Math.random() * 5 + 3)).map((name, i) => ({
    ruleId: `RULE-${String(i + 1).padStart(3, '0')}`,
    name,
    type: pick(['deterministic', 'heuristic', 'derived_fact', 'routing'] as const),
    priority: Math.floor(Math.random() * 10 + 1),
    fired: Math.random() > 0.2,
    conditionsMet: pickN(['amount < 10000', 'docs_complete = true', 'auth_valid = true', 'risk_score < 50', 'turnaround < 14d'], 2),
    conditionsUnmet: Math.random() > 0.6 ? ['prior_auth = true'] : [],
    output: pick(['contribute_approve +0.2', 'contribute_deny +0.15', 'flag_for_review', 'set severity=high', 'derive exception_eligible=true']),
    confidenceImpact: +(Math.random() * 0.3 - 0.05).toFixed(2),
    explanation: `${name} evaluated: ${Math.random() > 0.5 ? 'conditions satisfied, contributing to outcome' : 'partial match, reduced confidence impact'}`,
  }));
}

export function generateCases(count: number): Case[] {
  const cases: Case[] = [];
  for (let i = 0; i < count; i++) {
    const severity = pick(['low', 'medium', 'high', 'critical'] as const);
    const status = pick(['open', 'processing', 'resolved', 'escalated', 'pending_info'] as const);
    const category = pick(categories);
    const inferenceResult = status !== 'open' ? genInferenceResult(severity) : undefined;
    const daysAgo = Math.floor(Math.random() * 60);
    const created = new Date(Date.now() - daysAgo * 86400000);

    cases.push({
      id: `case-${String(i + 1).padStart(4, '0')}`,
      caseNumber: `IC-${2024}-${String(1000 + i)}`,
      category,
      source: pick(sources),
      status,
      decision: inferenceResult?.decision,
      confidence: inferenceResult?.confidence,
      confidenceBand: inferenceResult?.confidenceBand,
      severity,
      owner: pick(owners),
      reviewState: pick(['pending', 'in_review', 'completed', 'reopened'] as const),
      createdAt: created.toISOString(),
      updatedAt: new Date(created.getTime() + Math.random() * 5 * 86400000).toISOString(),
      amount: Math.floor(Math.random() * 75000) + 250,
      description: `${category} case from ${pick(sources)} requiring ${severity} priority processing. ${
        Math.random() > 0.5 ? 'Multiple signals detected.' : 'Standard workflow initiated.'
      }`,
      facts: genFacts(category),
      inferenceResult,
      tags: pickN(tags, Math.floor(Math.random() * 3 + 1)),
    });
  }
  return cases;
}

export const MOCK_CASES = generateCases(75);

export const MOCK_RULES: Rule[] = [
  { id: 'RULE-001', name: 'Amount Threshold Check', description: 'Flag cases exceeding standard amount thresholds for additional review', category: 'Risk', type: 'deterministic', priority: 1, enabled: true, conditions: 'amount_requested > 25000', output: 'flag_for_review, set severity=high', confidenceImpact: 0.15, explanationTemplate: 'Amount of ${amount_requested} exceeds threshold of $25,000', version: 3, lastModified: '2024-01-10', hitCount: 234 },
  { id: 'RULE-002', name: 'Documentation Completeness', description: 'Verify all required documents are present before processing', category: 'Compliance', type: 'deterministic', priority: 2, enabled: true, conditions: 'document_count >= 3 AND prior_authorization = true', output: 'contribute_approve +0.25', confidenceImpact: 0.25, explanationTemplate: 'Documentation requirements satisfied with ${document_count} documents', version: 5, lastModified: '2024-01-08', hitCount: 567 },
  { id: 'RULE-003', name: 'Authorization Validation', description: 'Check prior authorization status against registry', category: 'Authorization', type: 'deterministic', priority: 1, enabled: true, conditions: 'prior_authorization = false AND amount_requested > 5000', output: 'request_info, set severity=medium', confidenceImpact: -0.2, explanationTemplate: 'Prior authorization missing for amount ${amount_requested}', version: 2, lastModified: '2024-01-12', hitCount: 189 },
  { id: 'RULE-004', name: 'Risk Score Evaluation', description: 'Evaluate computed risk score against policy bands', category: 'Risk', type: 'heuristic', priority: 3, enabled: true, conditions: 'risk_score > 70', output: 'contribute_escalate +0.3', confidenceImpact: 0.2, explanationTemplate: 'Risk score of ${risk_score} exceeds acceptable threshold', version: 4, lastModified: '2024-01-05', hitCount: 342 },
  { id: 'RULE-005', name: 'Turnaround SLA Monitor', description: 'Monitor case age against SLA targets', category: 'Operations', type: 'routing', priority: 5, enabled: true, conditions: 'turnaround_days > 14', output: 'route_to_priority_queue', confidenceImpact: 0, explanationTemplate: 'Case age of ${turnaround_days} days exceeds 14-day SLA', version: 1, lastModified: '2024-01-14', hitCount: 98 },
  { id: 'RULE-006', name: 'Exception Code Handler', description: 'Process known exception codes with predefined responses', category: 'Exception', type: 'deterministic', priority: 2, enabled: true, conditions: 'exception_code != NONE', output: 'flag_exception, derive exception_eligible=true', confidenceImpact: -0.1, explanationTemplate: 'Exception code ${exception_code} detected, applying exception handling', version: 2, lastModified: '2024-01-11', hitCount: 156 },
  { id: 'RULE-007', name: 'Auto-Resolution Eligibility', description: 'Determine if case qualifies for automatic resolution', category: 'Efficiency', type: 'deterministic', priority: 4, enabled: true, conditions: 'amount_requested < 5000 AND document_count >= 3 AND risk_score < 30', output: 'approve, set confidence=high', confidenceImpact: 0.35, explanationTemplate: 'Case meets all auto-resolution criteria', version: 6, lastModified: '2024-01-02', hitCount: 891 },
  { id: 'RULE-008', name: 'Requester Tier Boost', description: 'Apply confidence adjustment based on requester tier', category: 'Policy', type: 'heuristic', priority: 6, enabled: true, conditions: 'requester_tier = enterprise', output: 'contribute_approve +0.1', confidenceImpact: 0.1, explanationTemplate: 'Enterprise tier requester receives priority processing', version: 1, lastModified: '2024-01-13', hitCount: 445 },
  { id: 'RULE-009', name: 'Contradiction Detector', description: 'Identify conflicting signals in case evidence', category: 'Quality', type: 'derived_fact', priority: 3, enabled: true, conditions: 'DERIVED: check_contradictions(facts)', output: 'derive has_contradictions=true, reduce_confidence', confidenceImpact: -0.25, explanationTemplate: 'Contradictions detected between ${contradicting_facts}', version: 3, lastModified: '2024-01-07', hitCount: 67 },
  { id: 'RULE-010', name: 'Compliance Hard Stop', description: 'Block processing for compliance violations', category: 'Compliance', type: 'deterministic', priority: 1, enabled: true, conditions: 'compliance_flag = critical', output: 'hard_stop, escalate, set severity=critical', confidenceImpact: 0, explanationTemplate: 'Compliance hard stop triggered - immediate escalation required', version: 2, lastModified: '2024-01-09', hitCount: 12 },
  { id: 'RULE-011', name: 'Pattern Similarity Match', description: 'Compare against known case patterns for routing hints', category: 'Intelligence', type: 'heuristic', priority: 7, enabled: false, conditions: 'similarity_score(case, pattern_db) > 0.8', output: 'suggest_route based on pattern match', confidenceImpact: 0.05, explanationTemplate: 'Similar case pattern detected with ${similarity_score}% match', version: 1, lastModified: '2024-01-15', hitCount: 0 },
  { id: 'RULE-012', name: 'Explainability Summary', description: 'Generate human-readable summary from rule outcomes', category: 'Explainability', type: 'explainability', priority: 10, enabled: true, conditions: 'ALWAYS', output: 'generate_explanation_summary', confidenceImpact: 0, explanationTemplate: 'Decision based on ${fired_rule_count} active rules with ${evidence_count} evidence signals', version: 4, lastModified: '2024-01-06', hitCount: 1245 },
];

export function generateMetrics(days: number): DailyMetric[] {
  const metrics: DailyMetric[] = [];
  for (let i = days; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    const processed = Math.floor(Math.random() * 80 + 40);
    metrics.push({
      date: date.toISOString().split('T')[0],
      processed,
      autoResolved: Math.floor(processed * (0.4 + Math.random() * 0.25)),
      escalated: Math.floor(processed * (0.05 + Math.random() * 0.1)),
      avgConfidence: +(65 + Math.random() * 25).toFixed(1),
      avgTimeToDecision: +(0.5 + Math.random() * 3).toFixed(1),
    });
  }
  return metrics;
}

export const MOCK_METRICS = generateMetrics(30);
