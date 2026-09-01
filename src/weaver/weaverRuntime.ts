// src/weaver/weaverRuntime.ts

import { eventBus } from "../events/eventBus";
import { OpportunityEngine } from "./opportunityEngine";

export class WeaverRuntime {
  static handle(contractName: string, payload: any) {
    switch (contractName) {
      case "opportunity":
        return this.handleOpportunity(payload);

      case "recommendation":
        return this.handleRecommendation(payload);

      default:
        throw new Error(`Weaver cannot handle contract: ${contractName}`);
    }
  }

  private static handleOpportunity(payload: any) {
    const input = {
      claimId: payload.claimId,
      organizationId: payload.organizationId,
      amount: payload.claimPayload?.amount ?? 0,
      claimType: payload.claimPayload?.type,
      orgRiskTier: payload.orgRiskTier,
      metadata: payload.claimPayload?.metadata,
    };

    const opportunityScore = OpportunityEngine.score(input);

    const result = {
      ...payload,
      opportunity: opportunityScore,
    };

    eventBus.emit("weaver.opportunity.processed", result);
    return result;
  }

  private static handleRecommendation(payload: any) {
    const score = payload.opportunity?.score ?? 0;

    let action: "approve" | "deny" | "review" = "review";
    let confidence = 0.5;

    if (score >= 80) {
      action = "approve";
      confidence = 0.9;
    } else if (score <= 20) {
      action = "deny";
      confidence = 0.8;
    }

    const result = {
      ...payload,
      recommendation: {
        action,
        confidence,
        basis: {
          opportunityScore: score,
        },
      },
    };

    eventBus.emit("weaver.recommendation.processed", result);
    return result;
  }
}
