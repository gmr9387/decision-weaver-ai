import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  deriveCorroboratingSignals,
  deriveDataQuality,
} from "./confidence-metrics.ts";
import { resolveDecision, type Decision } from "./decision-engine.ts";
import { evaluateRules, type RuleVersionRef } from "./evaluator-engine.ts";
import {
  deriveContradictionPenalty,
  deriveContradictionSeverityPenalty,
  deriveMissingFactPenalty,
  deriveSeverity,
} from "./governance-engine.ts";
import { buildDecisionTrace } from "./trace-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function runAIAssisted(
  facts: Record<string, unknown>,
  firedRules: any[],
  explanation: string,
  decision: string,
  confidence: number,
): Promise<{
  aiExplanation: string;
  aiSuggestedDecision?: string;
  aiConfidenceAdjust: number;
}> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  if (!apiKey) {
    return {
      aiExplanation: "AI key not configured. Deterministic engine result preserved.",
      aiConfidenceAdjust: 0,
    };
  }

  const prompt = `You are an expert case adjudication analyst.

You may advise, explain, and flag risks.
You may NOT override the deterministic rules engine.

Facts:
${JSON.stringify(facts)}

Rules fired:
${firedRules.filter((r) => r.fired).map((r) => `${r.name} v${r.ruleVersion ?? "?"} (priority ${r.priority})`).join(", ")}

Deterministic decision:
${decision}

Deterministic confidence:
${confidence.toFixed(1)}%

Engine explanation:
${explanation}

Respond in JSON only:
{
  "assessment": "2-3 sentence analysis",
  "suggestedDecision": "approve|deny|escalate|review|flag|request_info",
  "confidenceAdjustment": number between -10 and 10,
  "reasoning": "brief reasoning"
}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      return {
        aiExplanation: "AI service unavailable. Deterministic engine result preserved.",
        aiConfidenceAdjust: 0,
      };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        aiExplanation: content || "AI returned no structured assessment.",
        aiConfidenceAdjust: 0,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      aiExplanation: parsed.assessment || parsed.reasoning || content,
      aiSuggestedDecision: parsed.suggestedDecision,
      aiConfidenceAdjust: Math.max(-10, Math.min(10, Number(parsed.confidenceAdjustment || 0))),
    };
  } catch {
    return {
      aiExplanation: "AI reasoning failed. Deterministic engine result preserved.",
      aiConfidenceAdjust: 0,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const caseId: string | undefined = body.caseId;
    const facts: Record<string, unknown> = body.facts || {};
    const mode: string = body.mode || "instant";
    const persist: boolean = body.persist !== false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    const orgId = profile?.organization_id;

    if (!orgId) {
      return new Response(JSON.stringify({ error: "No organization" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rules, error: rulesError } = await supabase
      .from("rules")
      .select("*")
      .eq("enabled", true)
      .order("priority", { ascending: true });

    if (rulesError) {
      return new Response(JSON.stringify({ error: "Failed to fetch rules" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scopedRules = (rules || []).filter((rule: any) => {
      if (!("organization_id" in rule)) return true;
      return !rule.organization_id || rule.organization_id === orgId;
    });

    const ruleIds = scopedRules.map((rule: any) => rule.id);
    const versionMap = new Map<string, RuleVersionRef>();

    if (ruleIds.length > 0) {
      const { data: versionRows } = await supabase
        .from("rule_versions" as any)
        .select("id, rule_id, version")
        .in("rule_id", ruleIds)
        .order("version", { ascending: false });

      for (const version of (versionRows || []) as RuleVersionRef[]) {
        if (!versionMap.has(version.rule_id)) {
          versionMap.set(version.rule_id, version);
        }
      }
    }

    const {
      firedRules,
      missingFacts,
      evidenceRefs,
      decisionVotes,
      firedRuleIds,
      totalConfidenceImpact,
      firedCount,
    } = evaluateRules({
      scopedRules,
      versionMap,
      facts,
    });

    const contradictions: string[] = [];
    const opposingPairs = [["approve", "deny"], ["escalate", "resolve"]];

    for (const [a, b] of opposingPairs) {
      if (decisionVotes[a] && decisionVotes[b]) {
        contradictions.push(`Conflicting rules: some suggest "${a}" while others suggest "${b}".`);
      }
    }

    const totalRules = scopedRules.length;
    const ruleStrength = totalRules > 0 ? (firedCount / totalRules) * 100 : 0;
    const evidenceCompleteness = missingFacts.length === 0
      ? 100
      : Math.max(0, 100 - missingFacts.length * 15);

    const dataQuality = deriveDataQuality(facts, missingFacts, evidenceRefs);
    const contradictionPenalty = deriveContradictionPenalty(contradictions);
    const contradictionSeverityPenalty = deriveContradictionSeverityPenalty(contradictions);
    const missingFactPenalty = deriveMissingFactPenalty(missingFacts);
    const corroboratingSignals = deriveCorroboratingSignals(firedRules);

    const rawConfidence =
      ruleStrength * 0.25 +
      corroboratingSignals * 0.25 +
      evidenceCompleteness * 0.2 +
      dataQuality * 0.15 +
      totalConfidenceImpact * 0.15;

    let finalConfidence = Math.max(
      5,
      Math.min(
        99,
        rawConfidence - contradictionPenalty - contradictionSeverityPenalty - missingFactPenalty,
      ),
    );

    let { decision } = resolveDecision({
      decisionVotes,
      contradictions,
      missingFacts,
      finalConfidence,
    });

    const firedExplanations = firedRules
      .filter((r) => r.fired && r.explanation)
      .map((r) => r.explanation);

    let explanation = firedExplanations.length > 0
      ? firedExplanations.join(" ")
      : `${firedCount} of ${totalRules} organization-scoped rules fired. Deterministic decision: ${decision}.`;

    let aiAssessment: string | undefined;
    let aiSuggestedDecision: string | undefined;
    let aiConfidenceAdjustment = 0;

    if (mode === "assisted") {
      const ai = await runAIAssisted(facts, firedRules, explanation, decision, finalConfidence);

      aiAssessment = ai.aiExplanation;
      aiSuggestedDecision = ai.aiSuggestedDecision;
      aiConfidenceAdjustment = ai.aiConfidenceAdjust;

      finalConfidence = Math.max(5, Math.min(99, finalConfidence + aiConfidenceAdjustment));
      explanation += ` [AI Advisory] ${ai.aiExplanation}`;

      if (aiSuggestedDecision && aiSuggestedDecision !== decision) {
        explanation += ` AI suggested "${aiSuggestedDecision}", but deterministic decision "${decision}" was preserved.`;
      }
    }

    const confidenceBand = finalConfidence >= 85
      ? "very_high"
      : finalConfidence >= 65
        ? "high"
        : finalConfidence >= 40
          ? "medium"
          : "low";

    const severity = deriveSeverity(firedRules);

    const totalVotes = Object.values(decisionVotes).reduce((a, b) => a + b, 0) || 1;

    const candidateDecisions = Object.entries(decisionVotes)
      .map(([d, v]) => ({
        decision: d,
        score: Math.round((v / totalVotes) * 100),
      }))
      .sort((a, b) => b.score - a.score);

    const traceId = crypto.randomUUID();

    const decisionTrace = buildDecisionTrace({
      traceId,
      organizationId: orgId,
      caseId,
      mode,
      decision,
      totalRules,
      firedCount,
      firedRuleIds,
      missingFacts,
      contradictions,
      evidenceRefs,
      candidateDecisions,
      confidenceInputs: {
        ruleStrength,
        corroboratingSignals,
        evidenceCompleteness,
        dataQuality,
        contradictionPenalty,
        contradictionSeverityPenalty,
        missingFactPenalty,
        aiConfidenceAdjustment,
      },
      firedRules,
    });

    const result = {
      decision,
      confidence: Math.round(finalConfidence * 10) / 10,
      confidenceBand,
      severity,
      explanation,
      candidateDecisions,
      confidenceBreakdown: {
        ruleStrength: Math.round(ruleStrength * 10) / 10,
        corroboratingSignals: Math.round(corroboratingSignals * 10) / 10,
        evidenceCompleteness: Math.round(evidenceCompleteness * 10) / 10,
        dataQuality: Math.round(dataQuality * 10) / 10,
        contradictionPenalty,
        contradictionSeverityPenalty,
        missingFactPenalty,
        aiConfidenceAdjustment,
        finalAdjusted: Math.round(finalConfidence * 10) / 10,
      },
      firedRules,
      missingFacts,
      contradictions,
      evidenceRefs,
      mode,
      deterministicDecisionPreserved: true,
      decisionTrace,
      ...(aiAssessment ? { aiAssessment, aiSuggestedDecision } : {}),
    };

    if (persist && caseId) {
      const { error: insertError } = await supabase.from("inference_runs").insert({
        case_id: caseId,
        organization_id: orgId,
        mode: mode as any,
        decision: decision as any,
        confidence: result.confidence,
        confidence_band: confidenceBand as any,
        severity: severity as any,
        explanation,
        candidate_decisions: candidateDecisions,
        confidence_breakdown: result.confidenceBreakdown,
        fired_rules: firedRules,
        missing_facts: missingFacts,
        contradictions,
        evidence_refs: evidenceRefs,
        input_snapshot: facts,
        decision_trace: decisionTrace,
        trace_id: traceId,
      });

      if (insertError) console.error("Failed to persist inference run:", insertError);

      const statusMap: Record<Decision, string> = {
        approve: "resolved",
        deny: "resolved",
        escalate: "escalated",
        review: "processing",
        flag: "processing",
        request_info: "pending_info",
        unresolved: "processing",
      };

      const newStatus = statusMap[decision] || "processing";

      await supabase
        .from("cases")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", caseId)
        .eq("organization_id", orgId);

      for (const ruleId of firedRuleIds) {
        try {
          await supabase.rpc("increment_rule_hit_count" as any, { rule_id: ruleId });
        } catch {
          // Non-critical metric update.
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});