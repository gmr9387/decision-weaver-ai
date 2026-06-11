export function deriveContradictionPenalty(contradictions: string[]): {
  penalty: number;
  severityPenalty: number;
} {
  const penalty = contradictions.length * 15;
  const severityPenalty =
    contradictions.length > 3 ? 20 : contradictions.length > 1 ? 10 : 0;
  return { penalty, severityPenalty };
}

export function deriveMissingFactPenalty(missingFacts: string[]): number {
  return missingFacts.length * 8;
}

export function deriveSeverity(firedRules: any[]): string {
  if (firedRules.some((r) => r.fired && r.priority <= 2)) {
    return "critical";
  }
  if (firedRules.some((r) => r.fired && r.priority <= 4)) {
    return "high";
  }
  return "medium";
}
