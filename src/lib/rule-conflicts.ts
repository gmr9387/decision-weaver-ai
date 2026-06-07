import type { Rule } from '@/lib/types';

export type ConflictSeverity = 'high' | 'medium' | 'low';

export interface RuleConflict {
  id: string;
  ruleA: Rule;
  ruleB: Rule;
  decisionA: string;
  decisionB: string;
  severity: ConflictSeverity;
  sharedFacts: string[];
  priorityGap: number;
  confidenceImpactGap: number;
  reason: string;
  recommendation: string;
}

const HIGH_PAIRS = new Set([
  'approve|deny',
  'approve|escalate',
  'deny|request_info',
]);

const MEDIUM_PAIRS = new Set([
  'approve|request_info',
  'approve|review',
  'approve|flag',
  'deny|escalate',
  'escalate|request_info',
  'review|deny',
]);

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function decisionOf(rule: Rule): string | null {
  const output = parseJson<Record<string, any>>(rule.output, {});
  const decision = output?.decision ?? output?.action;
  return decision ? String(decision) : null;
}

function collectFacts(node: any, acc: Set<string>): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node.all)) {
    for (const child of node.all) collectFacts(child, acc);
  }

  if (Array.isArray(node.any)) {
    for (const child of node.any) collectFacts(child, acc);
  }

  if (typeof node.fact === 'string' && node.fact.trim()) {
    acc.add(node.fact.trim());
  }
}

function factsOf(rule: Rule): Set<string> {
  const conditions = parseJson<any>(rule.conditions, {});
  const facts = new Set<string>();
  collectFacts(conditions, facts);
  return facts;
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join('|');
}

function severityFor(a: string, b: string, sharedFacts: string[], priorityGap: number): ConflictSeverity | null {
  if (a === b) return null;

  const key = pairKey(a, b);

  if (HIGH_PAIRS.has(key)) return 'high';
  if (MEDIUM_PAIRS.has(key)) return 'medium';

  if (sharedFacts.length >= 3 && priorityGap <= 2) return 'medium';

  return 'low';
}

function recommendationFor(severity: ConflictSeverity, priorityGap: number) {
  if (severity === 'high') {
    return 'Review immediately. Add a tie-breaker rule, tighten conditions, or explicitly document precedence before production use.';
  }

  if (severity === 'medium') {
    return priorityGap <= 2
      ? 'Priorities are close. Consider separating scope, strengthening precedence, or adding a review/escalation guardrail.'
      : 'Confirm the higher-priority rule is intended to win when both rules match.';
  }

  return 'Confirm this divergence is intentional and governed by priority/order.';
}

export function detectConflicts(rules: Rule[]): RuleConflict[] {
  const enabled = rules.filter((rule) => rule.enabled);

  const meta = enabled.map((rule) => ({
    rule,
    decision: decisionOf(rule),
    facts: factsOf(rule),
  }));

  const conflicts: RuleConflict[] = [];

  for (let i = 0; i < meta.length; i++) {
    for (let j = i + 1; j < meta.length; j++) {
      const a = meta[i];
      const b = meta[j];

      if (!a.decision || !b.decision) continue;

      const sharedFacts = [...a.facts].filter((fact) => b.facts.has(fact));
      if (sharedFacts.length === 0) continue;

      const priorityGap = Math.abs(Number(a.rule.priority || 0) - Number(b.rule.priority || 0));
      const confidenceImpactGap = Math.abs(
        Number(a.rule.confidenceImpact || 0) - Number(b.rule.confidenceImpact || 0),
      );

      const severity = severityFor(a.decision, b.decision, sharedFacts, priorityGap);
      if (!severity) continue;

      conflicts.push({
        id: `${a.rule.id}__${b.rule.id}`,
        ruleA: a.rule,
        ruleB: b.rule,
        decisionA: a.decision,
        decisionB: b.decision,
        severity,
        sharedFacts,
        priorityGap,
        confidenceImpactGap,
        reason: `Both rules read ${sharedFacts.length} shared fact${sharedFacts.length !== 1 ? 's' : ''} but propose "${a.decision}" vs "${b.decision}".`,
        recommendation: recommendationFor(severity, priorityGap),
      });
    }
  }

  conflicts.sort((x, y) => {
    const severityOrder: Record<ConflictSeverity, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    if (severityOrder[x.severity] !== severityOrder[y.severity]) {
      return severityOrder[x.severity] - severityOrder[y.severity];
    }

    if (x.priorityGap !== y.priorityGap) {
      return x.priorityGap - y.priorityGap;
    }

    return y.sharedFacts.length - x.sharedFacts.length;
  });

  return conflicts;
}