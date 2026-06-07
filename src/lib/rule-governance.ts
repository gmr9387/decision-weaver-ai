import type { Rule } from '@/lib/types';

export type GovernanceStatus = 'healthy' | 'watch' | 'needs_attention';

export interface RuleGovernance {
  ruleId: string;
  status: GovernanceStatus;
  signals: {
    disabled: boolean;
    zeroHits: boolean;
    missingExplanation: boolean;
    highPriority: boolean;
    extremeConfidenceImpact: boolean;
    stale: boolean;
  };
  reasons: string[];
}

const STALE_DAYS = 90;

export function evaluateRule(rule: Rule, now = new Date()): RuleGovernance {
  const reasons: string[] = [];

  const disabled = !rule.enabled;
  const zeroHits = (rule.hitCount ?? 0) === 0;
  const missingExplanation = !rule.explanationTemplate?.trim();
  const highPriority = (rule.priority ?? 10) <= 2;
  const extremeConfidenceImpact = Math.abs(rule.confidenceImpact ?? 0) >= 20;

  let stale = false;
  if (rule.lastModified && rule.lastModified !== '—') {
    const parsed = Date.parse(rule.lastModified);
    if (Number.isFinite(parsed)) {
      const ageDays = (now.getTime() - parsed) / (1000 * 60 * 60 * 24);
      stale = ageDays > STALE_DAYS && zeroHits;
    }
  }

  if (disabled) reasons.push('Rule is disabled');
  if (zeroHits && !disabled) reasons.push('No recorded hits — may be unreachable');
  if (missingExplanation) reasons.push('Missing explanation template — decisions are not narratable');
  if (highPriority) reasons.push(`High priority (P${rule.priority}) — high blast radius`);
  if (extremeConfidenceImpact) {
    reasons.push(`Extreme confidence impact (${rule.confidenceImpact}) — review weighting`);
  }
  if (stale) reasons.push(`Stale (no activity, last modified ${rule.lastModified})`);

  let status: GovernanceStatus = 'healthy';
  const attentionCount =
    Number(missingExplanation) +
    Number(stale) +
    Number(extremeConfidenceImpact && highPriority);

  if (disabled) {
    status = 'watch';
  } else if (attentionCount >= 2 || (zeroHits && highPriority)) {
    status = 'needs_attention';
  } else if (missingExplanation || zeroHits || extremeConfidenceImpact || stale) {
    status = 'watch';
  }

  return {
    ruleId: rule.id,
    status,
    signals: {
      disabled,
      zeroHits,
      missingExplanation,
      highPriority,
      extremeConfidenceImpact,
      stale,
    },
    reasons,
  };
}

export function evaluateAll(rules: Rule[]): RuleGovernance[] {
  const now = new Date();
  return rules.map((r) => evaluateRule(r, now));
}

export function summarize(rules: Rule[]) {
  const evaluations = evaluateAll(rules);
  const counts = { healthy: 0, watch: 0, needs_attention: 0 };
  const signals = {
    disabled: 0,
    zeroHits: 0,
    missingExplanation: 0,
    highPriority: 0,
    extremeConfidenceImpact: 0,
    stale: 0,
  };
  for (const e of evaluations) {
    counts[e.status]++;
    for (const k of Object.keys(signals) as Array<keyof typeof signals>) {
      if (e.signals[k]) signals[k]++;
    }
  }
  return { evaluations, counts, signals, total: rules.length };
}
