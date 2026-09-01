// src/weaver/recommendationEngine.ts

/**
 * Weaver Recommendation Engine (Phase 20)
 *
 * Multi-factor decisioning:
 *   - opportunity score
 *   - claim type
 *   - org risk tier
 *   - metadata priority
 */

export type RecommendationInput = {
  claimId: string;
  organizationId: string;
  opportunityScore: number;
  claimType?: string;
  orgRiskTier?: "low" | "medium" | "high";
  metadata?: Record<string, any>;
};

export type RecommendationOutput = {
  action: "approve" | "deny" | "review" | "escalate";
  confidence: number;
  basis: Record<string, any>;
};

export class RecommendationEngine {
  static recommend(input: RecommendationInput): RecommendationOutput {
    const {
      opportunityScore,
      claimType,
      orgRiskTier,
      metadata,
    } = input;

    let action: RecommendationOutput["action"] = "review";
    let confidence = 0.5;

    // Opportunity score influence
    if (opportunityScore >= 85) {
      action = "approve";
      confidence = 0.9;
    } else if (opportunityScore <= 20) {
      action = "deny";
      confidence = 0.8;
    }

    // Claim type influence
    if (claimType === "health" && opportunityScore >= 70) {
      action = "approve";
      confidence += 0.05;
    }

    if (claimType === "auto" && opportunityScore <= 30) {
      action = "review";
      confidence -= 0.1;
    }

    // Org risk tier influence
    if (orgRiskTier === "high") {
      action = "escalate";
      confidence = 0.7;
    }

    // Metadata influence
    if (metadata?.priority === "high") {
      confidence += 0.1;
    }

    confidence = Math.min(1, Math.max(0, confidence));

    return {
      action,
      confidence,
      basis: {
        opportunityScore,
        claimType,
        orgRiskTier,
        metadata,
      },
    };
  }
}
