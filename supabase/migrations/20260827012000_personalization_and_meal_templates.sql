begin;

alter table public.user_fuel_preferences
  add column if not exists height_cm numeric(6,2),
  add column if not exists health_insights_enabled boolean not null default false,
  add column if not exists favorite_activities text[] not null default '{}',
  add column if not exists recent_activities text[] not null default '{}';

alter table public.user_fuel_preferences
  drop constraint if exists user_fuel_preferences_height_check;
alter table public.user_fuel_preferences
  add constraint user_fuel_preferences_height_check check (height_cm is null or height_cm between 90 and 250);

create table if not exists public.meal_templates (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  image_url text,
  calories numeric(9,2) not null default 0,
  carbs_g numeric(8,2) not null default 0,
  protein_g numeric(8,2) not null default 0,
  fat_g numeric(8,2) not null default 0,
  fiber_g numeric(8,2) not null default 0,
  fast_carbs_g numeric(8,2) not null default 0,
  medium_carbs_g numeric(8,2) not null default 0,
  slow_carbs_g numeric(8,2) not null default 0,
  prep_minutes integer not null default 5,
  instructions text[] not null default '{}',
  dietary_tags text[] not null default '{}',
  allergens text[] not null default '{}',
  activity_types text[] not null default '{}',
  ideal_timing_minutes integer not null,
  timing_low_minutes integer not null,
  timing_high_minutes integer not null,
  min_workout_minutes integer not null default 30,
  ingredient_blueprint jsonb not null default '[]'::jsonb,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_template_timing_valid check (timing_low_minutes <= ideal_timing_minutes and ideal_timing_minutes <= timing_high_minutes),
  constraint meal_template_macros_nonnegative check (calories >= 0 and carbs_g >= 0 and protein_g >= 0 and fat_g >= 0 and fiber_g >= 0)
);

create index if not exists meal_templates_activity_idx on public.meal_templates using gin (activity_types);
create index if not exists meal_templates_diet_idx on public.meal_templates using gin (dietary_tags);
create index if not exists meal_templates_timing_idx on public.meal_templates (ideal_timing_minutes, min_workout_minutes);

create table if not exists public.meal_template_items (
  id uuid primary key default extensions.gen_random_uuid(),
  template_id uuid not null references public.meal_templates(id) on delete cascade,
  position smallint not null,
  food_id uuid references public.foods(id) on delete set null,
  food_name_snapshot text not null,
  grams numeric(8,2) not null,
  serving_note text,
  is_scalable boolean not null default true,
  created_at timestamptz not null default now(),
  unique (template_id, position),
  constraint meal_template_item_grams_positive check (grams > 0)
);
create index if not exists meal_template_items_template_idx on public.meal_template_items (template_id, position);

create table if not exists public.workout_fuel_feedback (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  meal_id uuid references public.meals(id) on delete set null,
  energy text check (energy in ('low', 'good', 'great')),
  fullness text check (fullness in ('hungry', 'comfortable', 'too_full')),
  stomach text check (stomach in ('great', 'slight_issues', 'poor')),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, workout_id)
);
create index if not exists workout_fuel_feedback_user_idx on public.workout_fuel_feedback (user_id, created_at desc);

