// src/weaver/opportunityEngine.ts

/**
 * Weaver Opportunity Engine (Phase 19 — Step 1)
 *
 * Real multi-factor scoring:
 *   - amount
 *   - claim type
 *   - org risk tier
 *   - metadata
 */

export type OpportunityInput = {
  claimId: string;
  organizationId: string;
  amount: number;
  claimType?: string;
  orgRiskTier?: "low" | "medium" | "high";
  metadata?: Record<string, any>;
};

export type OpportunityScore = {
  claimId: string;
  organizationId: string;
  score: number;
  factors: {
    amount: number;
    type: number;
    orgRisk: number;
    metadata: number;
  };
};

export class OpportunityEngine {
  static score(input: OpportunityInput): OpportunityScore {
    const { claimId, organizationId, amount, claimType, orgRiskTier, metadata } = input;

    const amountFactor = Math.min(amount / 10, 100); // 0–100
    const typeFactor =
      claimType === "auto"
        ? 20
        : claimType === "home"
        ? 30
        : claimType === "health"
        ? 40
        : 10;

    const orgRiskFactor =
      orgRiskTier === "low"
        ? 40
        : orgRiskTier === "medium"
        ? 20
        : orgRiskTier === "high"
        ? -10
        : 0;

    const metadataFactor = metadata?.priority === "high" ? 30 : 0;

    const raw =
      amountFactor * 0.4 +
      typeFactor * 0.2 +
      orgRiskFactor * 0.3 +
      metadataFactor * 0.1;

    const score = Math.max(0, Math.min(100, Math.round(raw)));

    return {
      claimId,
      organizationId,
      score,
      factors: {
        amount: amountFactor,
        type: typeFactor,
        orgRisk: orgRiskFactor,
        metadata: metadataFactor,
      },
    };
  }
}
