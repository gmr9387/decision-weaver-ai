import type { Rule } from '@/lib/types';

export interface RuleDependency {
  rule: Rule;
  consumesFacts: string[];
  producesFacts: string[];
  orphanedConsumes: string[];
  hasCircularDependency: boolean;
}

export interface DependencyGraph {
  nodes: RuleDependency[];

  /** factKey -> ruleIds that produce it */
  producers: Record<string, string[]>;

  /** factKey -> ruleIds that consume it */
  consumers: Record<string, string[]>;

  /** ruleId -> ruleIds it depends on */
  upstream: Record<string, string[]>;

  /** ruleId -> ruleIds that depend on it */
  downstream: Record<string, string[]>;

  /** factKeys consumed but not produced by any derived_fact rule */
  orphanedFacts: string[];

  /** factKeys produced by more than one rule */
  duplicateProducedFacts: string[];

  /** rule dependency cycles */
  cycles: string[][];
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

function producedFacts(rule: Rule): string[] {
  if (rule.type !== 'derived_fact') return [];

  const output = parseJson<Record<string, any>>(rule.output, {});
  const produced = new Set<string>();

  if (typeof output.setFact === 'string') produced.add(output.setFact.trim());
  if (typeof output.derivedFact === 'string') produced.add(output.derivedFact.trim());
  if (typeof output.fact === 'string') produced.add(output.fact.trim());
  if (typeof output.produces === 'string') produced.add(output.produces.trim());

  if (Array.isArray(output.produces)) {
    for (const fact of output.produces) {
      if (typeof fact === 'string' && fact.trim()) {
        produced.add(fact.trim());
      }
    }
  }

  if (output.facts && typeof output.facts === 'object' && !Array.isArray(output.facts)) {
    for (const key of Object.keys(output.facts)) {
      if (key.trim()) produced.add(key.trim());
    }
  }

  return [...produced].filter(Boolean);
}

function findCycles(upstream: Record<string, string[]>): string[][] {
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];

  function visit(ruleId: string) {
    if (visiting.has(ruleId)) {
      const start = path.indexOf(ruleId);
      if (start >= 0) cycles.push([...path.slice(start), ruleId]);
      return;
    }

    if (visited.has(ruleId)) return;

    visiting.add(ruleId);
    path.push(ruleId);

    for (const parent of upstream[ruleId] ?? []) {
      visit(parent);
    }

    path.pop();
    visiting.delete(ruleId);
    visited.add(ruleId);
  }

  for (const ruleId of Object.keys(upstream)) {
    visit(ruleId);
  }

  return cycles;
}

export function buildDependencyGraph(rules: Rule[]): DependencyGraph {
  const baseNodes = rules.map((rule) => {
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

  for (const node of baseNodes) {
    for (const fact of node.producesFacts) {
      (producers[fact] ??= []).push(node.rule.id);
    }

    for (const fact of node.consumesFacts) {
      (consumers[fact] ??= []).push(node.rule.id);
    }
  }

  const upstream: Record<string, string[]> = {};
  const downstream: Record<string, string[]> = {};

  for (const node of baseNodes) {
    const upstreamIds = new Set<string>();

    for (const fact of node.consumesFacts) {
      for (const producerId of producers[fact] ?? []) {
        if (producerId !== node.rule.id) {
          upstreamIds.add(producerId);
        }
      }
    }

    upstream[node.rule.id] = [...upstreamIds];

    for (const upstreamId of upstreamIds) {
      (downstream[upstreamId] ??= []).push(node.rule.id);
    }

    if (!downstream[node.rule.id]) downstream[node.rule.id] = [];
  }

  const orphanedFacts = Object.keys(consumers)
    .filter((fact) => !producers[fact]?.length)
    .sort();

  const duplicateProducedFacts = Object.entries(producers)
    .filter(([, producerIds]) => producerIds.length > 1)
    .map(([fact]) => fact)
    .sort();

  const cycles = findCycles(upstream);
  const cycleRuleIds = new Set(cycles.flat());

  const nodes: RuleDependency[] = baseNodes.map((node) => ({
    ...node,
    orphanedConsumes: node.consumesFacts.filter((fact) => orphanedFacts.includes(fact)),
    hasCircularDependency: cycleRuleIds.has(node.rule.id),
  }));

  return {
    nodes,
    producers,
    consumers,
    upstream,
    downstream,
    orphanedFacts,
    duplicateProducedFacts,
    cycles,
  };
}