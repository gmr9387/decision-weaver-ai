import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || !apiKey.startsWith("ic_")) {
      return new Response(JSON.stringify({ error: "Missing or invalid API key. Pass via x-api-key header." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS for lookups
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up the organization by API key
    const { data: orgs, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name")
      .filter("settings->api_key", "eq", `"${apiKey}"`);

    if (orgErr || !orgs || orgs.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const org = orgs[0];
    const body = await req.json();

    // Validate required fields
    const category = body.category || "General";
    const source = body.source || "API Ingest";
    const severity = body.severity || "medium";
    const description = body.description || "";
    const amount = body.amount ?? null;
    const tags = body.tags || [];
    const facts = body.facts || {};
    const metadata = body.metadata || {};
    const owner = body.owner || null;

    // Validate severity
    const validSeverities = ["low", "medium", "high", "critical"];
    if (!validSeverities.includes(severity)) {
      return new Response(JSON.stringify({ error: `Invalid severity. Must be one of: ${validSeverities.join(", ")}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate case number
    const { count } = await supabase
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", org.id);

    const caseNumber = body.case_number ||
      `IC-${new Date().getFullYear()}-${String((count || 0) + 1001).padStart(4, "0")}`;

    // Insert case
    const { data: newCase, error: caseErr } = await supabase
      .from("cases")
      .insert({
        organization_id: org.id,
        case_number: caseNumber,
        category,
        source,
        severity,
        description,
        amount,
        tags,
        metadata,
        owner,
      })
      .select("id, case_number, status, severity, created_at")
      .single();

    if (caseErr) {
      return new Response(JSON.stringify({ error: "Failed to create case", detail: caseErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert facts if provided
    const factEntries = Object.entries(facts);
    if (factEntries.length > 0) {
      const factRows = factEntries.map(([key, value]) => ({
        case_id: newCase.id,
        fact_key: key,
        fact_value: typeof value === "object" ? value : String(value),
        source: "API Ingest",
        quality: "unverified",
      }));

      const { error: factsErr } = await supabase.from("case_facts").insert(factRows);
      if (factsErr) {
        console.error("Failed to insert facts:", factsErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      case: {
        id: newCase.id,
        case_number: newCase.case_number,
        status: newCase.status,
        severity: newCase.severity,
        created_at: newCase.created_at,
        facts_count: factEntries.length,
      },
    }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
