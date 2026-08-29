# StrictlyFuel

StrictlyFuel is the athlete-focused sister app to Strictly. It is an Expo / React Native app on a native iOS build, with Supabase as the single backend: authentication, database, storage and edge functions.

## Core flow

- **Fuel dashboard:** daily calorie and macro targets, active meal, and quick-add search.
- **Barcode and food lookup:** the existing Scan flow remains available from the barcode action and can be connected to nutrition data through the shared product service.
- **Meal builder:** foods can be added to a meal and totals are calculated for calories, carbohydrates, protein, and fat.
- **AI meal estimate:** a Supabase edge function runs one vision call that identifies visible foods and estimates cooked portions. Nutrition lookup, macro totals, ranges and consistency checks all happen in code — the model is never asked to do arithmetic.
- **Human confirmation:** estimates are never silently logged. Athletes can answer the highest-value portion question, rerun the estimate with that context, and then confirm the meal.

## Run locally

Install dependencies, copy `.env.example` to `.env`, configure the Supabase and RevenueCat values, then run `npm start`.

The repository is intentionally independent from Strictly but shares its data and service boundaries so the two products can use the same Supabase project later.

## AI secret and deployment

The OpenAI key belongs in Supabase edge function secrets, not in the shipped app:

`supabase secrets set OPENAI_API_KEY=...`

Then deploy with `supabase functions deploy analyze-meal`. Model routing lives in `supabase/functions/_shared/ai.ts`; both vision features default to `gpt-5.6-luna` and can be overridden server-side with `OPENAI_MEAL_MODEL` / `OPENAI_LABEL_MODEL`.

Run deterministic checks with `npm test` inside `functions`. An optional live fixture runner is available at `functions/test/liveMealAnalysis.js` and requires a local `.env` key.
