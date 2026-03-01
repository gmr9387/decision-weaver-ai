import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

// We need an auth token to test run-inference
async function getAuthToken(): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email: "gmr9387@gmail.com", password: "Spanky87$" }),
  });
  if (!res.ok) { await res.text(); return null; }
  const data = await res.json();
  return data.access_token;
}

Deno.test("run-inference: rejects unauthenticated", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/run-inference`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ facts: { amount_requested: 1000 } }),
  });
  assertEquals(res.status, 401);
  await res.text();
});

Deno.test("run-inference: evaluates rules correctly", async () => {
  const token = await getAuthToken();
  if (!token) { console.log("Skipping: no auth token"); return; }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/run-inference`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      facts: { amount_requested: 50000, risk_score: 80, prior_authorization: false, document_count: 1 },
      mode: "instant",
      persist: false,
    }),
  });
  assertEquals(res.status, 200);
  const body = await res.json();

  assertExists(body.decision);
  assertExists(body.confidence);
  assertExists(body.firedRules);
  assert(Array.isArray(body.firedRules));
  assert(body.firedRules.length > 0);

  // High amount flag should fire
  const highAmountRule = body.firedRules.find((r: any) => r.name === "High Amount Flag");
  assertExists(highAmountRule);
  assertEquals(highAmountRule.fired, true);

  // High risk escalation should fire
  const riskRule = body.firedRules.find((r: any) => r.name === "High Risk Escalation");
  assertExists(riskRule);
  assertEquals(riskRule.fired, true);
});

Deno.test("run-inference: low-risk auto-approve", async () => {
  const token = await getAuthToken();
  if (!token) { console.log("Skipping: no auth token"); return; }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/run-inference`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      facts: { amount_requested: 2000, risk_score: 10, document_count: 5, prior_authorization: true },
      mode: "instant",
      persist: false,
    }),
  });
  assertEquals(res.status, 200);
  const body = await res.json();

  assertEquals(body.decision, "approve");
  const autoApprove = body.firedRules.find((r: any) => r.name === "Auto-Approve Low Risk");
  assertExists(autoApprove);
  assertEquals(autoApprove.fired, true);
});