with new_foods(name, product_id, category, tier, kcal, carbs, protein, fat, fiber, serving_grams, serving_label) as (
  values
    ('Blueberries','library:blueberries','fruit','fast',57,14.5,0.7,0.3,2.4,100,'¾ cup'),
    ('Strawberries','library:strawberries','fruit','fast',32,7.7,0.7,0.3,2.0,140,'1 cup'),
    ('Peach','library:peach','fruit','fast',39,9.5,0.9,0.3,1.5,140,'1 medium'),
    ('Instant oatmeal','library:instant-oatmeal','grain','medium',368,68,12,7,8,70,'2 packets'),
    ('Cooked cream of rice','library:cooked-cream-of-rice','grain','medium',88,18.5,1.8,0.2,0.3,260,'1½ cups'),
    ('Granola','library:granola','bread','slow',471,64,10,20,8,55,'½ cup'),
    ('Corn flakes','library:corn-flakes','bread','fast',357,84,7.5,0.4,3,55,'2 cups'),
    ('Rice cereal','library:rice-cereal','bread','fast',380,86,6,1,1,55,'2 cups'),
    ('Crispy rice cereal','library:crispy-rice-cereal','bread','fast',382,87,6,1,1,55,'2 cups'),
    ('Skim milk','library:skim-milk','dairy','medium',34,5,3.4,0.1,0,240,'1 cup'),
    ('Low-fat milk','library:low-fat-milk','dairy','medium',42,5,3.4,1,0,240,'1 cup'),
    ('Oat milk','library:oat-milk','dairy','medium',46,6.7,1,1.5,0.8,240,'1 cup'),
    ('Rice milk','library:rice-milk','dairy','fast',47,9.2,0.3,1,0.3,240,'1 cup')
)
insert into public.foods (source_id, source_product_id, name, category, carb_speed_tier_id, carb_speed_confidence, carb_speed_reason, calories_per_100g, carbs_per_100g, protein_per_100g, fat_per_100g, fiber_per_100g, data_quality_score, is_verified)
select 'strictly', product_id, name, category, tier, 82, 'Curated practical pre-workout classification.', kcal, carbs, protein, fat, fiber, 78, true
from new_foods
on conflict (source_id, source_product_id) do update set
  name = excluded.name, category = excluded.category, carb_speed_tier_id = excluded.carb_speed_tier_id,
  calories_per_100g = excluded.calories_per_100g, carbs_per_100g = excluded.carbs_per_100g,
  protein_per_100g = excluded.protein_per_100g, fat_per_100g = excluded.fat_per_100g,
  fiber_per_100g = excluded.fiber_per_100g, updated_at = now();

with new_foods(name, product_id, serving_grams, serving_label) as (
  values
    ('Blueberries','library:blueberries',100,'¾ cup'), ('Strawberries','library:strawberries',140,'1 cup'), ('Peach','library:peach',140,'1 medium'),
    ('Instant oatmeal','library:instant-oatmeal',70,'2 packets'), ('Cooked cream of rice','library:cooked-cream-of-rice',260,'1½ cups'),
    ('Granola','library:granola',55,'½ cup'), ('Corn flakes','library:corn-flakes',55,'2 cups'), ('Rice cereal','library:rice-cereal',55,'2 cups'),
    ('Crispy rice cereal','library:crispy-rice-cereal',55,'2 cups'), ('Skim milk','library:skim-milk',240,'1 cup'),
    ('Low-fat milk','library:low-fat-milk',240,'1 cup'), ('Oat milk','library:oat-milk',240,'1 cup'), ('Rice milk','library:rice-milk',240,'1 cup')
)
insert into public.food_portions (food_id, label, amount, unit, gram_weight, is_default, source_description)
select f.id, nf.serving_label, 1, 'serving', nf.serving_grams, true, 'Strictly curated serving'
from new_foods nf join public.foods f on f.source_id = 'strictly' and f.source_product_id = nf.product_id
on conflict (food_id, label, amount, unit) do update set gram_weight = excluded.gram_weight, is_default = true;

