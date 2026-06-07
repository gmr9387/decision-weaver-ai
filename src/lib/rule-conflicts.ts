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
  reason: string;
  recommendation: string;
}

const HIGH_PAIRS = new Set(['approve|deny', 'approve|escalate']);
const MEDIUM_PAIRS = new Set(['approve|request_info', 'review|approve', 'approve|flag', 'deny|escalate']);

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function decisionOf(rule: Rule): string | null {
  const output = parseJson<Record<string, any>>(rule.output, {});
  const d = output?.decision ?? output?.action;
  return d ? String(d) : null;
}

function collectFacts(node: any, acc: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.all)) for (const c of node.all) collectFacts(c, acc);
  if (Array.isArray(node.any)) for (const c of node.any) collectFacts(c, acc);
  if (typeof node.fact === 'string') acc.add(node.fact);
}

function factsOf(rule: Rule): Set<string> {
  const conditions = parseJson<any>(rule.conditions, {});
  const set = new Set<string>();
  collectFacts(conditions, set);
  return set;
}

function severityFor(a: string, b: string): ConflictSeverity | null {
  if (a === b) return null;
  const key = [a, b].sort().join('|');
  if (HIGH_PAIRS.has(key)) return 'high';
  if (MEDIUM_PAIRS.has(key)) return 'medium';
  // any disagreement on enabled rules touching same facts → low
  return 'low';
}

export function detectConflicts(rules: Rule[]): RuleConflict[] {
  const enabled = rules.filter((r) => r.enabled);
  const meta = enabled.map((r) => ({
    rule: r,
    decision: decisionOf(r),
    facts: factsOf(r),
  }));

  const conflicts: RuleConflict[] = [];

  for (let i = 0; i < meta.length; i++) {
    for (let j = i + 1; j < meta.length; j++) {
      const a = meta[i];
      const b = meta[j];
      if (!a.decision || !b.decision) continue;

      const shared = [...a.facts].filter((f) => b.facts.has(f));
      if (shared.length === 0) continue;

      const sev = severityFor(a.decision, b.decision);
      if (!sev) continue;

      conflicts.push({
        id: `${a.rule.id}__${b.rule.id}`,
        ruleA: a.rule,
        ruleB: b.rule,
        decisionA: a.decision,
        decisionB: b.decision,
        severity: sev,
        sharedFacts: shared,
        reason: `Both rules read ${shared.length} shared fact(s) but propose "${a.decision}" vs "${b.decision}".`,
        recommendation:
          sev === 'high'
            ? 'Review priorities and add a tie-breaker rule or scope conditions to avoid contradictory outcomes.'
            : sev === 'medium'
              ? 'Consider tightening conditions so only one fires per case, or document the intended precedence.'
              : 'Confirm this divergence is intentional and ordered by priority.',
      });
    }
  }

  conflicts.sort((x, y) => {
    const order: Record<ConflictSeverity, number> = { high: 0, medium: 1, low: 2 };
    return order[x.severity] - order[y.severity];
  });

  return conflicts;
}
