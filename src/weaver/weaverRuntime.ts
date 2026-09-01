// src/weaver/weaverRuntime.ts

import { eventBus } from "../events/eventBus";
import { OpportunityEngine } from "./opportunityEngine";
import { RecommendationEngine } from "./recommendationEngine";

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
    const input = {
      claimId: payload.claimId,
      organizationId: payload.organizationId,
      opportunityScore: payload.opportunity?.score ?? 0,
      claimType: payload.claimPayload?.type,
      orgRiskTier: payload.orgRiskTier,
      metadata: payload.claimPayload?.metadata,
    };

    const recommendation = RecommendationEngine.recommend(input);

    const result = {
      ...payload,
      recommendation,
    };

    eventBus.emit("weaver.recommendation.processed", result);
    return result;
  }
}
