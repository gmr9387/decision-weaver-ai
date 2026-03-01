import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function authenticateApiKey(
  supabase: SupabaseClient,
  apiKey: string | null,
): Promise<{ orgId: string; orgName: string } | { error: string; status: number }> {
  if (!apiKey || !apiKey.startsWith("ic_")) {
    return { error: "Missing or invalid API key. Pass via x-api-key header.", status: 401 };
  }

  const { data: orgs, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name, settings")
    .filter("settings->api_key", "eq", `"${apiKey}"`);

  if (orgErr || !orgs || orgs.length === 0) {
    return { error: "Invalid API key", status: 403 };
  }

  return { orgId: orgs[0].id, orgName: orgs[0].name };
}
