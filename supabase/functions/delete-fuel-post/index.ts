import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reply = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: cors });
const uuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

// Lets an author delete their own community post. Photos live in buckets only the publishing function can
// write to, so the service role removes them here; deleting just the row would leave an approved photo public.
export async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token) return reply({ error: "Sign in to delete a post." }, 401);
  if (!url || !serviceKey) return reply({ error: "Post deletion is not configured." }, 503);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return reply({ error: "Sign in to delete a post." }, 401);
  const userId = auth.user.id;

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "Invalid request." }, 400); }
  if (!uuid(body.postId)) return reply({ error: "Invalid post." }, 400);
  const postId = body.postId;

  const { data: post, error: lookupError } = await admin.from("fuel_posts")
    .select("id,user_id").eq("id", postId).maybeSingle();
  if (lookupError) return reply({ error: "The post could not be deleted right now." }, 503);
  // Already gone counts as deleted, so a retry after a dropped connection still succeeds.
  if (!post) return reply({ deleted: true, postId });
  if (post.user_id !== userId) return reply({ error: "You can only delete your own posts." }, 403);

  // Photos are always stored at <user>/<post>.jpg; removing a path that does not exist is harmless.
  const photoPath = `${userId}/${postId}.jpg`;
  const results = await Promise.all([
    admin.storage.from("community-images").remove([photoPath]),
    admin.storage.from("community-review").remove([photoPath]),
  ]);
  if (results.some((result) => result.error)) return reply({ error: "The post photo could not be removed. Try again." }, 503);

  const { error: deleteError } = await admin.from("fuel_posts").delete().eq("id", postId).eq("user_id", userId);
  if (deleteError) return reply({ error: "The post could not be deleted right now." }, 503);
  return reply({ deleted: true, postId });
}

if (Deno.env.get("DELETE_POST_TEST") !== "1") Deno.serve(handleRequest);
