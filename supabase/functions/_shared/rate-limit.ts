import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const RATE_LIMIT_WINDOW_MINUTES = 1;
const RATE_LIMIT_MAX_REQUESTS = 30;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  headers: Record<string, string>;
  retryAfter?: number;
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  orgId: string,
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("api_request_logs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("created_at", windowStart);

  const current = recentCount || 0;

  if (current >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = RATE_LIMIT_WINDOW_MINUTES * 60;
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": new Date(Date.now() + retryAfter * 1000).toISOString(),
      },
    };
  }

  const remaining = RATE_LIMIT_MAX_REQUESTS - current - 1;
  return {
    allowed: true,
    remaining,
    headers: {
      "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
      "X-RateLimit-Remaining": String(Math.max(0, remaining)),
      "X-RateLimit-Reset": new Date(Date.now() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString(),
    },
  };
}
