import { createClient } from "jsr:@supabase/supabase-js@2";

// Keep this name distinct from the vision helper's CORS export. That makes
// the function safe to bundle as a single file in dashboard deployments too.
export const creditCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export type CreditResult = {
  allowed: boolean;
  used: number;
  weekly_limit: number;
  is_pro: boolean;
};

/**
 * Consumes one weekly AI credit for the caller.
 *
 * Runs as the *user*, not the service role, so `auth.uid()` inside
 * `consume_ai_credit` resolves to whoever holds the JWT — a caller cannot spend
 * someone else's allowance, and cannot spend their own twice concurrently
 * (the function takes a per-user advisory lock).
 *
 * Returns null when the check could not run at all; callers decide whether to
 * fail open or closed for that case.
 */
export async function consumeAiCredit(
  request: Request,
  feature: "scan" | "reshuffle"
): Promise<CreditResult | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = request.headers.get("Authorization") ?? "";
  if (!supabaseUrl || !anonKey || !authHeader) return null;

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data, error } = await client.rpc("consume_ai_credit", { p_feature: feature });
  if (error) {
    console.error("consume_ai_credit failed", error.message);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return row as CreditResult;
}

/**
 * Gives back the credit this request just spent, for a scan that returned nothing usable
 * (provider outage, timeout, cut-off or unreadable reply). Removes only the newest matching
 * row from the last few minutes, so it can never refund more than was charged.
 */
export async function refundAiCredit(userId: string | null, feature: "scan" | "reshuffle") {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key || !userId) return;
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data } = await admin.from("ai_usage_events").select("id")
      .eq("user_id", userId).eq("feature", feature).gte("created_at", since)
      .order("created_at", { ascending: false }).limit(1);
    const id = data?.[0]?.id;
    if (id != null) await admin.from("ai_usage_events").delete().eq("id", id);
  } catch (error) {
    console.error("ai credit refund failed", error instanceof Error ? error.message : error);
  }
}

/** 429 body shaped so the app can show an accurate paywall prompt. */
export function limitReachedResponse(result: CreditResult) {
  return Response.json(
    {
      error: result.is_pro
        ? `You've reached this week's limit of ${result.weekly_limit} meal scans. It resets Monday.`
        : `You've used all ${result.weekly_limit} free meal scans this week. They reset Monday, or upgrade for more.`,
      code: "weekly_limit_reached",
      used: result.used,
      limit: result.weekly_limit,
      isPro: result.is_pro,
    },
    { status: 429, headers: creditCorsHeaders }
  );
}
