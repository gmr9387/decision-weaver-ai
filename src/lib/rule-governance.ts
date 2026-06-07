import type { Rule } from '@/lib/types';

export type GovernanceStatus = 'healthy' | 'watch' | 'needs_attention';

export interface RuleGovernance {
  ruleId: string;
  status: GovernanceStatus;
  score: number;
  signals: {
    disabled: boolean;
    zeroHits: boolean;
    missingExplanation: boolean;
    missingDescription: boolean;
    highPriority: boolean;
    extremeConfidenceImpact: boolean;
    stale: boolean;
    unversioned: boolean;
    weakOutputContract: boolean;
  };
  reasons: string[];
  recommendations: string[];
}

const STALE_DAYS = 90;

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function hasValidOutputContract(rule: Rule): boolean {
  const output = parseJson<Record<string, any>>(rule.output, {});
  const decision = output.decision ?? output.action;

  return Boolean(decision);
}

function daysSince(value: string | undefined, now: Date): number | null {
  if (!value || value === '—') return null;

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;

  return (now.getTime() - parsed) / (1000 * 60 * 60 * 24);
}

export function evaluateRule(rule: Rule, now = new Date()): RuleGovernance {
  const reasons: string[] = [];
  const recommendations: string[] = [];

  const disabled = !rule.enabled;
  const zeroHits = Number(rule.hitCount ?? 0) === 0;
  const missingExplanation = !rule.explanationTemplate?.trim();
  const missingDescription = !rule.description?.trim();
  const highPriority = Number(rule.priority ?? 10) <= 2;
  const extremeConfidenceImpact = Math.abs(Number(rule.confidenceImpact ?? 0)) >= 20;
  const unversioned = Number(rule.version ?? 0) < 1;
  const weakOutputContract = !hasValidOutputContract(rule);

  const ageDays = daysSince(rule.lastModified, now);
  const stale = Boolean(ageDays !== null && ageDays > STALE_DAYS && zeroHits);

  if (disabled) {
    reasons.push('Rule is disabled.');
    recommendations.push('Confirm whether this rule is intentionally inactive.');
  }

  if (zeroHits && !disabled) {
    reasons.push('No recorded hits — rule may be unreachable or untested.');
    recommendations.push('Run simulations or verify whether matching case facts exist.');
  }

  if (missingExplanation) {
    reasons.push('Missing explanation template — decisions are not narratable.');
    recommendations.push('Add an explanation template with fact placeholders for auditability.');
  }

  if (missingDescription) {
    reasons.push('Missing description — business purpose is unclear.');
    recommendations.push('Add a short description explaining why the rule exists.');
  }

  if (highPriority) {
    reasons.push(`High priority (P${rule.priority}) — high blast radius.`);
    recommendations.push('Review this rule carefully before changing conditions or output.');
  }

  if (extremeConfidenceImpact) {
    reasons.push(`Extreme confidence impact (${rule.confidenceImpact}) — review weighting.`);
    recommendations.push('Confirm this confidence impact is intentional and documented.');
  }

  if (stale) {
    reasons.push(`Stale rule — no activity and last modified ${rule.lastModified}.`);
    recommendations.push('Retire, test, or re-scope this rule.');
  }

  if (unversioned) {
    reasons.push('Rule version is missing or invalid.');
    recommendations.push('Confirm the rule versioning migration and snapshot trigger are active.');
  }

  if (weakOutputContract) {
    reasons.push('Output contract has no decision/action.');
    recommendations.push('Add a valid decision or action to the rule output JSON.');
  }

  let score = 100;

  if (disabled) score -= 15;
  if (zeroHits && !disabled) score -= 15;
  if (missingExplanation) score -= 20;
  if (missingDescription) score -= 8;
  if (extremeConfidenceImpact) score -= 12;
  if (stale) score -= 15;
  if (unversioned) score -= 20;
  if (weakOutputContract) score -= 25;

  if (highPriority && (missingExplanation || weakOutputContract || extremeConfidenceImpact)) {
    score -= 15;
  }

  score = Math.max(0, Math.min(100, score));

  let status: GovernanceStatus = 'healthy';

  if (
    weakOutputContract ||
    unversioned ||
    (highPriority && (missingExplanation || extremeConfidenceImpact)) ||
    score < 65
  ) {
    status = 'needs_attention';
  } else if (
    disabled ||
    zeroHits ||
    missingExplanation ||
    missingDescription ||
    stale ||
    extremeConfidenceImpact ||
    score < 85
  ) {
    status = 'watch';
  }

  return {
    ruleId: rule.id,
    status,
    score,
    signals: {
      disabled,
      zeroHits,
      missingExplanation,
      missingDescription,
      highPriority,
      extremeConfidenceImpact,
      stale,
      unversioned,
      weakOutputContract,
    },
    reasons,
    recommendations,
  };
}

export function evaluateAll(rules: Rule[]): RuleGovernance[] {
  const now = new Date();
  return rules.map((rule) => evaluateRule(rule, now));
}

export function summarize(rules: Rule[]) {
  const evaluations = evaluateAll(rules);

  const counts = {
    healthy: 0,
    watch: 0,
    needs_attention: 0,
  };

  const signals = {
    disabled: 0,
    zeroHits: 0,
    missingExplanation: 0,
    missingDescription: 0,
    highPriority: 0,
    extremeConfidenceImpact: 0,
    stale: 0,
    unversioned: 0,
    weakOutputContract: 0,
  };

  for (const evaluation of evaluations) {
    counts[evaluation.status]++;

    for (const key of Object.keys(signals) as Array<keyof typeof signals>) {
      if (evaluation.signals[key]) signals[key]++;
    }
  }

  const averageScore =
    evaluations.length > 0
      ? Math.round(
          evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) /
            evaluations.length,
        )
      : 100;

  return {
    evaluations,
    counts,
    signals,
    total: rules.length,
    averageScore,
  };
}