begin;

alter table public.foods
  add column if not exists soluble_fiber_per_100g numeric(9,3),
  add column if not exists insoluble_fiber_per_100g numeric(9,3),
  add column if not exists sugar_alcohols_per_100g numeric(9,3),
  add column if not exists sugar_alcohol_type text,
  add column if not exists allulose_per_100g numeric(9,3),
  add column if not exists alcohol_per_100g numeric(9,3);

alter table public.meal_items
  add column if not exists food_confidence numeric(5,2),
  add column if not exists portion_confidence numeric(5,2),
  add column if not exists nutrition_match_confidence numeric(5,2);

alter table public.foods
  add constraint foods_detailed_carbs_nonnegative check (
    coalesce(soluble_fiber_per_100g, 0) >= 0 and
    coalesce(insoluble_fiber_per_100g, 0) >= 0 and
    coalesce(sugar_alcohols_per_100g, 0) >= 0 and
    coalesce(allulose_per_100g, 0) >= 0 and
    coalesce(alcohol_per_100g, 0) >= 0
  ),
  add constraint foods_sugar_alcohol_type_valid check (
    sugar_alcohol_type is null or sugar_alcohol_type in (
      'erythritol', 'mannitol', 'isomalt', 'lactitol', 'maltitol', 'xylitol',
      'sorbitol', 'hydrogenated_starch_hydrolysates', 'unknown'
    )
  );

comment on column public.foods.sugar_alcohol_type is
  'Only populated when the specific sugar alcohol is supported by reliable source data.';

alter table public.meal_items
  add constraint meal_items_confidences_valid check (
    (food_confidence is null or food_confidence between 0 and 100) and
    (portion_confidence is null or portion_confidence between 0 and 100) and
    (nutrition_match_confidence is null or nutrition_match_confidence between 0 and 100)
  );

commit;
