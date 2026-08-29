import { FunctionsHttpError } from "@supabase/supabase-js";

/**
 * Thrown when the server refuses an AI call because the caller has spent their
 * weekly allowance. Carries enough detail for the UI to show an accurate
 * upgrade prompt without guessing.
 */
export class AiLimitError extends Error {
  readonly used: number;
  readonly limit: number;
  readonly isPro: boolean;

  constructor(message: string, used: number, limit: number, isPro: boolean) {
    super(message);
    this.name = "AiLimitError";
    this.used = used;
    this.limit = limit;
    this.isPro = isPro;
  }
}

export const isAiLimitError = (error: unknown): error is AiLimitError => error instanceof AiLimitError;

/**
 * `functions.invoke` surfaces a non-2xx response as a FunctionsHttpError with
 * `data` set to null, so the JSON body has to be read off the error context.
 * Without this, a 429 shows up as the useless "Edge Function returned a
 * non-2xx status code".
 */
export async function throwFunctionError(error: unknown, data: any, fallback: string): Promise<never> {
  if (error instanceof FunctionsHttpError) {
    let body: any = null;
    try {
      body = await error.context.json();
    } catch {
      // Body was not JSON; fall through to the generic message.
    }
    if (body?.code === "weekly_limit_reached") {
      throw new AiLimitError(
        body.error || "You've reached this week's limit.",
        Number(body.used) || 0,
        Number(body.limit) || 0,
        Boolean(body.isPro)
      );
    }
    if (typeof body?.error === "string") throw new Error(body.error);
  }

  const detail = typeof data?.error === "string" ? data.error : error instanceof Error ? error.message : "";
  throw new Error(detail || fallback);
}
