import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Receives RevenueCat subscriber events and mirrors entitlement state into
 * `public.user_subscriptions`, which is what the server-side AI usage limits
 * read. Without this the backend has no idea who is Pro.
 *
 * Configure in RevenueCat → Integrations → Webhooks:
 *   URL:            https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
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
const IGNORED_EVENTS = new Set(["TEST", "TRANSFER"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const encoder = new TextEncoder();
const safeTimestamp = (value: unknown) => {
  const ms = Number(value);
  return Number.isFinite(ms) && ms > 0 ? new Date(ms) : new Date();
};
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const constantTimeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
};
async function validSignature(header: string, body: string, secret: string) {
  const timestamp = header.split(",").find((part) => part.startsWith("t="))?.slice(2);
  const received = header.split(",").find((part) => part.startsWith("v1="))?.slice(3);
  if (!timestamp || !received) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`)));
  return constantTimeEqual(received.toLowerCase(), expected);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!secret) return json({ error: "Webhook is not configured." }, 500);

  const rawBody = await request.text();
  const provided = request.headers.get("Authorization") ?? "";
  const signatureSecret = Deno.env.get("REVENUECAT_WEBHOOK_SIGNATURE_SECRET") ?? "";
  const signature = request.headers.get("X-RevenueCat-Webhook-Signature") ?? "";
  const authorized = constantTimeEqual(provided, secret) || constantTimeEqual(provided, `Bearer ${secret}`) || Boolean(signatureSecret && await validSignature(signature, rawBody, signatureSecret));
  if (!authorized) {
    console.error("revenuecat_webhook unauthorized", { hasAuthorization: Boolean(provided), hasSignature: Boolean(signature) });
    return json({ error: "Unauthorized." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server is not configured." }, 500);

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const event = payload?.event;
  if (!event) return json({ error: "Missing event." }, 400);
  const eventId = String(event.id ?? "");
  const eventType = String(event.type ?? "UNKNOWN");
  if (!eventId) return json({ ignored: true, reason: "missing_event_id" });

  // We call Purchases.logIn(supabaseUserId), so app_user_id is the user's uuid.
  // Anonymous RevenueCat ids (purchases made before sign-in) are ignored.
  const appUserId = String(event.app_user_id ?? "");
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: delivery, error: deliveryError } = await admin.from("revenuecat_webhook_events").upsert(
    { event_id: eventId, event_type: eventType, app_user_id: appUserId || null, event_timestamp: safeTimestamp(event.event_timestamp_ms).toISOString(), status: "received" },
    { onConflict: "event_id", ignoreDuplicates: true }
  ).select("event_id,status").maybeSingle();
  if (deliveryError) {
    console.error("revenuecat delivery insert failed", { eventId, code: deliveryError.code, message: deliveryError.message });
    return json({ error: "delivery_log_failed" }, 500);
  }
  if (!delivery) return json({ ok: true, duplicate: true, eventId });

  if (IGNORED_EVENTS.has(eventType)) {
    await admin.from("revenuecat_webhook_events").update({ status: "ignored", processed_at: new Date().toISOString() }).eq("event_id", eventId);
    return json({ ok: true, ignored: eventType, eventId });
  }
  if (!isUuid(appUserId)) {
    console.log("Ignoring event for non-Supabase app_user_id", { eventId, eventType, appUserId: appUserId.slice(0, 40) });
    await admin.from("revenuecat_webhook_events").update({ status: "ignored", error_code: "non_uuid_user", processed_at: new Date().toISOString() }).eq("event_id", eventId);
    return json({ ok: true, ignored: true, eventId });
  }

  const expiresAtMs = Number(event.expiration_at_ms ?? 0);
  const expiresAt = expiresAtMs > 0 ? new Date(expiresAtMs).toISOString() : null;
  const entitlements: string[] = Array.isArray(event.entitlement_ids) ? event.entitlement_ids : [];
  const eventDate = safeTimestamp(event.event_timestamp_ms);

  // A cancellation only stops auto-renew — access continues until expiry, so it
  // is deliberately not in REVOKING_EVENTS.
  const entitled =
    !REVOKING_EVENTS.has(eventType) &&
    (entitlements.length === 0 || entitlements.includes(PRO_ENTITLEMENT)) &&
    expiresAtMs > Date.now();

  const { data: current } = await admin.from("user_subscriptions").select("last_event_at").eq("user_id", appUserId).maybeSingle();
  if (current?.last_event_at && new Date(current.last_event_at).getTime() > eventDate.getTime()) {
    await admin.from("revenuecat_webhook_events").update({ status: "ignored", error_code: "older_than_current_state", processed_at: new Date().toISOString() }).eq("event_id", eventId);
    return json({ ok: true, ignored: "out_of_order", eventId });
  }
  const { error } = await admin.from("user_subscriptions").upsert(
    {
      user_id: appUserId,
      is_pro: entitled,
      product_id: event.product_id ?? null,
      store: event.store ?? null,
      period_type: event.period_type ?? null,
      expires_at: expiresAt,
      original_app_user_id: event.original_app_user_id ?? null,
      last_event_at: eventDate.toISOString(),
      last_event_id: eventId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("user_subscriptions upsert failed", { eventId, eventType, code: error.code, message: error.message });
    await admin.from("revenuecat_webhook_events").update({ status: "failed", error_code: error.code || "subscription_upsert_failed", processed_at: new Date().toISOString() }).eq("event_id", eventId);
    // Non-2xx makes RevenueCat retry, which is what we want on a transient failure.
    return json({ error: error.message }, 500);
  }

  await admin.from("revenuecat_webhook_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("event_id", eventId);

  return json({ ok: true, eventId, userId: appUserId, isPro: entitled });
});
