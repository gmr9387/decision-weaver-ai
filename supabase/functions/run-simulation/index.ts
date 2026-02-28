import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Condition evaluator ────────────────────────────────────────────
// Conditions schema: { all?: Condition[], any?: Condition[] }
// Condition: { fact, operator, value } | { all, any }
interface Condition {
  fact?: string;
  operator?: string;
  value?: unknown;
  all?: Condition[];
  any?: Condition[];
}

function evaluateCondition(
  cond: Condition,
  facts: Record<string, unknown>,
): { met: boolean; label: string } {
  // Nested group
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

  // Leaf condition
  const factKey = cond.fact ?? "";
  const op = cond.operator ?? "equals";
  const expected = cond.value;
  const actual = facts[factKey];
  const label = `${factKey} ${op} ${JSON.stringify(expected)}`;

  if (actual === undefined) return { met: false, label: `${label} [missing]` };

  const numActual = Number(actual);
  const numExpected = Number(expected);

  switch (op) {
    case "equals":
    case "equal":
      return { met: String(actual) === String(expected), label };
    case "notEquals":
    case "notEqual":
      return { met: String(actual) !== String(expected), label };
    case "greaterThan":
      return { met: numActual > numExpected, label };
    case "greaterThanOrEqual":
    case "greaterThanInclusive":
      return { met: numActual >= numExpected, label };
    case "lessThan":
      return { met: numActual < numExpected, label };
    case "lessThanOrEqual":
    case "lessThanInclusive":
      return { met: numActual <= numExpected, label };
    case "contains":
      return { met: String(actual).includes(String(expected)), label };
    case "in":
      return {
        met: Array.isArray(expected) && expected.includes(actual),
        label,
      };
    case "exists":
      return { met: actual !== null && actual !== undefined, label };
    default:
      return { met: false, label: `${label} [unknown operator]` };
  }
}

