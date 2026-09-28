import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reply = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: cors });
const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (!new Set(["GET", "POST"]).has(request.method)) return reply({ error: "Method not allowed." }, 405);
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !url || !key) return reply({ error: "Not authorized." }, 401);
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  // app_metadata is set by an administrator and cannot be edited by a member.
  if (authError || auth.user?.app_metadata?.community_moderator !== true) return reply({ error: "Not authorized." }, 403);

  if (request.method === "GET") {
    const { data: posts, error } = await admin.from("fuel_posts")
      .select("id,author_username,caption,photo_path,moderation_status,created_at")
      .in("moderation_status", ["needs_review", "pending"])
      .is("deleted_at", null).order("created_at", { ascending: true }).limit(25);
    if (error) return reply({ error: "Review queue unavailable." }, 503);
    const queue = await Promise.all((posts || []).map(async (post) => {
      const signed = post.photo_path
        ? await admin.storage.from("community-review").createSignedUrl(post.photo_path, 600)
        : null;
      return { ...post, photo_url: signed?.data?.signedUrl || null };
    }));
    return reply({ queue });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "Invalid review request." }, 400); }
  if (!isUuid(body.postId) || (body.action !== "approve" && body.action !== "reject")) {
    return reply({ error: "Invalid review request." }, 400);
  }
  const { data: post, error: lookupError } = await admin.from("fuel_posts")
    .select("id,meal_id,photo_path,moderation_status")
    .eq("id", body.postId).in("moderation_status", ["needs_review", "pending"]).maybeSingle();
  if (lookupError || !post) return reply({ error: "This post is no longer waiting for review." }, 404);

  if (body.action === "reject") {
    const { data, error } = await admin.from("fuel_posts").update({
      moderation_status: "rejected", moderation_checked_at: new Date().toISOString(), photo_path: null,
    }).eq("id", post.id).eq("moderation_status", post.moderation_status).select("id").maybeSingle();
    if (error || !data) return reply({ error: "Review decision could not be saved." }, 409);
    if (post.photo_path) await admin.storage.from("community-review").remove([post.photo_path]);
    return reply({ status: "rejected", postId: post.id });
  }

  if (post.photo_path === null) {
    const { data: meal } = await admin.from("meals").select("image_path").eq("id", post.meal_id).maybeSingle();
    if (meal?.image_path) return reply({ error: "The original photo is unavailable for review. Reject this post instead." }, 400);
  }
  let publicPath: string | null = null;
  if (post.photo_path) {
    const approvedPath: string = post.photo_path;
    const { data: blob, error: downloadError } = await admin.storage.from("community-review").download(approvedPath);
    if (downloadError || !blob) return reply({ error: "The review photo is unavailable." }, 503);
    publicPath = approvedPath;
    const { error: uploadError } = await admin.storage.from("community-images").upload(approvedPath, blob, {
      contentType: "image/jpeg", upsert: false,
    });
    if (uploadError) return reply({ error: "The approved photo could not be saved." }, 503);
  }
  const { data, error } = await admin.from("fuel_posts").update({
    moderation_status: "approved", moderation_checked_at: new Date().toISOString(),
    is_public: true, published_at: new Date().toISOString(), photo_path: publicPath,
  }).eq("id", post.id).eq("moderation_status", post.moderation_status).select("id").maybeSingle();
  if (error || !data) {
    if (publicPath) await admin.storage.from("community-images").remove([publicPath]);
    return reply({ error: "Review decision could not be saved." }, 409);
  }
  if (post.photo_path) await admin.storage.from("community-review").remove([post.photo_path]);
  return reply({ status: "approved", postId: post.id });
}

if (Deno.env.get("COMMUNITY_MODERATION_TEST") !== "1") Deno.serve(handleRequest);
