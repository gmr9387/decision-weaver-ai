export type DecisionType =
  | 'approve'
  | 'deny'
  | 'flag'
  | 'escalate'
  | 'review'
  | 'request_info'
  | 'route'
  | 'monitor'
  | 'unresolved';

export type SeverityLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type ConfidenceBand =
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high';

export type InferenceMode =
  | 'instant'
  | 'deep'
  | 'assisted';

export type ReviewState =
  | 'pending'
  | 'in_review'
  | 'completed'
  | 'reopened';

export type RuleType =
  | 'deterministic'
  | 'heuristic'
  | 'derived_fact'
  | 'routing'
  | 'explainability';

export interface Fact {
  key: string;
  value: string | number | boolean;
  source: string;
  quality: 'verified' | 'inferred' | 'unverified' | 'missing';
  derived?: boolean;
}

export interface FiredRule {
  ruleId: string;
  name: string;
  type: RuleType;
  priority: number;
  fired: boolean;
  conditionsMet: string[];
  conditionsUnmet: string[];
  output: string | Record<string, unknown>;
  confidenceImpact: number;
  explanation: string;
}

export interface ConfidenceBreakdown {
  ruleStrength: number;
  corroboratingSignals: number;
  evidenceCompleteness: number;
  dataQuality: number;
  contradictionPenalty: number;
  missingFactPenalty: number;
  aiConfidenceAdjustment?: number;
  finalAdjusted: number;
}

export interface Recommendation {
  title: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  suggestedOwner: string;
  expectedImpact: string;
}

export interface CandidateDecision {
  decision: DecisionType;
  score: number;
}

export interface DecisionTrace {
  traceId: string;
  organizationId?: string;
  caseId?: string | null;
  evaluatedAt: string;
  mode: InferenceMode;
  deterministicDecision: DecisionType;
  deterministicDecisionPreserved: boolean;

  rulesEvaluated: number;
  rulesFired: number;

  firedRuleIds: string[];

  missingFacts: string[];
  contradictions: string[];
  evidenceRefs: string[];

  candidateDecisions: CandidateDecision[];

  confidenceInputs: {
    ruleStrength: number;
    corroboratingSignals: number;
    evidenceCompleteness: number;
    dataQuality: number;
    contradictionPenalty: number;
    missingFactPenalty: number;
    aiConfidenceAdjustment?: number;
  };

  ruleTrace: {
    ruleId: string;
    name: string;
    priority: number;
    fired: boolean;
    conditionsMet: string[];
    conditionsUnmet: string[];
    confidenceImpact: number;
    explanation: string;
  }[];
}

export interface InferenceResult {
  decision: DecisionType;
  confidence: number;
  confidenceBand: ConfidenceBand;
  severity: SeverityLevel;

  explanation: string;

  candidateDecisions: CandidateDecision[];

  confidenceBreakdown: ConfidenceBreakdown;

  firedRules: FiredRule[];

  recommendations: Recommendation[];

  missingFacts: string[];
  contradictions: string[];
  evidenceRefs: string[];

  mode: InferenceMode;

  deterministicDecisionPreserved?: boolean;

  aiAssessment?: string;
  aiSuggestedDecision?: string;

  decisionTrace?: DecisionTrace;
}

export interface Case {
  id: string;
  caseNumber: string;

  category: string;
  source: string;

  status:
    | 'open'
    | 'processing'
    | 'resolved'
    | 'escalated'
    | 'pending_info';

  decision?: DecisionType;
  confidence?: number;
  confidenceBand?: ConfidenceBand;

  severity: SeverityLevel;

  owner: string;

  reviewState: ReviewState;

  createdAt: string;
  updatedAt: string;

  amount?: number;

  description: string;

  facts: Fact[];

  inferenceResult?: InferenceResult;

  tags: string[];
}

export interface Rule {
  id: string;

  name: string;
  description: string;
  category: string;

  type: RuleType;

  priority: number;

  enabled: boolean;

  conditions: string;
  output: string;

  confidenceImpact: number;

  explanationTemplate: string;

  version: number;
  lastModified: string;

  hitCount: number;
}

export interface DailyMetric {
  date: string;

  processed: number;
  autoResolved: number;
  escalated: number;

  avgConfidence: number;
  avgTimeToDecision: number;
}