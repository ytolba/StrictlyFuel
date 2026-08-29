import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";

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

    // A worker boot/relay failure often has no JSON body. Keep that platform
    // detail out of the UI and give the user a retryable message instead.
    if (error.context?.status === 401) throw new Error("Sign in before scanning a meal so Strictly can verify your scan allowance.");
    if (error.context?.status === 404) throw new Error("The meal scanner is not deployed yet. Please update the app or try again shortly.");
    if (error.context?.status >= 500) throw new Error("The meal scanner is restarting. Please try the photo again in a moment.");
  }

  if (error instanceof FunctionsRelayError) {
    throw new Error("The meal scanner is temporarily unavailable. Please try again in a moment.");
  }

  if (error instanceof FunctionsFetchError) {
    throw new Error("We couldn’t reach the meal scanner. Check your connection and try again.");
  }

  const detail = typeof data?.error === "string" ? data.error : error instanceof Error ? error.message : "";
  throw new Error(detail || fallback);
}
