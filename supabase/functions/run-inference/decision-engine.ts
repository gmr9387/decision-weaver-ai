export type Decision =
  | "approve"
  | "deny"
  | "escalate"
  | "review"
  | "flag"
  | "request_info"
  | "unresolved";

export interface DecisionResolutionInput {
  decisionVotes: Record<string, number>;
  contradictions: string[];
  missingFacts: string[];
  finalConfidence: number;
}

export interface DecisionResolutionResult {
  decision: Decision;
}

export function resolveDecision(
  input: DecisionResolutionInput,
): DecisionResolutionResult {
  const {
    decisionVotes,
    contradictions,
    missingFacts,
    finalConfidence,
  } = input;

  const uniqueDecisions = Object.keys(decisionVotes);

  let decision: Decision = "unresolved";

  if (uniqueDecisions.length > 0) {
    decision = uniqueDecisions.reduce((a, b) =>
      decisionVotes[a] >= decisionVotes[b] ? a : b,
    ) as Decision;
  }

  if (contradictions.length > 0 && finalConfidence < 75) {
    decision = "review";
  }

  if (
    missingFacts.length > 0 &&
    finalConfidence < 55 &&
    decision !== "deny" &&
    decision !== "escalate"
  ) {
    decision = "request_info";
  }

  if (
    finalConfidence < 40 &&
    decision !== "deny" &&
    decision !== "escalate" &&
    decision !== "request_info"
  ) {
    decision = "review";
  }

  return {
    decision,
  };
}