// ── Main handler ───────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Validate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const facts: Record<string, unknown> = body.facts || {};
    const mode: string = body.mode || "instant";

    // Fetch user's org rules (enabled only, ordered by priority)
    const { data: rules, error: rulesError } = await supabase
      .from("rules")
      .select("*")
      .eq("enabled", true)
      .order("priority", { ascending: true });

    if (rulesError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch rules", detail: rulesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Evaluate each rule ─────────────────────────────────────────
    const firedRules: Array<{
      ruleId: string;
      name: string;
      type: string;
      priority: number;
      fired: boolean;
      conditionsMet: string[];
      conditionsUnmet: string[];
      output: string;
      confidenceImpact: number;
      explanation: string;
    }> = [];

    const missingFacts: string[] = [];
    const contradictions: string[] = [];
    const evidenceRefs: string[] = [];
    let totalConfidenceImpact = 0;
    let firedCount = 0;
    const decisionVotes: Record<string, number> = {};

    for (const rule of rules || []) {
      const conditions = (typeof rule.conditions === "string"
        ? JSON.parse(rule.conditions)
        : rule.conditions) as Condition;
      const output = typeof rule.output === "string"
        ? JSON.parse(rule.output)
        : rule.output;

      // Wrap bare conditions in { all: [...] } if needed
      const rootCondition: Condition = conditions.all || conditions.any
        ? conditions
        : { all: [conditions] };

      // Collect individual leaf results
      const leafResults: { met: boolean; label: string }[] = [];
      function collectLeaves(c: Condition) {
        if (c.all) { c.all.forEach(collectLeaves); return; }
        if (c.any) { c.any.forEach(collectLeaves); return; }
        leafResults.push(evaluateCondition(c, facts));
      }
      collectLeaves(rootCondition);

      const conditionsMet = leafResults.filter((r) => r.met).map((r) => r.label);
      const conditionsUnmet = leafResults.filter((r) => !r.met).map((r) => r.label);

      // Track missing facts
      for (const r of leafResults) {
        if (r.label.includes("[missing]")) {
          const factName = r.label.split(" ")[0];
          if (!missingFacts.includes(factName)) missingFacts.push(factName);
        }
      }

      const overallResult = evaluateCondition(rootCondition, facts);
      const fired = overallResult.met;

      if (fired) {
        firedCount++;
        totalConfidenceImpact += rule.confidence_impact || 0;

        // Tally decision votes weighted by priority (lower = higher weight)
        const decision = output?.decision || output?.action;
        if (decision) {
          const weight = Math.max(1, 11 - rule.priority); // priority 1 → weight 10
          decisionVotes[decision] = (decisionVotes[decision] || 0) + weight;
        }

        if (output?.evidence) {
          evidenceRefs.push(output.evidence);
        }
      }

      // Build explanation from template
      let explanation = rule.explanation_template || "";
      for (const [k, v] of Object.entries(facts)) {
        explanation = explanation.replace(`{{${k}}}`, String(v));
      }

      firedRules.push({
        ruleId: rule.id,
        name: rule.name,
        type: rule.rule_type,
        priority: rule.priority,
        fired,
        conditionsMet,
        conditionsUnmet,
        output: JSON.stringify(output),
        confidenceImpact: rule.confidence_impact || 0,
        explanation: fired ? explanation : "",
      });
    }

    // ── Detect contradictions ──────────────────────────────────────
    const uniqueDecisions = Object.keys(decisionVotes);
    if (uniqueDecisions.length > 1) {
      // Check for opposing decisions
      const opposing = [
        ["approve", "deny"],
        ["escalate", "resolve"],
      ];
      for (const [a, b] of opposing) {
        if (decisionVotes[a] && decisionVotes[b]) {
          contradictions.push(
            `Conflicting rules: some suggest "${a}" while others suggest "${b}"`,
          );
        }
      }
    }

    // ── Compute confidence ─────────────────────────────────────────
    const totalRules = (rules || []).length;
    const ruleStrength = totalRules > 0 ? (firedCount / totalRules) * 100 : 0;
    const evidenceCompleteness = missingFacts.length === 0
      ? 100
      : Math.max(0, 100 - missingFacts.length * 15);
    const dataQuality = 75; // baseline; could be computed from fact.quality
    const contradictionPenalty = contradictions.length * 15;
    const missingFactPenalty = missingFacts.length * 10;
    const corroboratingSignals = firedCount > 1 ? Math.min(100, firedCount * 20) : 0;

    const rawConfidence =
      ruleStrength * 0.3 +
      corroboratingSignals * 0.2 +
      evidenceCompleteness * 0.2 +
      dataQuality * 0.15 +
      totalConfidenceImpact * 0.15;

    const finalConfidence = Math.max(
      5,
      Math.min(99, rawConfidence - contradictionPenalty - missingFactPenalty),
    );

    // ── Determine decision ─────────────────────────────────────────
    let decision = "unresolved";
    if (uniqueDecisions.length > 0) {
      decision = uniqueDecisions.reduce((a, b) =>
        decisionVotes[a] >= decisionVotes[b] ? a : b,
      );
    }

    // Override: low confidence → review
    if (finalConfidence < 40 && decision !== "deny" && decision !== "escalate") {
      decision = "review";
    }

    // Confidence band
    const confidenceBand = finalConfidence >= 85
      ? "very_high"
      : finalConfidence >= 65
        ? "high"
        : finalConfidence >= 40
          ? "medium"
          : "low";

    // Severity from rules or default
    const severity = firedRules.some((r) => r.fired && r.priority <= 2)
      ? "critical"
      : firedRules.some((r) => r.fired && r.priority <= 4)
        ? "high"
        : "medium";

    // Build explanation
    const firedExplanations = firedRules
      .filter((r) => r.fired && r.explanation)
      .map((r) => r.explanation);
    const explanation = firedExplanations.length > 0
      ? firedExplanations.join(" ")
      : `${firedCount} of ${totalRules} rules evaluated. Decision: ${decision} with ${finalConfidence.toFixed(1)}% confidence.`;

    // Candidate decisions
    const totalVotes = Object.values(decisionVotes).reduce((a, b) => a + b, 0) || 1;
    const candidateDecisions = Object.entries(decisionVotes)
      .map(([d, v]) => ({ decision: d, score: Math.round((v / totalVotes) * 100) }))
      .sort((a, b) => b.score - a.score);

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
        dataQuality,
        contradictionPenalty,
        missingFactPenalty,
        finalAdjusted: Math.round(finalConfidence * 10) / 10,
      },
      firedRules,
      missingFacts,
      contradictions,
      evidenceRefs,
      mode,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
