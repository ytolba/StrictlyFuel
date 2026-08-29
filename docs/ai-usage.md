# AI usage in StrictlyFuel

## The rule

A model is used only where the answer is genuinely probabilistic. Everything
that can be computed, queried, filtered or ranked is done in code. Two features
qualify; nothing else in the app makes a model call.

## Feature map

| Feature | Model | Input | Output | Frequency | Is AI required? |
| --- | --- | --- | --- | --- | --- |
| Meal photo scan (`analyze-meal`) | `gpt-5.6-luna` | 1 image at `detail: high` + ~40 tokens of workout context | ~8 short fields per food, ≤16 foods | Once per scan; refine is opt-in and costs a scan | **Yes.** Recognising foods on a plate and judging portion size is not derivable from structured data. |
| Label photo scan (`analyze-food-label`) | `gpt-5.6-luna` | 1 image at `detail: high` + ~30 tokens | ~20 short fields | Once per contributed product | **Yes.** Reading printed nutrition panels off a package is OCR plus interpretation. |

Everything below runs with **zero tokens**:

| Feature | How it works instead |
| --- | --- |
| Recommended meals | `meal_templates` in Supabase → `rankMealTemplates()` filtering and scoring |
| Improve my fuel | `suggestMealFixes()` — existing food first, then complementary food |
| Fuel targets | `calculateFuelTarget()` arithmetic |
| Macro totals, carb gaps, portion scaling | `nutritionEngine` / `mealScaling` |
| Meal scoring and health bands | `mealScore` / `healthScore` |
| Food search and barcode lookup | `search-foods` — Supabase catalog, then USDA / Open Food Facts, cached in `foods` |
| Carb-speed classification | Rule-based `classify()` in `search-foods` |

## Model routing

Routing lives in `supabase/functions/_shared/ai.ts`.

- **No model** — anything deterministic. This is the default and covers most of
  the app.
- **Cheapest current-generation vision model** — both scan features. A smaller
  previous-generation model costs marginally less per token but reads portions
  and small print worse, and a wrong gram estimate costs more in corrections
  than it saves.
- **Stronger model** — not used. Introduce one only with evidence that the
  cheaper model is unreliable for a specific task.

Override per feature with `OPENAI_MEAL_MODEL` / `OPENAI_LABEL_MODEL` to trial a
different model without a redeploy.

## What is sent

Only what the task needs: one image and a short context string. No user
profile, no history, no meal database, no full objects.

Output is limited to fields a screen actually renders. `visualEvidence`,
`preparation`, `assumptions` and `warnings` were previously required by the
schema and displayed nowhere; on a six-item plate they were the largest part of
the response, and they are gone.

## Repeat-call protection

- `visionInFlight` refs guard both scan entry points, so a double tap cannot
  spend two credits.
- Editing a portion recalculates macros in code; it never re-runs vision.
- Re-opening a saved scan reads the stored meal; it never re-runs vision.
- Refine is an explicit, labelled action that re-reads the photo with the user's
  correction, and says up front that it costs a scan.
- `callVision` retries once, and only on 5xx / 429 / timeout. A 4xx is never
  retried — it would re-upload the image to fail identically.

## Observability

Every call writes one row to `public.ai_usage_events`: feature, model, input and
output tokens, cached and reasoning tokens, latency, success, whether it
retried, and a short error code. No prompts, images, model output or nutrition
content are recorded.

```sql
-- Which feature is consuming the most AI?
select feature, sum(total_tokens) as tokens, count(*) as calls
from public.ai_usage_daily
where day >= current_date - 30
group by feature order by tokens desc;
```

The table is service-role only — no RLS policy grants client access. `user_id`
is `on delete set null`, so spend history survives an account deletion while
ceasing to be attributable to a person.

## Failure behaviour

Only the two scan features degrade when the provider is down. Recommendations,
fuel targets, meal building, scoring and saved scans have no AI dependency to
lose and keep working offline.
