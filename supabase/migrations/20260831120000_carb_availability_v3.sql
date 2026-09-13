-- Persist the confidence-aware whole-meal carbohydrate availability model.
-- This is additive: existing meals and targets remain valid and are marked as
-- legacy until recalculated by a current app build.

alter table public.fuel_targets
  add column if not exists availability_model_version text not null default 'legacy';

alter table public.meals
  add column if not exists available_carbs_g numeric(9,2),
  add column if not exists carb_availability_confidence numeric(5,2);

alter table public.meals
  drop constraint if exists meal_availability_nonnegative;
alter table public.meals
  add constraint meal_availability_nonnegative check (
    available_carbs_g is null or available_carbs_g >= 0
  );

alter table public.meals
  drop constraint if exists meal_availability_confidence_range;
alter table public.meals
  add constraint meal_availability_confidence_range check (
    carb_availability_confidence is null or carb_availability_confidence between 0 and 100
  );

alter table public.meal_analyses
  add column if not exists provisional boolean not null default false;

alter table public.meal_analyses
  alter column model_version set default 'fuel-score-v3.0';

update public.carb_speed_tiers set
  display_name = 'Fast availability',
  short_description = 'Lower-burden carbohydrate likely to become available sooner in the context of the whole meal.',
  classification_rules = classification_rules || '{"model":"whole_meal_availability","not_a_glycemic_index_claim":true}'::jsonb,
  updated_at = now()
where id = 'fast';

update public.carb_speed_tiers set
  display_name = 'Medium availability',
  short_description = 'Carbohydrate with moderate food structure and expected availability in the context of the whole meal.',
  classification_rules = classification_rules || '{"model":"whole_meal_availability","not_a_glycemic_index_claim":true}'::jsonb,
  updated_at = now()
where id = 'medium';

update public.carb_speed_tiers set
  display_name = 'Slow availability',
  short_description = 'More structured carbohydrate or a higher digestion burden, generally better when more time is available.',
  classification_rules = classification_rules || '{"model":"whole_meal_availability","not_a_glycemic_index_claim":true}'::jsonb,
  updated_at = now()
where id = 'slow';

update public.carb_speed_tiers set
  short_description = 'The available evidence is not strong enough to estimate carbohydrate availability without guessing.',
  classification_rules = classification_rules || '{"model":"whole_meal_availability","requires_confirmation":true}'::jsonb,
  updated_at = now()
where id = 'unknown';