with
fruits(food_name, label, grams) as (
  values ('Banana','Banana',118), ('Blueberries','Blueberry',100), ('Strawberries','Strawberry',140), ('Apple','Apple Cinnamon',140),
         ('Mango','Mango',130), ('Peach','Peach',140), ('Pineapple','Pineapple',140), ('Raisins','Raisin',35)
),
sweeteners(food_name, label, grams) as (values ('Honey','Honey',18), ('Maple syrup','Maple',22)),
oat_bases(food_name, label, grams) as (values ('Cooked rolled oats','Oatmeal',280), ('Instant oatmeal','Quick Oats',70)),
breads(food_name, label, grams) as (values ('White bread','Honey Toast',56), ('Sourdough bread','Sourdough',76)),
cereals(food_name, label, grams) as (values ('Low-fiber cereal','Low-Fiber Cereal',55), ('Corn flakes','Corn Flakes',55), ('Rice cereal','Rice Cereal',55), ('Crispy rice cereal','Crispy Rice Cereal',55)),
milks(food_name, label, grams, dairy) as (values ('Skim milk','Skim Milk',240,true), ('Low-fat milk','Low-Fat Milk',240,true), ('Oat milk','Oat Milk',240,false), ('Rice milk','Rice Milk',240,false)),
generated as (
  select 'oatmeal-'||lower(regexp_replace(f.label||'-'||s.label||'-'||b.label,'[^a-zA-Z0-9]+','-','g')) slug,
    f.label||' '||s.label||' '||b.label name, 7 prep_minutes, 95 ideal_timing, 80 timing_low, 110 timing_high,
    array['Prepare the oats until soft.','Top with fruit and sweetener.']::text[] instructions,
    array['vegetarian','halal','vegan','dairy-free']::text[] dietary_tags, array['gluten']::text[] allergens,
    jsonb_build_array(jsonb_build_object('name',b.food_name,'grams',b.grams),jsonb_build_object('name',f.food_name,'grams',f.grams),jsonb_build_object('name',s.food_name,'grams',s.grams)) ingredients
  from fruits f cross join sweeteners s cross join oat_bases b
  union all
  select 'cream-rice-'||lower(regexp_replace(f.label||'-'||s.label,'[^a-zA-Z0-9]+','-','g')),
    f.label||' '||s.label||' Cream of Rice', 8, 75, 60, 90,
    array['Cook cream of rice until smooth.','Stir in sweetener and add fruit.'], array['vegetarian','halal','vegan','dairy-free'], array[]::text[],
    jsonb_build_array(jsonb_build_object('name','Cooked cream of rice','grams',260),jsonb_build_object('name',f.food_name,'grams',f.grams),jsonb_build_object('name',s.food_name,'grams',s.grams))
  from fruits f cross join sweeteners s
  union all
  select 'bagel-'||lower(regexp_replace(f.label,'[^a-zA-Z0-9]+','-','g')), f.label||' Honey Bagel', 4, 75, 60, 90,
    array['Toast the bagel if preferred.','Add fruit and drizzle with honey.'], array['vegetarian','halal','vegan','dairy-free'], array['gluten'],
    jsonb_build_array(jsonb_build_object('name','Plain bagel','grams',95),jsonb_build_object('name',f.food_name,'grams',f.grams),jsonb_build_object('name','Honey','grams',18))
  from fruits f
  union all
  select 'toast-'||lower(regexp_replace(b.label||'-'||f.label,'[^a-zA-Z0-9]+','-','g')), f.label||' '||b.label, 4, 60, 45, 75,
    array['Toast the bread.','Serve with fruit and honey.'], array['vegetarian','halal','vegan','dairy-free'], array['gluten'],
    jsonb_build_array(jsonb_build_object('name',b.food_name,'grams',b.grams),jsonb_build_object('name',f.food_name,'grams',f.grams),jsonb_build_object('name','Honey','grams',16))
  from fruits f cross join breads b
  union all
  select 'rice-cake-'||lower(regexp_replace(f.label,'[^a-zA-Z0-9]+','-','g')), f.label||' Honey Rice Cakes', 3, 40, 25, 55,
    array['Arrange rice cakes on a plate.','Top with fruit and honey.'], array['vegetarian','halal','vegan','dairy-free','gluten-free'], array[]::text[],
    jsonb_build_array(jsonb_build_object('name','Plain rice cakes','grams',27),jsonb_build_object('name',f.food_name,'grams',f.grams),jsonb_build_object('name','Honey','grams',15))
  from fruits f
  union all
  select 'yogurt-'||lower(regexp_replace(f.label||'-'||s.label,'[^a-zA-Z0-9]+','-','g')), f.label||' '||s.label||' Yogurt Bowl', 5, 105, 90, 120,
    array['Add yogurt to a bowl.','Top with granola, fruit, and sweetener.'], array['vegetarian','halal'], array['dairy','gluten'],
    jsonb_build_array(jsonb_build_object('name','Low-fat Greek yogurt','grams',170),jsonb_build_object('name','Granola','grams',55),jsonb_build_object('name',f.food_name,'grams',f.grams),jsonb_build_object('name',s.food_name,'grams',s.grams))
  from fruits f cross join sweeteners s
  union all
  select 'cereal-'||lower(regexp_replace(c.label||'-'||m.label||'-'||f.label,'[^a-zA-Z0-9]+','-','g')), f.label||' '||c.label||' with '||m.label, 3, 60, 45, 75,
    array['Add cereal and fruit to a bowl.','Pour over milk just before eating.'],
    case when m.dairy then array['vegetarian','halal'] else array['vegetarian','halal','vegan','dairy-free'] end,
    case when m.dairy then array['gluten','dairy'] else array['gluten'] end,
    jsonb_build_array(jsonb_build_object('name',c.food_name,'grams',c.grams),jsonb_build_object('name',m.food_name,'grams',m.grams),jsonb_build_object('name',f.food_name,'grams',f.grams))
  from cereals c cross join milks m cross join (select * from fruits limit 4) f
  union all
  select 'smoothie-'||lower(regexp_replace(m.label||'-'||f.label,'[^a-zA-Z0-9]+','-','g')), f.label||' '||m.label||' Smoothie', 5, 45, 30, 60,
    array['Blend until completely smooth.','Drink slowly and confirm your own tolerance.'],
    case when m.dairy then array['vegetarian','halal','gluten-free'] else array['vegetarian','halal','vegan','dairy-free','gluten-free'] end,
    case when m.dairy then array['dairy'] else array[]::text[] end,
    jsonb_build_array(jsonb_build_object('name',m.food_name,'grams',m.grams),jsonb_build_object('name',f.food_name,'grams',f.grams),jsonb_build_object('name','Honey','grams',18))
  from milks m cross join (select * from fruits limit 6) f
)
insert into public.meal_templates (slug,name,description,prep_minutes,instructions,dietary_tags,allergens,activity_types,ideal_timing_minutes,timing_low_minutes,timing_high_minutes,min_workout_minutes,ingredient_blueprint,is_verified)
select slug, name, 'A practical workout-fueling meal built from familiar foods.', prep_minutes, instructions, dietary_tags, allergens,
  array['running','cycling','swimming','strength','crossfit','hyrox','triathlon','rowing','general_cardio'], ideal_timing, timing_low, timing_high, 30, ingredients, true
