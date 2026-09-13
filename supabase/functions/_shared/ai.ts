import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Model routing and cost accounting for every AI call StrictlyFuel makes.
 *
 * ── Routing policy ────────────────────────────────────────────────────────
 * Most of this app does NOT appear here, and that is the point. Recommended
 * meals, fuel targets, macro totals, carb gaps, meal scoring and "Improve my
 * fuel" are all deterministic code over structured data — no model, no tokens,
 * no variance. Only the two genuinely probabilistic tasks reach a model:
 * turning a photograph into a list of foods, and turning a photograph of a
 * package into nutrition fields.
 *
 * Both are vision tasks, and both run on the cheapest current-generation
 * vision model. A smaller previous-generation model is nominally cheaper per
 * token but reads portions and small label print noticeably worse, and a wrong
 * gram estimate costs more in corrections than it saves in tokens.
 *
 * Override per feature with OPENAI_MEAL_MODEL / OPENAI_LABEL_MODEL to A/B a
 * cheaper model without a redeploy.
 */
export const AI_MODELS = {
  // Meal portions are the most error-sensitive vision task in the product.
  // Use the balanced frontier model by default; Luna remains available as an
  // environment override for controlled cost/accuracy experiments.
  meal_vision: Deno.env.get("OPENAI_MEAL_MODEL") || "gpt-5.6-terra",
  label_vision: Deno.env.get("OPENAI_LABEL_MODEL") || "gpt-5.6-luna",
} as const;

export type AiFeature = keyof typeof AI_MODELS;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type UsageRecord = {
  feature: AiFeature;
  model: string;
  userId: string | null;
  latencyMs: number;
  success: boolean;
  retried: boolean;
  errorCode?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
    output_tokens_details?: { reasoning_tokens?: number };
  };
};

/**
 * Write one meter reading to public.ai_usage_events.
 *
 * Never throws and never blocks the response: if accounting fails, the user
 * still gets their scan. Records counts only — no prompt, no image, no output,
 * and only a short machine error code.
 */
export async function recordAiUsage(record: UsageRecord): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const usage = record.usage || {};
    await admin.from("ai_usage_events").insert({
      user_id: record.userId,
      feature: record.feature,
      model: record.model,
      input_tokens: Math.max(0, Number(usage.input_tokens) || 0),
      output_tokens: Math.max(0, Number(usage.output_tokens) || 0),
      total_tokens: Math.max(0, Number(usage.total_tokens) || 0),
      cached_input_tokens: Math.max(0, Number(usage.input_tokens_details?.cached_tokens) || 0),
      reasoning_tokens: Math.max(0, Number(usage.output_tokens_details?.reasoning_tokens) || 0),
      latency_ms: Math.max(0, Math.round(record.latencyMs)),
      success: record.success,
      retried: record.retried,
      error_code: record.errorCode?.slice(0, 40) ?? null,
    });
  } catch (error) {
    console.error("ai usage accounting failed", error instanceof Error ? error.message : error);
  }
}

/** Resolve the caller's id from their JWT, for attributing spend. Null if absent. */
export async function callerId(request: Request): Promise<string | null> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!url || !key || !token) return null;
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await admin.auth.getUser(token);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export type VisionResult =
  | { ok: true; text: string; model: string; retried: boolean }
  | { ok: false; status: number; errorCode: string; model: string; retried: boolean };

/**
 * One structured vision call, with accounting and a single retry.
 *
 * The retry covers exactly one case — a 5xx or a timeout, which are transient
 * on the provider side. A 4xx (bad image, bad schema, no credit) is never
 * retried: it would cost a second full image upload to fail the same way.
 */
export async function callVision(options: {
  feature: AiFeature;
  request: Request;
  userId: string | null;
  apiKey: string;
  instructions: string;
  userText: string;
  imageBase64?: string;
  imagesBase64?: string[];
  schemaName: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
  timeoutMs?: number;
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
}): Promise<VisionResult> {
  const model = AI_MODELS[options.feature];
  const startedAt = Date.now();
  let retried = false;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const images = (options.imagesBase64?.length ? options.imagesBase64 : [options.imageBase64 || ""]).filter(Boolean).slice(0, 3);
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          store: false,
          reasoning: { effort: options.reasoningEffort || "low" },
          max_output_tokens: options.maxOutputTokens,
          instructions: options.instructions,
          input: [{
            role: "user",
            content: [
              { type: "input_text", text: options.userText },
              // Portion and small-print reading both depend on detail. Multiple
              // meal angles share one request so the model can reconcile count,
              // height, occlusion and spread thickness before answering.
              ...images.map((imageBase64) => ({ type: "input_image", image_url: `data:image/jpeg;base64,${imageBase64}`, detail: "high" })),
            ],
          }],
          text: { format: { type: "json_schema", name: options.schemaName, strict: true, schema: options.schema } },
        }),
        signal: AbortSignal.timeout(options.timeoutMs ?? 55_000),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(`${options.feature} ${response.status}`, body.slice(0, 400));
        const transient = response.status >= 500 || response.status === 429;
        if (transient && attempt === 0) { retried = true; continue; }
        await recordAiUsage({
          feature: options.feature, model, userId: options.userId,
          latencyMs: Date.now() - startedAt, success: false, retried,
          errorCode: `http_${response.status}`,
        });
        return { ok: false, status: response.status, errorCode: `http_${response.status}`, model, retried };
      }

      const payload = await response.json();
      const text = payload.output_text
        || payload.output?.flatMap((item: any) => item.content || [])
             .find((part: any) => part.type === "output_text")?.text;

      await recordAiUsage({
        feature: options.feature, model, userId: options.userId,
        latencyMs: Date.now() - startedAt, success: Boolean(text), retried,
        errorCode: text ? undefined : "no_output", usage: payload.usage,
      });

      if (!text) return { ok: false, status: 502, errorCode: "no_output", model, retried };
      return { ok: true, text, model, retried };
    } catch (error) {
      const timedOut = error instanceof Error && /timeout|abort/i.test(error.message);
      if (attempt === 0) { retried = true; continue; }
      await recordAiUsage({
        feature: options.feature, model, userId: options.userId,
        latencyMs: Date.now() - startedAt, success: false, retried,
        errorCode: timedOut ? "timeout" : "network",
      });
      return { ok: false, status: 504, errorCode: timedOut ? "timeout" : "network", model, retried };
    }
  }

  return { ok: false, status: 502, errorCode: "exhausted", model, retried };
}
