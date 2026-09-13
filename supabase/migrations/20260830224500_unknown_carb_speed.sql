-- Preserve uncertainty instead of silently assigning incomplete food records to
-- medium digestion speed. This makes the client and catalog fail closed.
alter table public.carb_speed_tiers
  drop constraint if exists carb_speed_tiers_id_check;

alter table public.carb_speed_tiers
  add constraint carb_speed_tiers_id_check
  check (id in ('fast', 'medium', 'slow', 'unknown'));

insert into public.carb_speed_tiers (
  id, rank, display_name, color_hex, short_description,
  practical_timing_min_minutes, practical_timing_max_minutes, classification_rules
) values (
  'unknown', 4, 'Unclassified', '#A8AAA3',
  'Available product evidence is not strong enough to assign a practical digestion speed.',
  0, null, '{"requires_user_confirmation":true,"never_use_as_default":true}'::jsonb
)
on conflict (id) do update set
  short_description = excluded.short_description,
  classification_rules = excluded.classification_rules,
  updated_at = now();

alter table public.foods alter column carb_speed_tier_id set default 'unknown';

-- Repair high-confidence cases cached under the former fat/fiber-first rule.
update public.foods set
  carb_speed_tier_id = 'fast',
  carb_speed_confidence = 95,
  carb_speed_reason = 'Concentrated sugar or sports fuel with little intact food structure.',
  updated_at = now()
where lower(name) ~ '\m(candy|gummy|gummies|sour belt|candy belt|fruit chew|licorice|jelly bean|hard candy|marshmallow|energy gel|sports drink)\M'
  and lower(name) !~ '\m(chocolate|cookie|biscuit|cake|pastry|donut|ice cream)\M'
  and fat_per_100g < 12;

update public.foods set
  carb_speed_tier_id = 'fast',
  carb_speed_confidence = greatest(carb_speed_confidence, 90),
  carb_speed_reason = 'Most digestible carbohydrate is sugar and the food is low in fiber and fat.',
  updated_at = now()
where carbs_per_100g > 0
  and sugar_per_100g is not null
  and sugar_per_100g / greatest(1, carbs_per_100g - fiber_per_100g - coalesce(sugar_alcohols_per_100g, 0) - coalesce(allulose_per_100g, 0)) >= 0.65
  and fiber_per_100g < 3
  and fat_per_100g < 10
  and lower(name) !~ '\m(chocolate|cookie|biscuit|cake|pastry|donut|ice cream)\M';

-- Old generic medium fallbacks carried 62% confidence. When the record has no
-- sugar evidence and no authoritative review, expose the uncertainty instead.
update public.foods set
  carb_speed_tier_id = 'unknown',
  carb_speed_confidence = 0,
  carb_speed_reason = 'Not enough product-specific evidence to classify carb speed without guessing.',
  updated_at = now()
where carb_speed_confidence <= 62
  and coalesce(sugar_per_100g, 0) = 0
  and is_verified = false;

alter table public.meals
  add column if not exists unclassified_carbs_g numeric(9,2) not null default 0;

alter table public.meals drop constraint if exists meal_totals_nonnegative;
alter table public.meals add constraint meal_totals_nonnegative check (
  calories >= 0 and carbs_g >= 0 and protein_g >= 0 and fat_g >= 0 and fiber_g >= 0 and
  fast_carbs_g >= 0 and medium_carbs_g >= 0 and slow_carbs_g >= 0 and unclassified_carbs_g >= 0
);
