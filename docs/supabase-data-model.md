# StrictlyFuel Supabase data model

## Nutrition catalog

- `food_sources` records provenance and attribution for Strictly, USDA FoodData Central, Open Food Facts, package labels, and camera estimates.
- `carb_speed_tiers` is the adjustable fast/medium/slow classification system. It stores user-facing descriptions, practical timing ranges, colors, and versionable rule JSON.
- `foods` stores normalized macros per 100 g, provenance, barcode, search data, classification confidence, and the reason for the practical digestion classification.
- `food_portions` stores serving labels and gram conversions separately from nutrition per 100 g.
- `food_aliases` improves search without duplicating foods.
- `dietary_tags` and `food_dietary_tags` model diets, allergens, preparation, and preferences.
- `food_search_cache` and `food_api_events` reduce provider calls and provide cost/quality observability.

Logged `meal_items` retain a complete nutrition snapshot. A later correction to the shared food catalog therefore does not silently rewrite a user’s meal history.

## Workout and meal loop

- `profiles` and `user_fuel_preferences`
- `workouts` -> one `fuel_targets`
- `meals` -> many `meal_items`
- `meals` -> one `meal_analyses` -> many `meal_fix_suggestions`
- `workout_fuel_feedback` links a user, workout, and meal for the future subjective outcome loop

All workout and meal records are owner-private by default. Publishing creates a separate `fuel_posts` row. The post’s visibility switches determine whether related workout context and ingredients can be read publicly.

## Community

- `fuel_posts` references a meal and optional workout without owning either record.
- `post_likes`, `saved_meals`, `meal_copies`, and `post_comments` record engagement.
- Database triggers maintain post counters. Copies count twice in the utility-oriented ranking index.
- `follows`, `blocked_users`, and `post_reports` provide the minimum social/privacy foundation.

## Food lookup flow

1. The app immediately returns matches from its bundled starter catalog.
2. The `search-foods` Edge Function checks the Supabase catalog.
3. A seven-day search cache is checked.
4. Open Food Facts and, when `USDA_FDC_API_KEY` is configured, USDA FoodData Central are queried.
5. Results are normalized to per-100 g macros and assigned a practical, confidence-labelled carbohydrate speed.
6. Normalized foods are saved so later searches reuse them without another provider call.

The external classification is intentionally an adjustable meal-planning estimate. It is not a direct measurement of gastric emptying or an overall health rating.

## Deployment

```sh
npx supabase login
npx supabase link --project-ref ggjztwwkqbtqnpqrzrye
npx supabase db push
npx supabase functions deploy search-foods
npx supabase secrets set USDA_FDC_API_KEY=your_data_gov_key
```

Enter credentials through the CLI or Supabase dashboard. Never commit the database password, OpenAI key, USDA key, or Supabase secret/service-role key.