from generated
on conflict (slug) do update set name=excluded.name, instructions=excluded.instructions, dietary_tags=excluded.dietary_tags, allergens=excluded.allergens, ingredient_blueprint=excluded.ingredient_blueprint, updated_at=now();

delete from public.meal_template_items where template_id in (select id from public.meal_templates where slug like any (array['oatmeal-%','cream-rice-%','bagel-%','toast-%','rice-cake-%','yogurt-%','cereal-%','smoothie-%']));

insert into public.meal_template_items (template_id, position, food_id, food_name_snapshot, grams)
select mt.id, ingredient.ordinality::smallint, f.id, ingredient.value->>'name', (ingredient.value->>'grams')::numeric
from public.meal_templates mt
cross join lateral jsonb_array_elements(mt.ingredient_blueprint) with ordinality as ingredient(value, ordinality)
left join public.foods f on lower(f.name) = lower(ingredient.value->>'name')
where mt.slug like any (array['oatmeal-%','cream-rice-%','bagel-%','toast-%','rice-cake-%','yogurt-%','cereal-%','smoothie-%']);

with totals as (
  select mti.template_id,
    sum(f.calories_per_100g*mti.grams/100) calories,
    sum(f.carbs_per_100g*mti.grams/100) carbs,
    sum(f.protein_per_100g*mti.grams/100) protein,
    sum(f.fat_per_100g*mti.grams/100) fat,
    sum(f.fiber_per_100g*mti.grams/100) fiber,
    sum(case when f.carb_speed_tier_id='fast' then f.carbs_per_100g*mti.grams/100 else 0 end) fast,
    sum(case when f.carb_speed_tier_id='medium' then f.carbs_per_100g*mti.grams/100 else 0 end) medium,
    sum(case when f.carb_speed_tier_id='slow' then f.carbs_per_100g*mti.grams/100 else 0 end) slow
  from public.meal_template_items mti join public.foods f on f.id=mti.food_id group by mti.template_id
)
update public.meal_templates mt set calories=round(t.calories,2), carbs_g=round(t.carbs,2), protein_g=round(t.protein,2), fat_g=round(t.fat,2), fiber_g=round(t.fiber,2), fast_carbs_g=round(t.fast,2), medium_carbs_g=round(t.medium,2), slow_carbs_g=round(t.slow,2), updated_at=now()
from totals t where mt.id=t.template_id;

alter table public.meal_templates enable row level security;
alter table public.meal_template_items enable row level security;
alter table public.workout_fuel_feedback enable row level security;

drop policy if exists "Anyone can read verified meal templates" on public.meal_templates;
create policy "Anyone can read verified meal templates" on public.meal_templates for select using (is_verified = true);
drop policy if exists "Anyone can read verified meal template items" on public.meal_template_items;
create policy "Anyone can read verified meal template items" on public.meal_template_items for select using (exists (select 1 from public.meal_templates mt where mt.id=template_id and mt.is_verified=true));
drop policy if exists "Users manage own workout feedback" on public.workout_fuel_feedback;
create policy "Users manage own workout feedback" on public.workout_fuel_feedback for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

grant select on public.meal_templates, public.meal_template_items to anon, authenticated;
grant select, insert, update, delete on public.workout_fuel_feedback to authenticated;

commit;
