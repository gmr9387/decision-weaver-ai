export function isPopulated(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

export function deriveDataQuality(
  facts: Record<string, unknown>,
  missingFacts: string[],
  evidenceRefs: string[],
): number {
  const totalFacts = Object.keys(facts).length;
  const populatedFacts = Object.values(facts).filter(isPopulated).length;

  const populationScore =
    totalFacts > 0 ? Math.round((populatedFacts / totalFacts) * 100) : 0;

  const missingPenalty = missingFacts.length * 10;
  const evidenceBoost = Math.min(15, evidenceRefs.length * 3);

  return Math.max(
    0,
    Math.min(100, populationScore + evidenceBoost - missingPenalty),
  );
}

export function deriveCorroboratingSignals(firedRules: any[]): number {
  const critical = firedRules.filter(
    (rule) => rule.fired && Number(rule.priority) <= 2,
  ).length;

  const high = firedRules.filter(
    (rule) =>
      rule.fired &&
      Number(rule.priority) > 2 &&
      Number(rule.priority) <= 4,
  ).length;

  const normal = firedRules.filter(
    (rule) => rule.fired && Number(rule.priority) > 4,
  ).length;

  return Math.min(100, critical * 30 + high * 20 + normal * 8);
}