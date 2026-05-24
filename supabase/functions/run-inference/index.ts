import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Condition {
  fact?: string;
  operator?: string;
  value?: unknown;
  all?: Condition[];
  any?: Condition[];
}

type Decision =
  | "approve"
  | "deny"
  | "escalate"
  | "review"
  | "flag"
  | "request_info"
  | "unresolved";

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return (value ?? fallback) as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function evaluateCondition(
  cond: Condition,
  facts: Record<string, unknown>,
): { met: boolean; label: string } {
  if (cond.all) {
    const results = cond.all.map((c) => evaluateCondition(c, facts));
    return {
      met: results.every((r) => r.met),
      label: `ALL(${results.map((r) => r.label).join(", ")})`,
    };
  }

  if (cond.any) {
    const results = cond.any.map((c) => evaluateCondition(c, facts));
    return {
      met: results.some((r) => r.met),
      label: `ANY(${results.map((r) => r.label).join(", ")})`,
    };
  }

  const factKey = cond.fact ?? "";
  const op = cond.operator ?? "equals";
  const expected = cond.value;
  const actual = facts[factKey];
  const label = `${factKey} ${op} ${JSON.stringify(expected)}`;

  if (!factKey) return { met: false, label: "[missing fact key]" };
  if (actual === undefined) return { met: false, label: `${label} [missing]` };

  const numActual = Number(actual);
  const numExpected = Number(expected);
  const numericReady = Number.isFinite(numActual) && Number.isFinite(numExpected);

  switch (op) {
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
      return { met: Array.isArray(expected) && expected.includes(actual), label };

    case "exists":
      return { met: actual !== null && actual !== undefined, label };

    default:
      return { met: false, label: `${label} [unknown operator]` };
  }
}

function collectLeaves(
  c: Condition,
  facts: Record<string, unknown>,
): { met: boolean; label: string }[] {
  if (c.all) return c.all.flatMap((sub) => collectLeaves(sub, facts));
  if (c.any) return c.any.flatMap((sub) => collectLeaves(sub, facts));
  return [evaluateCondition(c, facts)];
}

function deriveDataQuality(
  facts: Record<string, unknown>,
  missingFacts: string[],
  evidenceRefs: string[],
): number {
  const factCount = Object.keys(facts).length;
  const completenessBase = factCount === 0 ? 15 : Math.min(100, 45 + factCount * 6);
  const missingPenalty = missingFacts.length * 12;
  const evidenceBoost = Math.min(20, evidenceRefs.length * 5);

  return Math.max(5, Math.min(100, completenessBase + evidenceBoost - missingPenalty));
}

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
${firedRules.filter((r) => r.fired).map((r) => `${r.name} (priority ${r.priority})`).join(", ")}

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

    const firedRules: any[] = [];
    const missingFacts: string[] = [];
    const contradictions: string[] = [];
    const evidenceRefs: string[] = [];
    const decisionVotes: Record<string, number> = {};
    const firedRuleIds: string[] = [];

    let totalConfidenceImpact = 0;
    let firedCount = 0;

    for (const rule of scopedRules) {
      const conditions = safeJsonParse<Condition>(rule.conditions, {});
      const output = safeJsonParse<Record<string, any>>(rule.output, {});
      const rootCondition: Condition = conditions.all || conditions.any
        ? conditions
        : { all: [conditions] };

      const leafResults = collectLeaves(rootCondition, facts);
      const conditionsMet = leafResults.filter((r) => r.met).map((r) => r.label);
      const conditionsUnmet = leafResults.filter((r) => !r.met).map((r) => r.label);

      for (const r of leafResults) {
        if (r.label.includes("[missing]")) {
          const factName = r.label.split(" ")[0];
          if (factName && !missingFacts.includes(factName)) missingFacts.push(factName);
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

        if (output?.evidence) evidenceRefs.push(output.evidence);
      }

      let ruleExplanation = rule.explanation_template || "";

      for (const [k, v] of Object.entries(facts)) {
        ruleExplanation = ruleExplanation.replaceAll(`{{${k}}}`, String(v));
      }

      firedRules.push({
        ruleId: rule.id,
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

    const uniqueDecisions = Object.keys(decisionVotes);
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
    const contradictionPenalty = contradictions.length * 15;
    const missingFactPenalty = missingFacts.length * 8;
    const corroboratingSignals = firedCount > 1 ? Math.min(100, firedCount * 20) : 0;

    const rawConfidence =
      ruleStrength * 0.3 +
      corroboratingSignals * 0.2 +
      evidenceCompleteness * 0.2 +
      dataQuality * 0.15 +
      totalConfidenceImpact * 0.15;

    let finalConfidence = Math.max(
      5,
      Math.min(99, rawConfidence - contradictionPenalty - missingFactPenalty),
    );

    let decision: Decision = "unresolved";

    if (uniqueDecisions.length > 0) {
      decision = uniqueDecisions.reduce((a, b) =>
        decisionVotes[a] >= decisionVotes[b] ? a : b
      ) as Decision;
    }

    if (contradictions.length > 0 && finalConfidence < 70) {
      decision = "review";
    }

    if (missingFacts.length > 0 && finalConfidence < 50 && decision !== "deny" && decision !== "escalate") {
      decision = "request_info";
    }

    if (finalConfidence < 40 && decision !== "deny" && decision !== "escalate" && decision !== "request_info") {
      decision = "review";
    }

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

    const severity = firedRules.some((r) => r.fired && r.priority <= 2)
      ? "critical"
      : firedRules.some((r) => r.fired && r.priority <= 4)
        ? "high"
        : "medium";

    const totalVotes = Object.values(decisionVotes).reduce((a, b) => a + b, 0) || 1;

    const candidateDecisions = Object.entries(decisionVotes)
      .map(([d, v]) => ({
        decision: d,
        score: Math.round((v / totalVotes) * 100),
      }))
      .sort((a, b) => b.score - a.score);

    const traceId = crypto.randomUUID();

    const decisionTrace = {
      traceId,
      organizationId: orgId,
      caseId: caseId ?? null,
      evaluatedAt: new Date().toISOString(),
      mode,
      deterministicDecision: decision,
      deterministicDecisionPreserved: true,
      rulesEvaluated: totalRules,
      rulesFired: firedCount,
      firedRuleIds,
      missingFacts,
      contradictions,
      evidenceRefs,
      candidateDecisions,
      confidenceInputs: {
        ruleStrength: Math.round(ruleStrength * 10) / 10,
        corroboratingSignals: Math.round(corroboratingSignals * 10) / 10,
        evidenceCompleteness: Math.round(evidenceCompleteness * 10) / 10,
        dataQuality: Math.round(dataQuality * 10) / 10,
        contradictionPenalty,
        missingFactPenalty,
        aiConfidenceAdjustment,
      },
      ruleTrace: firedRules.map((rule) => ({
        ruleId: rule.ruleId,
        name: rule.name,
        priority: rule.priority,
        fired: rule.fired,
        conditionsMet: rule.conditionsMet,
        conditionsUnmet: rule.conditionsUnmet,
        confidenceImpact: rule.confidenceImpact,
        explanation: rule.explanation,
      })),
    };

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

      const statusMap: Record<string, string> = {
        approve: "resolved",
        deny: "resolved",
        escalate: "escalated",
        review: "processing",
        flag: "processing",
        request_info: "pending_info",
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