import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Receives RevenueCat subscriber events and mirrors entitlement state into
 * `public.user_subscriptions`, which is what the server-side AI usage limits
 * read. Without this the backend has no idea who is Pro.
 *
 * Configure in RevenueCat → Integrations → Webhooks:
 *   URL:            https://<project>.functions.supabase.co/revenuecat-webhook
 *   Authorization:  the value of REVENUECAT_WEBHOOK_SECRET
 *
 * `verify_jwt` is false for this function (RevenueCat cannot send a Supabase
 * JWT), so the shared secret is the only thing standing in front of it.
 */
/**
 * Must match PRO_ENTITLEMENT in src/config/monetization.ts and the entitlement
 * identifier in RevenueCat → Product catalog → Entitlements. If these three
 * drift apart, purchases succeed on the device but nobody is ever marked Pro
 * on the server.
 */
const PRO_ENTITLEMENT = "strictlyfuel_pro";

/** Events that always mean "no longer entitled", regardless of expiry date. */
const REVOKING_EVENTS = new Set(["EXPIRATION", "SUBSCRIPTION_PAUSED", "REFUND"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!secret) return json({ error: "Webhook is not configured." }, 500);

  const provided = request.headers.get("Authorization") ?? "";
  // Constant-length compare is overkill here, but the check must be exact.
  if (provided !== secret && provided !== `Bearer ${secret}`) {
    return json({ error: "Unauthorized." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server is not configured." }, 500);

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const event = payload?.event;
  if (!event) return json({ error: "Missing event." }, 400);

  // We call Purchases.logIn(supabaseUserId), so app_user_id is the user's uuid.
  // Anonymous RevenueCat ids (purchases made before sign-in) are ignored.
  const appUserId = String(event.app_user_id ?? "");
  if (!isUuid(appUserId)) {
    console.log("Ignoring event for non-Supabase app_user_id", appUserId.slice(0, 40));
    return json({ ignored: true });
  }

  const expiresAtMs = Number(event.expiration_at_ms ?? 0);
  const expiresAt = expiresAtMs > 0 ? new Date(expiresAtMs).toISOString() : null;
  const entitlements: string[] = Array.isArray(event.entitlement_ids) ? event.entitlement_ids : [];
  const eventType = String(event.type ?? "");

  // A cancellation only stops auto-renew — access continues until expiry, so it
  // is deliberately not in REVOKING_EVENTS.
  const entitled =
    !REVOKING_EVENTS.has(eventType) &&
    (entitlements.length === 0 || entitlements.includes(PRO_ENTITLEMENT)) &&
    expiresAtMs > Date.now();

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { error } = await admin.from("user_subscriptions").upsert(
    {
      user_id: appUserId,
      is_pro: entitled,
      product_id: event.product_id ?? null,
      store: event.store ?? null,
      period_type: event.period_type ?? null,
      expires_at: expiresAt,
      original_app_user_id: event.original_app_user_id ?? null,
      last_event_at: new Date(Number(event.event_timestamp_ms ?? Date.now())).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("user_subscriptions upsert failed", error.message);
    // Non-2xx makes RevenueCat retry, which is what we want on a transient failure.
    return json({ error: error.message }, 500);
  }

  return json({ ok: true, userId: appUserId, isPro: entitled });
});
