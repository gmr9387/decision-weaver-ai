import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEMO_RULES = [
  {
    name: "High Amount Flag",
    description: "Flag cases with amount over $25,000 for manual review",
    category: "Risk",
    rule_type: "deterministic",
    priority: 1,
    enabled: true,
    conditions: { all: [{ fact: "amount_requested", operator: "greaterThan", value: 25000 }] },
    output: { decision: "flag", evidence: "POLICY-AMT-001" },
    confidence_impact: 15,
    explanation_template: "Amount of ${{amount_requested}} exceeds $25,000 threshold — flagged for review.",
  },
  {
    name: "Auto-Approve Low Risk",
    description: "Auto-approve cases under $5,000 with complete docs and low risk",
    category: "Efficiency",
    rule_type: "deterministic",
    priority: 2,
    enabled: true,
    conditions: { all: [
      { fact: "amount_requested", operator: "lessThan", value: 5000 },
      { fact: "document_count", operator: "greaterThanOrEqual", value: 3 },
      { fact: "risk_score", operator: "lessThan", value: 30 },
    ]},
    output: { decision: "approve", evidence: "POLICY-AUTO-001" },
    confidence_impact: 35,
    explanation_template: "Case meets auto-approval criteria: amount ${{amount_requested}}, {{document_count}} docs, risk score {{risk_score}}.",
  },
  {
    name: "Missing Authorization Block",
    description: "Block processing when prior authorization is missing for amounts over $5,000",
    category: "Authorization",
    rule_type: "deterministic",
    priority: 1,
    enabled: true,
    conditions: { all: [
      { fact: "prior_authorization", operator: "equals", value: false },
      { fact: "amount_requested", operator: "greaterThan", value: 5000 },
    ]},
    output: { decision: "request_info", evidence: "AUTH-REQ-001" },
    confidence_impact: -20,
    explanation_template: "Prior authorization missing for ${{amount_requested}} — requesting additional info.",
  },
  {
    name: "Enterprise Tier Boost",
    description: "Boost confidence for enterprise-tier requesters",
    category: "Policy",
    rule_type: "heuristic",
    priority: 4,
    enabled: true,
    conditions: { all: [{ fact: "requester_tier", operator: "equals", value: "enterprise" }] },
    output: { decision: "approve", evidence: "TIER-ENT-001" },
    confidence_impact: 10,
    explanation_template: "Enterprise tier requester — priority processing applied.",
  },
  {
    name: "High Risk Escalation",
    description: "Escalate cases with risk score above 70",
    category: "Risk",
    rule_type: "heuristic",
    priority: 3,
    enabled: true,
    conditions: { all: [{ fact: "risk_score", operator: "greaterThan", value: 70 }] },
    output: { decision: "escalate", evidence: "RISK-ESC-001" },
    confidence_impact: 20,
    explanation_template: "Risk score {{risk_score}} exceeds threshold of 70 — escalation required.",
  },
];

const DEMO_CASES = [
  { case_number: "IC-2025-1001", category: "Authorization Review", source: "Portal Submission", severity: "high", owner: "Sarah Chen", amount: 45000, description: "Large authorization review from portal submission requiring multiple document verification.", tags: ["high-value", "needs-review"] },
  { case_number: "IC-2025-1002", category: "Compliance Check", source: "API Ingest", severity: "medium", owner: "Marcus Rivera", amount: 8500, description: "Standard compliance check via automated API ingestion.", tags: ["compliance"] },
  { case_number: "IC-2025-1003", category: "Risk Assessment", source: "Manual Entry", severity: "critical", owner: "Priya Patel", amount: 120000, description: "Critical risk assessment for high-value transaction flagged by monitoring.", tags: ["urgent", "high-value"] },
  { case_number: "IC-2025-1004", category: "Documentation Gap", source: "Batch Upload", severity: "low", owner: "Auto-Queue", amount: 2500, description: "Low-value case with minor documentation gaps identified in batch processing.", tags: ["documentation", "auto-resolved"] },
  { case_number: "IC-2025-1005", category: "Exception Handling", source: "Partner Feed", severity: "medium", owner: "James Mitchell", amount: 15000, description: "Exception case from partner feed requiring manual exception code evaluation.", tags: ["exception"] },
  { case_number: "IC-2025-1006", category: "Routing Decision", source: "Internal Scan", severity: "low", owner: "Auto-Queue", amount: 3200, description: "Standard routing decision from internal compliance scan.", tags: ["auto-resolved"] },
  { case_number: "IC-2025-1007", category: "Denial Analysis", source: "Portal Submission", severity: "high", owner: "Elena Vasquez", amount: 67000, description: "Complex denial analysis requiring multi-factor authorization review.", tags: ["needs-review", "complex"] },
  { case_number: "IC-2025-1008", category: "Threshold Trigger", source: "API Ingest", severity: "medium", owner: "David Park", amount: 9800, description: "Near-threshold case requiring careful evaluation of multiple policy rules.", tags: ["recurring"] },
  { case_number: "IC-2025-1009", category: "Compliance Check", source: "Manual Entry", severity: "low", owner: "Auto-Queue", amount: 1200, description: "Simple compliance verification with all documentation present.", tags: ["auto-resolved", "first-time"] },
  { case_number: "IC-2025-1010", category: "Risk Assessment", source: "Partner Feed", severity: "high", owner: "Sarah Chen", amount: 38000, description: "Partner-originated risk assessment with elevated risk indicators.", tags: ["urgent", "needs-review"] },
];

