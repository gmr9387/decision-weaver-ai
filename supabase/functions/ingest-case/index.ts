import { createServiceClient, corsHeaders, respond } from "../_shared/cors.ts";
import { authenticateApiKey } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { fireWebhooks } from "../_shared/webhooks.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  if (req.method !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  const supabase = createServiceClient();
  let orgId: string | null = null;
  let requestBody: Record<string, unknown> = {};

  try {
    // --- Auth ---
    const authResult = await authenticateApiKey(supabase, req.headers.get("x-api-key"));
    if ("error" in authResult) {
      return await logAndRespond(supabase, null, authResult.status, { error: authResult.error }, requestBody, ip, userAgent, startTime);
    }
    orgId = authResult.orgId;

    // --- Rate Limiting ---
    const rateLimit = await checkRateLimit(supabase, orgId);
    if (!rateLimit.allowed) {
      return await logAndRespond(supabase, orgId, 429, {
        error: "Rate limit exceeded",
        limit: 30,
        window: "1m",
        retry_after_seconds: rateLimit.retryAfter,
      }, requestBody, ip, userAgent, startTime, rateLimit.headers);
    }

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
      }, requestBody, ip, userAgent, startTime, rateLimit.headers);
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
        category, source, severity, description, amount, tags, metadata, owner,
      })
      .select("id, case_number, status, severity, category, created_at")
      .single();

    if (caseErr) {
      return await logAndRespond(supabase, orgId, 500, {
        error: "Failed to create case", detail: caseErr.message,
      }, requestBody, ip, userAgent, startTime, rateLimit.headers);
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

    // --- Fire webhooks with retry ---
    fireWebhooks(supabase, orgId, newCase.id, {
      event: "case.ingested",
      timestamp: new Date().toISOString(),
      case: {
        id: newCase.id,
        case_number: newCase.case_number,
        status: newCase.status,
        severity: newCase.severity,
        category: newCase.category,
        facts_count: factEntries.length,
        created_at: newCase.created_at,
      },
    }).catch(e => console.error("Webhook dispatch error:", e));

    return await logAndRespond(supabase, orgId, 201, result, requestBody, ip, userAgent, startTime, rateLimit.headers);
  } catch (err) {
    return await logAndRespond(supabase, orgId, 500, {
      error: "Internal error", detail: String(err),
    }, requestBody, ip, userAgent, startTime);
  }
});

async function logAndRespond(
  supabase: ReturnType<typeof createServiceClient>,
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

  if (orgId) {
    try {
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
