import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

const RATE_LIMIT_WINDOW_MINUTES = 1;
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per org

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  if (req.method !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  // Use service role for all DB operations
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let orgId: string | null = null;
  let requestBody: Record<string, unknown> = {};

  try {
    // --- Auth ---
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || !apiKey.startsWith("ic_")) {
      return await logAndRespond(supabase, null, 401, { error: "Missing or invalid API key. Pass via x-api-key header." }, requestBody, ip, userAgent, startTime);
    }

    const { data: orgs, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name, settings")
      .filter("settings->api_key", "eq", `"${apiKey}"`);

    if (orgErr || !orgs || orgs.length === 0) {
      return await logAndRespond(supabase, null, 403, { error: "Invalid API key" }, requestBody, ip, userAgent, startTime);
    }

    const org = orgs[0];
    orgId = org.id;

    // --- Rate Limiting ---
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("api_request_logs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", windowStart);

    if ((recentCount || 0) >= RATE_LIMIT_MAX_REQUESTS) {
      const retryAfter = RATE_LIMIT_WINDOW_MINUTES * 60;
      return await logAndRespond(supabase, orgId, 429, {
        error: "Rate limit exceeded",
        limit: RATE_LIMIT_MAX_REQUESTS,
        window: `${RATE_LIMIT_WINDOW_MINUTES}m`,
        retry_after_seconds: retryAfter,
      }, requestBody, ip, userAgent, startTime, {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": new Date(Date.now() + retryAfter * 1000).toISOString(),
      });
    }

    const remaining = RATE_LIMIT_MAX_REQUESTS - (recentCount || 0) - 1;
    const rateLimitHeaders = {
      "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
      "X-RateLimit-Remaining": String(Math.max(0, remaining)),
      "X-RateLimit-Reset": new Date(Date.now() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString(),
    };

    // --- Parse & Validate ---
    requestBody = await req.json();
    const category = requestBody.category as string || "General";
    const source = requestBody.source as string || "API Ingest";
    const severity = requestBody.severity as string || "medium";
    const description = requestBody.description as string || "";
    const amount = (requestBody.amount as number) ?? null;
    const tags = (requestBody.tags as string[]) || [];
    const facts = (requestBody.facts as Record<string, unknown>) || {};
    const metadata = (requestBody.metadata as Record<string, unknown>) || {};
    const owner = (requestBody.owner as string) || null;

    const validSeverities = ["low", "medium", "high", "critical"];
    if (!validSeverities.includes(severity)) {
      return await logAndRespond(supabase, orgId, 400, {
        error: `Invalid severity. Must be one of: ${validSeverities.join(", ")}`,
      }, requestBody, ip, userAgent, startTime, rateLimitHeaders);
    }

    // --- Generate case number ---
    const { count } = await supabase
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId);

    const caseNumber = (requestBody.case_number as string) ||
      `IC-${new Date().getFullYear()}-${String((count || 0) + 1001).padStart(4, "0")}`;

    // --- Insert case ---
    const { data: newCase, error: caseErr } = await supabase
      .from("cases")
      .insert({
        organization_id: orgId,
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
      return await logAndRespond(supabase, orgId, 500, {
        error: "Failed to create case", detail: caseErr.message,
      }, requestBody, ip, userAgent, startTime, rateLimitHeaders);
    }

    // --- Insert facts ---
    const factEntries = Object.entries(facts);
    if (factEntries.length > 0) {
      const factRows = factEntries.map(([key, value]) => ({
        case_id: newCase.id,
        fact_key: key,
        fact_value: typeof value === "object" ? value : String(value),
        source: "API Ingest",
        quality: "unverified",
      }));
      await supabase.from("case_facts").insert(factRows);
    }

    const result = {
      success: true,
      case: {
        id: newCase.id,
        case_number: newCase.case_number,
        status: newCase.status,
        severity: newCase.severity,
        created_at: newCase.created_at,
        facts_count: factEntries.length,
      },
    };

    return await logAndRespond(supabase, orgId, 201, result, requestBody, ip, userAgent, startTime, rateLimitHeaders);
  } catch (err) {
    return await logAndRespond(supabase, orgId, 500, {
      error: "Internal error", detail: String(err),
    }, requestBody, ip, userAgent, startTime);
  }
});

function respond(status: number, body: Record<string, unknown>, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(extraHeaders || {}) },
  });
}

async function logAndRespond(
  supabase: ReturnType<typeof createClient>,
  orgId: string | null,
  status: number,
  body: Record<string, unknown>,
  requestBody: Record<string, unknown>,
  ip: string,
  userAgent: string,
  startTime: number,
  extraHeaders?: Record<string, string>,
) {
  const duration = Date.now() - startTime;

  // Log the request (best-effort, don't fail the response)
  if (orgId) {
    try {
      // Sanitize request body — strip large fact values for storage
      const sanitized = { ...requestBody };
      if (sanitized.facts && typeof sanitized.facts === "object") {
        const factKeys = Object.keys(sanitized.facts as Record<string, unknown>);
        (sanitized as any).facts = `[${factKeys.length} facts: ${factKeys.join(", ")}]`;
      }

      await supabase.from("api_request_logs").insert({
        organization_id: orgId,
        endpoint: "/ingest-case",
        method: "POST",
        status_code: status,
        ip_address: ip,
        user_agent: userAgent,
        request_body: sanitized,
        response_summary: status < 400 ? `Created ${(body as any)?.case?.case_number || "case"}` : (body as any)?.error || "Error",
        duration_ms: duration,
      });
    } catch (e) {
      console.error("Failed to log request:", e);
    }
  }

  return respond(status, body, extraHeaders);
}
