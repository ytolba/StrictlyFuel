import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Permanently deletes the calling user's account and all data owned by them.
 *
 * App Store guideline 5.1.1(v) requires any app that lets you create an account
 * to let you delete it from inside the app — pointing people at support email
 * is not accepted. Every strictlyfuel table references auth.users(id) with
 * `on delete cascade`, so removing the auth user removes their rows too.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server is not configured for account deletion." }, 500);

  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Not signed in." }, 401);

  // Resolve the caller from their own JWT — never trust a user id in the body.
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Could not verify your session." }, 401);

  const userId = userData.user.id;

  // Storage objects are not covered by the database cascade.
  try {
    const { data: files } = await admin.storage.from("meal-photos").list(userId, { limit: 1000 });
    if (files?.length) {
      await admin.storage.from("meal-photos").remove(files.map((file) => `${userId}/${file.name}`));
    }
  } catch {
    // A missing bucket must not block deleting the account itself.
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: deleteError.message }, 500);

  return json({ deleted: true });
});
