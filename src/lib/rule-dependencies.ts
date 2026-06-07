import type { Rule } from '@/lib/types';

export interface RuleDependency {
  rule: Rule;
  consumesFacts: string[];
  producesFacts: string[];
}

export interface DependencyGraph {
  nodes: RuleDependency[];
  /** factKey -> ruleIds that produce it */
  producers: Record<string, string[]>;
  /** factKey -> ruleIds that consume it */
  consumers: Record<string, string[]>;
  /** ruleId -> ruleIds it depends on (their outputs become its inputs) */
  upstream: Record<string, string[]>;
  /** ruleId -> ruleIds that depend on it */
  downstream: Record<string, string[]>;
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function collectFacts(node: any, acc: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.all)) for (const c of node.all) collectFacts(c, acc);
  if (Array.isArray(node.any)) for (const c of node.any) collectFacts(c, acc);
  if (typeof node.fact === 'string') acc.add(node.fact);
}

function producedFacts(rule: Rule): string[] {
  if (rule.type !== 'derived_fact') return [];
  const output = parseJson<Record<string, any>>(rule.output, {});
  const set = new Set<string>();
  // Common shapes: { setFact: 'foo' }, { derivedFact: 'foo' }, { fact: 'foo' }, { facts: {a:..., b:...} }
  if (typeof output.setFact === 'string') set.add(output.setFact);
  if (typeof output.derivedFact === 'string') set.add(output.derivedFact);
  if (typeof output.fact === 'string') set.add(output.fact);
  if (output.facts && typeof output.facts === 'object' && !Array.isArray(output.facts)) {
    for (const key of Object.keys(output.facts)) set.add(key);
  }
  return [...set];
}

export function buildDependencyGraph(rules: Rule[]): DependencyGraph {
  const nodes: RuleDependency[] = rules.map((rule) => {
    const conditions = parseJson<any>(rule.conditions, {});
    const consumes = new Set<string>();
    collectFacts(conditions, consumes);
    return {
      rule,
      consumesFacts: [...consumes],
      producesFacts: producedFacts(rule),
    };
  });

  const producers: Record<string, string[]> = {};
  const consumers: Record<string, string[]> = {};

  for (const node of nodes) {
    for (const fact of node.producesFacts) {
      (producers[fact] ??= []).push(node.rule.id);
    }
    for (const fact of node.consumesFacts) {
      (consumers[fact] ??= []).push(node.rule.id);
    }
  }

  const upstream: Record<string, string[]> = {};
  const downstream: Record<string, string[]> = {};

  for (const node of nodes) {
    const ups = new Set<string>();
    for (const fact of node.consumesFacts) {
      for (const producerId of producers[fact] ?? []) {
        if (producerId !== node.rule.id) ups.add(producerId);
      }
    }
    upstream[node.rule.id] = [...ups];
    for (const u of ups) {
      (downstream[u] ??= []).push(node.rule.id);
    }
  }

  return { nodes, producers, consumers, upstream, downstream };
}
