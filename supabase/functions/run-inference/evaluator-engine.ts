export interface Condition {
  fact?: string;
  operator?: string;
  value?: unknown;
  all?: Condition[];
  any?: Condition[];
}

export type RuleVersionRef = {
  id: string;
  rule_id: string;
  version: number;
};

export interface EvaluateRulesInput {
  scopedRules: any[];
  versionMap: Map<string, RuleVersionRef>;
  facts: Record<string, unknown>;
}

export interface EvaluateRulesOutput {
  firedRules: any[];
  missingFacts: string[];
  evidenceRefs: string[];
  decisionVotes: Record<string, number>;
  firedRuleIds: string[];
  totalConfidenceImpact: number;
  firedCount: number;
}

export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return (value ?? fallback) as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function evaluateCondition(
  cond: Condition,
  facts: Record<string, unknown>,
): { met: boolean; label: string } {
  if (cond.all) {
    const results = cond.all.map((child) => evaluateCondition(child, facts));

    return {
      met: results.every((result) => result.met),
      label: `ALL(${results.map((result) => result.label).join(", ")})`,
    };
  }

  if (cond.any) {
    const results = cond.any.map((child) => evaluateCondition(child, facts));

    return {
      met: results.some((result) => result.met),
      label: `ANY(${results.map((result) => result.label).join(", ")})`,
    };
  }

  const factKey = cond.fact ?? "";
  const operator = cond.operator ?? "equals";
  const expected = cond.value;
  const actual = facts[factKey];
  const label = `${factKey} ${operator} ${JSON.stringify(expected)}`;

  if (!factKey) return { met: false, label: "[missing fact key]" };
  if (actual === undefined) return { met: false, label: `${label} [missing]` };

  const numActual = Number(actual);
  const numExpected = Number(expected);
  const numericReady = Number.isFinite(numActual) && Number.isFinite(numExpected);

  switch (operator) {
    case "equals":
    case "equal":
      return { met: String(actual) === String(expected), label };

    case "notEquals":
    case "notEqual":
      return { met: String(actual) !== String(expected), label };

    case "greaterThan":
      return {
        met: numericReady && numActual > numExpected,
        label: numericReady ? label : `${label} [non-numeric]`,
      };

    case "greaterThanOrEqual":
    case "greaterThanInclusive":
      return {
        met: numericReady && numActual >= numExpected,
        label: numericReady ? label : `${label} [non-numeric]`,
      };

    case "lessThan":
      return {
        met: numericReady && numActual < numExpected,
        label: numericReady ? label : `${label} [non-numeric]`,
      };

    case "lessThanOrEqual":
    case "lessThanInclusive":
      return {
        met: numericReady && numActual <= numExpected,
        label: numericReady ? label : `${label} [non-numeric]`,
      };

    case "contains":
      return { met: String(actual).includes(String(expected)), label };

    case "in":
      return {
        met: Array.isArray(expected) && expected.includes(actual),
        label,
      };

    case "exists":
      return {
        met: actual !== null && actual !== undefined,
        label,
      };

    default:
      return {
        met: false,
        label: `${label} [unknown operator]`,
      };
  }
}

export function collectLeaves(
  condition: Condition,
  facts: Record<string, unknown>,
): { met: boolean; label: string }[] {
  if (condition.all) {
    return condition.all.flatMap((child) => collectLeaves(child, facts));
  }

  if (condition.any) {
    return condition.any.flatMap((child) => collectLeaves(child, facts));
  }

  return [evaluateCondition(condition, facts)];
}

export function evaluateRules(input: EvaluateRulesInput): EvaluateRulesOutput {
  const {
    scopedRules,
    versionMap,
    facts,
  } = input;

  const firedRules: any[] = [];
  const missingFacts: string[] = [];
  const evidenceRefs: string[] = [];
  const decisionVotes: Record<string, number> = {};
  const firedRuleIds: string[] = [];

  let totalConfidenceImpact = 0;
  let firedCount = 0;

  for (const rule of scopedRules) {
    const versionRef = versionMap.get(rule.id);
    const liveRuleVersion = Number(rule.version || 1);
    const ruleVersion = Number(versionRef?.version || liveRuleVersion || 1);

    const conditions = safeJsonParse<Condition>(rule.conditions, {});
    const output = safeJsonParse<Record<string, any>>(rule.output, {});
    const rootCondition: Condition = conditions.all || conditions.any
      ? conditions
      : { all: [conditions] };

    const leafResults = collectLeaves(rootCondition, facts);
    const conditionsMet = leafResults
      .filter((result) => result.met)
      .map((result) => result.label);

    const conditionsUnmet = leafResults
      .filter((result) => !result.met)
      .map((result) => result.label);

    for (const result of leafResults) {
      if (result.label.includes("[missing]")) {
        const factName = result.label.split(" ")[0];

        if (factName && !missingFacts.includes(factName)) {
          missingFacts.push(factName);
        }
      }
    }

    const overallResult = evaluateCondition(rootCondition, facts);
    const fired = overallResult.met;

    if (fired) {
      firedCount++;
      firedRuleIds.push(rule.id);
      totalConfidenceImpact += Number(rule.confidence_impact || 0);

      const ruleDecision = output?.decision || output?.action;

      if (ruleDecision) {
        const weight = Math.max(1, 11 - Number(rule.priority || 10));
        decisionVotes[ruleDecision] = (decisionVotes[ruleDecision] || 0) + weight;
      }

      if (output?.evidence) {
        evidenceRefs.push(output.evidence);
      }
    }

    let ruleExplanation = rule.explanation_template || "";

    for (const [key, value] of Object.entries(facts)) {
      ruleExplanation = ruleExplanation.replaceAll(`{{${key}}}`, String(value));
    }

    firedRules.push({
      ruleId: rule.id,
      rule_id: rule.id,
      ruleName: rule.name,
      rule_name: rule.name,
      ruleVersion,
      rule_version: ruleVersion,
      ruleSnapshotId: versionRef?.id ?? null,
      rule_snapshot_id: versionRef?.id ?? null,

      name: rule.name,
      type: rule.rule_type,
      priority: rule.priority,
      fired,
      conditionsMet,
      conditionsUnmet,
      output,
      confidenceImpact: Number(rule.confidence_impact || 0),
      explanation: fired ? ruleExplanation : "",
    });
  }

  return {
    firedRules,
    missingFacts,
    evidenceRefs,
    decisionVotes,
    firedRuleIds,
    totalConfidenceImpact,
    firedCount,
  };
}