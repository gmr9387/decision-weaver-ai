import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 2000;

export async function fireWebhooks(
  supabase: SupabaseClient,
  orgId: string,
  caseId: string,
  payload: Record<string, unknown>,
) {
  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("id, url, signing_secret, enabled")
    .eq("organization_id", orgId)
    .eq("enabled", true);

  if (!webhooks || webhooks.length === 0) return;

  const rawBody = JSON.stringify(payload);

  await Promise.allSettled(
    webhooks.map(async (wh: any) => {
      await deliverWithRetry(supabase, wh, rawBody, caseId, orgId);
    }),
  );
}

async function deliverWithRetry(
  supabase: SupabaseClient,
  wh: any,
  rawBody: string,
  caseId: string,
  orgId: string,
) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const deliveryStart = Date.now();
    let statusCode: number | null = null;
    let responseBody = "";
    let errorMessage: string | null = null;
    let deliveryStatus = "success";

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };

      if (wh.signing_secret) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(wh.signing_secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
        headers["x-webhook-signature"] = Array.from(new Uint8Array(sig))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");
      }

      const resp = await fetch(wh.url, {
        method: "POST",
        headers,
        body: rawBody,
        signal: AbortSignal.timeout(10000),
      });

      statusCode = resp.status;
      responseBody = await resp.text().catch(() => "");

      if (resp.ok) {
        // Success — log and stop retrying
        await logDelivery(supabase, wh.id, caseId, orgId, attempt, "success", statusCode, responseBody, null, Date.now() - deliveryStart);
        return;
      }

      deliveryStatus = "failed";
      errorMessage = `HTTP ${resp.status} ${resp.statusText}`;
    } catch (err) {
      deliveryStatus = "failed";
      errorMessage = String(err);
    }

    const durationMs = Date.now() - deliveryStart;
    const isLastAttempt = attempt >= MAX_ATTEMPTS;
    const nextRetryAt = isLastAttempt
      ? null
      : new Date(Date.now() + BASE_DELAY_MS * Math.pow(2, attempt - 1)).toISOString();

    await logDelivery(
      supabase, wh.id, caseId, orgId, attempt,
      isLastAttempt ? "failed" : "retrying",
      statusCode, responseBody, errorMessage, durationMs, nextRetryAt,
    );

    if (!isLastAttempt) {
      // Exponential backoff: 2s, 4s
      await new Promise(r => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt - 1)));
    }
  }
}

async function logDelivery(
  supabase: SupabaseClient,
  webhookId: string,
  caseId: string,
  orgId: string,
  attempt: number,
  status: string,
  statusCode: number | null,
  responseBody: string,
  errorMessage: string | null,
  durationMs: number,
  nextRetryAt?: string | null,
) {
  try {
    await supabase.from("webhook_delivery_logs").insert({
      webhook_id: webhookId,
      case_id: caseId,
      organization_id: orgId,
      event: "case.ingested",
      status,
      status_code: statusCode,
      response_body: responseBody?.substring(0, 2000) || null,
      error_message: errorMessage,
      attempt,
      max_attempts: MAX_ATTEMPTS,
      duration_ms: durationMs,
      next_retry_at: nextRetryAt || null,
    });
  } catch (logErr) {
    console.error("Failed to log webhook delivery:", logErr);
  }
}
