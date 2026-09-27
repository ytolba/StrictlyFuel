import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Decision = "approved" | "needs_review" | "rejected";
const reply = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, { status, headers: cors });
const uuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function decodeJpeg(base64: unknown): Uint8Array | null {
  if (base64 == null) return null;
  if (typeof base64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > 7_000_000) {
    throw new Error("The meal photo is too large or invalid. Choose a smaller photo.");
  }
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  if (bytes.length > 5_242_880 || bytes.length < 100 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw new Error("Only JPEG meal photos under 5 MB can be shared.");
  }
  return bytes;
}

export function decideModeration(result: unknown): Decision {
  const results = (result as { results?: Array<{ flagged?: boolean; category_scores?: Record<string, number> }> })?.results;
  if (!Array.isArray(results) || !results.length) throw new Error("Incomplete moderation response");
  let uncertain = false;
  for (const item of results) {
    if (typeof item.flagged !== "boolean" || !item.category_scores || !Object.keys(item.category_scores).length) {
      throw new Error("Incomplete moderation result");
    }
    const scores = Object.values(item.category_scores);
    if (scores.some((score) => !Number.isFinite(score) || score < 0 || score > 1)) throw new Error("Invalid moderation scores");
    if (item.flagged) return "rejected";
    // Low but nonzero scores are not treated as proof of safety; queue for a person.
    if (scores.some((score) => score >= 0.1)) uncertain = true;
  }
  return uncertain ? "needs_review" : "approved";
}

async function moderate(apiKey: string, caption: string, username: string, photo: string | null): Promise<Decision> {
  const input: Array<Record<string, unknown>> = [
    { type: "text", text: `Community username: ${username}\nPost caption: ${caption || "(none)"}` },
  ];
  if (photo) input.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${photo}` } });
  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "omni-moderation-latest", input }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Moderation service returned ${response.status}`);
  return decideModeration(await response.json());
}

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  if (Number(request.headers.get("content-length") || 0) > 7_500_000) return reply({ error: "The photo is too large to review." }, 413);
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!token) return reply({ error: "Sign in to share a post." }, 401);
  if (!url || !serviceKey || !openAiKey) return reply({ error: "Community publishing is not configured." }, 503);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user || auth.user.is_anonymous) return reply({ error: "A signed-in account is required." }, 401);
  const userId = auth.user.id;

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "Invalid post." }, 400); }
  const { postId, mealId, workoutId } = body;
  const caption = typeof body.caption === "string" ? body.caption.trim() : "";
  if (!uuid(postId) || !uuid(mealId) || (workoutId != null && !uuid(workoutId)) || caption.length > 240) {
    return reply({ error: "Please check the post details and try again." }, 400);
  }

  let photo: Uint8Array | null;
  try { photo = decodeJpeg(body.imageBase64); }
  catch (error) { return reply({ error: (error as Error).message }, 400); }
  const photoBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : null;

  const { data: meal, error: mealError } = await admin.from("meals")
    .select("id,user_id,workout_id,image_path").eq("id", mealId).eq("user_id", userId).maybeSingle();
  if (mealError || !meal) return reply({ error: "Save this meal to your account before sharing it." }, 404);
  if (meal.image_path && !photo) return reply({ error: "The meal photo must be checked before it can be shared." }, 400);
  if (workoutId && meal.workout_id !== workoutId) return reply({ error: "The workout does not match this meal." }, 400);

  const { data: previous } = await admin.from("fuel_posts").select("id,moderation_status")
    .eq("user_id", userId).eq("meal_id", mealId).maybeSingle();
  if (previous?.moderation_status === "rejected") {
    const { error } = await admin.from("fuel_posts").delete().eq("id", previous.id).eq("user_id", userId);
    if (error) return reply({ error: "This post could not be resubmitted yet." }, 503);
  } else if (previous) {
    return reply({ error: "This meal has already been submitted to the community." }, 409);
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count, error: limitError } = await admin.from("community_moderation_attempts")
    .select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", oneHourAgo);
  if (limitError) return reply({ error: "Publishing is temporarily unavailable." }, 503);
  if ((count || 0) >= 10) return reply({ error: "You have reached the hourly sharing limit. Try again later." }, 429);
  const { error: attemptError } = await admin.from("community_moderation_attempts").insert({ user_id: userId });
  if (attemptError) return reply({ error: "Publishing is temporarily unavailable." }, 503);

  const { data: profile } = await admin.from("profiles").select("username").eq("id", userId).maybeSingle();
  const username = typeof profile?.username === "string" && profile.username ? profile.username : "athlete";
  const reviewPath = photo ? `${userId}/${postId}.jpg` : null;
  if (reviewPath && photo) {
    const { error } = await admin.storage.from("community-review").upload(reviewPath, photo, { contentType: "image/jpeg", upsert: false });
    if (error) return reply({ error: "The photo could not be submitted for review." }, 503);
  }

  const { error: insertError } = await admin.from("fuel_posts").insert({
    id: postId, user_id: userId, meal_id: mealId, workout_id: workoutId || null,
    author_username: username, caption, show_workout: body.showWorkout === true,
    show_macros: body.showMacros === true, show_ingredients: body.showIngredients === true,
    is_public: false, moderation_status: "pending", photo_path: reviewPath,
  });
  if (insertError) {
    if (reviewPath) await admin.storage.from("community-review").remove([reviewPath]);
    return reply({ error: "This meal could not be submitted. Please try again." }, 409);
  }

  try {
    const decision = await moderate(openAiKey, caption, username, photoBase64);
    if (decision === "approved") {
      let publicPath: string | null = null;
      if (photo) {
        publicPath = `${userId}/${postId}.jpg`;
        const { error } = await admin.storage.from("community-images").upload(publicPath, photo, { contentType: "image/jpeg", upsert: false });
        if (error) throw new Error("Approved photo upload failed");
      }
      const { error } = await admin.from("fuel_posts").update({
        moderation_status: "approved", moderation_checked_at: new Date().toISOString(),
        is_public: true, published_at: new Date().toISOString(), photo_path: publicPath,
      }).eq("id", postId).eq("user_id", userId).eq("moderation_status", "pending");
      if (error) throw new Error("Approved post update failed");
      if (reviewPath) await admin.storage.from("community-review").remove([reviewPath]);
      return reply({ status: "approved", postId });
    }

    const { error } = await admin.from("fuel_posts").update({
      moderation_status: decision, moderation_checked_at: new Date().toISOString(),
      photo_path: decision === "needs_review" ? reviewPath : null,
    }).eq("id", postId).eq("user_id", userId).eq("moderation_status", "pending");
    if (error) throw new Error("Moderation decision could not be saved");
    if (decision === "rejected" && reviewPath) await admin.storage.from("community-review").remove([reviewPath]);
    return reply({ status: decision, postId });
  } catch (error) {
    console.error("Community moderation failed", error instanceof Error ? error.message : error);
    // Never publish when the provider or storage fails; leave the private photo for manual review.
    await admin.from("fuel_posts").update({ moderation_status: "needs_review" })
      .eq("id", postId).eq("user_id", userId).eq("moderation_status", "pending");
    return reply({ status: "needs_review", postId });
  }
}

if (Deno.env.get("COMMUNITY_MODERATION_TEST") !== "1") Deno.serve(handleRequest);