const CASE_FACTS: Record<string, Array<{ fact_key: string; fact_value: any; source: string; quality: string; is_derived: boolean }>> = {
  "IC-2025-1001": [
    { fact_key: "amount_requested", fact_value: 45000, source: "Portal", quality: "verified", is_derived: false },
    { fact_key: "document_count", fact_value: 5, source: "System", quality: "verified", is_derived: false },
    { fact_key: "prior_authorization", fact_value: true, source: "Registry", quality: "verified", is_derived: false },
    { fact_key: "requester_tier", fact_value: "enterprise", source: "CRM", quality: "verified", is_derived: false },
    { fact_key: "risk_score", fact_value: 42.5, source: "Model", quality: "inferred", is_derived: true },
  ],
  "IC-2025-1002": [
    { fact_key: "amount_requested", fact_value: 8500, source: "API", quality: "verified", is_derived: false },
    { fact_key: "document_count", fact_value: 3, source: "System", quality: "verified", is_derived: false },
    { fact_key: "prior_authorization", fact_value: false, source: "Registry", quality: "verified", is_derived: false },
    { fact_key: "requester_tier", fact_value: "standard", source: "CRM", quality: "verified", is_derived: false },
    { fact_key: "risk_score", fact_value: 28.3, source: "Model", quality: "inferred", is_derived: true },
  ],
  "IC-2025-1003": [
    { fact_key: "amount_requested", fact_value: 120000, source: "Manual", quality: "verified", is_derived: false },
    { fact_key: "document_count", fact_value: 7, source: "System", quality: "verified", is_derived: false },
    { fact_key: "prior_authorization", fact_value: true, source: "Registry", quality: "verified", is_derived: false },
    { fact_key: "requester_tier", fact_value: "enterprise", source: "CRM", quality: "verified", is_derived: false },
    { fact_key: "risk_score", fact_value: 85.2, source: "Model", quality: "inferred", is_derived: true },
  ],
  "IC-2025-1004": [
    { fact_key: "amount_requested", fact_value: 2500, source: "Batch", quality: "verified", is_derived: false },
    { fact_key: "document_count", fact_value: 4, source: "System", quality: "verified", is_derived: false },
    { fact_key: "prior_authorization", fact_value: true, source: "Registry", quality: "verified", is_derived: false },
    { fact_key: "requester_tier", fact_value: "standard", source: "CRM", quality: "verified", is_derived: false },
    { fact_key: "risk_score", fact_value: 12.1, source: "Model", quality: "inferred", is_derived: true },
  ],
  "IC-2025-1005": [
    { fact_key: "amount_requested", fact_value: 15000, source: "Partner", quality: "verified", is_derived: false },
    { fact_key: "document_count", fact_value: 2, source: "System", quality: "verified", is_derived: false },
    { fact_key: "prior_authorization", fact_value: false, source: "Registry", quality: "unverified", is_derived: false },
    { fact_key: "requester_tier", fact_value: "premium", source: "CRM", quality: "verified", is_derived: false },
    { fact_key: "risk_score", fact_value: 55.8, source: "Model", quality: "inferred", is_derived: true },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("user_id", user.id).single();
    const orgId = profile?.organization_id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: "No organization" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if data already exists
    const { count: ruleCount } = await supabase.from("rules").select("*", { count: "exact", head: true }).eq("organization_id", orgId);
    const { count: caseCount } = await supabase.from("cases").select("*", { count: "exact", head: true }).eq("organization_id", orgId);

    if ((ruleCount || 0) > 0 && (caseCount || 0) > 0) {
      return new Response(JSON.stringify({ message: "Demo data already exists", seeded: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Seed rules
    if ((ruleCount || 0) === 0) {
      const rulesPayload = DEMO_RULES.map(r => ({ ...r, organization_id: orgId }));
      const { error } = await supabase.from("rules").insert(rulesPayload);
      if (error) console.error("Error seeding rules:", error);
    }

    // Seed cases
    const caseIdMap: Record<string, string> = {};
    if ((caseCount || 0) === 0) {
      for (const c of DEMO_CASES) {
        const { data, error } = await supabase.from("cases").insert({
          ...c,
          organization_id: orgId,
          status: "open",
          review_state: "pending",
        }).select("id, case_number").single();
        if (error) { console.error("Error seeding case:", error); continue; }
        if (data) caseIdMap[data.case_number] = data.id;
      }

      // Seed facts
      for (const [caseNum, facts] of Object.entries(CASE_FACTS)) {
        const caseId = caseIdMap[caseNum];
        if (!caseId) continue;
        const factsPayload = facts.map(f => ({ ...f, case_id: caseId }));
        await supabase.from("case_facts").insert(factsPayload);
      }
    }

    // Seed 30 days of metrics
    const { count: metricCount } = await supabase.from("daily_metrics").select("*", { count: "exact", head: true }).eq("organization_id", orgId);
    if ((metricCount || 0) === 0) {
      const metrics = [];
      for (let i = 30; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000);
        const processed = Math.floor(Math.random() * 80 + 40);
        metrics.push({
          organization_id: orgId,
          date: date.toISOString().split("T")[0],
          processed,
          auto_resolved: Math.floor(processed * (0.4 + Math.random() * 0.25)),
          escalated: Math.floor(processed * (0.05 + Math.random() * 0.1)),
          avg_confidence: +(65 + Math.random() * 25).toFixed(1),
          avg_time_to_decision: +(0.5 + Math.random() * 3).toFixed(1),
        });
      }
      await supabase.from("daily_metrics").insert(metrics);
    }

    return new Response(JSON.stringify({
      message: "Demo data seeded successfully",
      seeded: true,
      rules: DEMO_RULES.length,
      cases: Object.keys(caseIdMap).length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
