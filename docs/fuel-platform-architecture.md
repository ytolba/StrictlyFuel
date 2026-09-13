> **Superseded.** This document describes the retired Firebase/Firestore design. Supabase is now the only backend; see docs/supabase-data-model.md.

# StrictlyFuel P0 architecture

## Product loop

`Workout -> Fuel Target -> Build or scan meal -> Strictly Score -> Fix -> Log -> Share -> Discover -> Copy`

The workout and private meal log are independent from a community post. Logging never publishes automatically.

## Deterministic domain services

- `fuelCalculator.ts` creates the pre-workout range, working target, practical fast/medium/slow split, and intra-workout range.
- `nutritionEngine.ts` computes macros from confirmed database or label values and food quantities.
- `mealScore.ts` scores only the meal's suitability for the associated workout and timing window. It is not a health score.
- `mealScaling.ts` adapts carb-source portions in a copied meal to the current user's target.

These services do not call an AI model, so identical inputs produce identical outputs and do not add inference cost.

## AI boundary

The Supabase `analyze-meal` Edge Function receives one or two views of the same plate. It identifies visible foods, preserves preparation state, counts discrete foods, and returns item-level portion intervals and confidence. It does not calculate final macros. The app resolves each item against the food catalog and performs the nutrition arithmetic in deterministic code.

Amounts that cannot be measured reliably from appearance, especially spreads, syrups, oils, dry toppings, and hidden components, are flagged for an optional athlete check. The athlete can answer, edit the amount directly, or continue with StrictlyFuel's best visual estimate. If they skip the check, the original lower confidence and wider macro range remain attached to the meal and a Fuel Score can still be issued.

The mobile app never contains the OpenAI API key. The Edge Function reads `OPENAI_API_KEY` from Supabase secrets.

## Firestore collections

- `users/{userId}`: account/profile data.
- `users/{userId}/savedMeals/{postId}`: private bookmarks.
- `workouts/{workoutId}`: private workout plus computed Fuel Target.
- `meals/{mealId}`: private meal, embedded ingredient snapshots, macros, score, source, and confidence.
- `fuelPosts/{postId}`: explicitly published snapshot referencing its workout and meal context.

Ingredient snapshots are embedded in a meal so historical nutrition does not silently change when the catalog is updated. Meals and workouts remain private owner documents. Public reads apply only to explicitly published `fuelPosts`.

## Data sources

- Generic foods: curated starter values based on USDA FoodData Central.
- Branded foods: package label should win; Open Food Facts can supply label data with source attribution and an accuracy warning.
- Meal photos: visibly marked estimates with editable portions and confidence ranges.

## Next backend migrations

1. Deploy the included Firestore rules and indexes after reviewing them against any legacy collections in the shared Firebase project.
2. Move community counters to transaction-backed engagement subcollections or Cloud Functions before production scale.
3. Add server-side post validation/moderation and report/block collections before opening public posting broadly.
4. Add a USDA proxy/cache before live generic-food search so the data.gov key remains server-side.
