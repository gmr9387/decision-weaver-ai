import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const API_KEY = "ic_8953d2feff6b0b3509e24f213f5e9f81fd87f9989fd98771";

Deno.test("ingest-case: rejects missing API key", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ingest-case`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ category: "Test" }),
  });
  assertEquals(res.status, 401);
  const body = await res.json();
  assertEquals(body.error, "Missing or invalid API key. Pass via x-api-key header.");
});

Deno.test("ingest-case: rejects invalid API key", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ingest-case`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, "x-api-key": "ic_invalid" },
    body: JSON.stringify({ category: "Test" }),
  });
  assertEquals(res.status, 403);
  const body = await res.json();
  assertEquals(body.error, "Invalid API key");
});

Deno.test("ingest-case: rejects invalid severity", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ingest-case`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, "x-api-key": API_KEY },
    body: JSON.stringify({ severity: "extreme" }),
  });
  assertEquals(res.status, 400);
  const body = await res.json();
  assertExists(body.error);
});

Deno.test("ingest-case: creates case successfully", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ingest-case`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, "x-api-key": API_KEY },
    body: JSON.stringify({
      category: "Test",
      severity: "low",
      description: "Automated test case",
      facts: { test_key: "test_value" },
    }),
  });
  assertEquals(res.status, 201);
  const body = await res.json();
  assertEquals(body.success, true);
  assertExists(body.case.id);
  assertExists(body.case.case_number);
  assertEquals(body.case.severity, "low");
  assertEquals(body.case.facts_count, 1);
});

Deno.test("ingest-case: returns rate limit headers", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ingest-case`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, "x-api-key": API_KEY },
    body: JSON.stringify({ category: "Rate Limit Test", severity: "low" }),
  });
  const body = await res.text();
  assertExists(res.headers.get("x-ratelimit-limit"));
  assertExists(res.headers.get("x-ratelimit-remaining"));
});
