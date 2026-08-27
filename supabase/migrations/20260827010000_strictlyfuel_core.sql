begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.workout_intensity as enum ('easy', 'moderate', 'hard');
create type public.meal_source as enum ('manual', 'camera', 'copied', 'recommended');
create type public.fix_action as enum ('add', 'reduce', 'replace');
create type public.feedback_rating as enum ('low', 'good', 'great');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_path text,
  bio text,
  activity_preferences text[] not null default '{}',
  dietary_preferences text[] not null default '{}',
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username is null or username ~ '^[a-z0-9._]{3,30}$')
);

create unique index profiles_username_lower_idx on public.profiles (lower(username)) where username is not null;

create table public.user_fuel_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  body_weight_kg numeric(6,2),
  default_activity text,
  sensitivities text[] not null default '{}',
  allergies text[] not null default '{}',
  dietary_patterns text[] not null default '{}',
  avoid_foods text[] not null default '{}',
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  updated_at timestamptz not null default now(),
  constraint valid_body_weight check (body_weight_kg is null or body_weight_kg between 25 and 350)
);

create table public.food_sources (
  id text primary key,
  display_name text not null,
  homepage_url text,
  attribution text,
  priority smallint not null default 50,
  is_authoritative boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.carb_speed_tiers (
  id text primary key check (id in ('fast', 'medium', 'slow')),
  rank smallint not null unique,
  display_name text not null,
  color_hex text not null,
  short_description text not null,
  practical_timing_min_minutes integer not null,
  practical_timing_max_minutes integer,
  classification_rules jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.foods (
  id uuid primary key default extensions.gen_random_uuid(),
  source_id text not null references public.food_sources(id),
  source_product_id text,
  barcode text,
  name text not null,
  brand text,
  description text,
  category text,
  image_url text,
  carb_speed_tier_id text not null default 'medium' references public.carb_speed_tiers(id),
  carb_speed_confidence numeric(5,2) not null default 50,
  carb_speed_reason text,
  calories_per_100g numeric(9,3) not null default 0,
  carbs_per_100g numeric(9,3) not null default 0,
  protein_per_100g numeric(9,3) not null default 0,
  fat_per_100g numeric(9,3) not null default 0,
  fiber_per_100g numeric(9,3) not null default 0,
  sugar_per_100g numeric(9,3),
  sodium_mg_per_100g numeric(10,3),
  data_quality_score smallint not null default 50,
  is_verified boolean not null default false,
  raw_source_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(description, ''))
  ) stored,
  constraint food_macros_nonnegative check (
    calories_per_100g >= 0 and carbs_per_100g >= 0 and protein_per_100g >= 0 and
    fat_per_100g >= 0 and fiber_per_100g >= 0
  ),
  constraint food_quality_range check (data_quality_score between 0 and 100),
  constraint food_speed_confidence_range check (carb_speed_confidence between 0 and 100),
  unique (source_id, source_product_id)
);

create unique index foods_barcode_idx on public.foods (barcode) where barcode is not null;
create index foods_search_idx on public.foods using gin (search_vector);
create index foods_name_trgm_idx on public.foods using gin (lower(name) extensions.gin_trgm_ops);
create index foods_brand_trgm_idx on public.foods using gin (lower(brand) extensions.gin_trgm_ops);
create index foods_carb_speed_idx on public.foods (carb_speed_tier_id);

create table public.food_aliases (
  id bigint generated always as identity primary key,
  food_id uuid not null references public.foods(id) on delete cascade,
  alias text not null,
  unique (food_id, alias)
);
create index food_aliases_trgm_idx on public.food_aliases using gin (lower(alias) extensions.gin_trgm_ops);

create table public.food_portions (
  id uuid primary key default extensions.gen_random_uuid(),
  food_id uuid not null references public.foods(id) on delete cascade,
  label text not null,
  amount numeric(9,3) not null default 1,
  unit text not null,
  gram_weight numeric(9,3) not null,
  is_default boolean not null default false,
  source_description text,
  created_at timestamptz not null default now(),
  constraint portion_positive check (amount > 0 and gram_weight > 0),
  unique (food_id, label, amount, unit)
);
create index food_portions_food_idx on public.food_portions (food_id);

create table public.dietary_tags (
  id text primary key,
  display_name text not null,
  tag_type text not null check (tag_type in ('diet', 'allergen', 'preference', 'preparation'))
);

create table public.food_dietary_tags (
  food_id uuid not null references public.foods(id) on delete cascade,
  tag_id text not null references public.dietary_tags(id) on delete cascade,
  confidence numeric(5,2) not null default 100,
  primary key (food_id, tag_id),
  constraint food_tag_confidence_range check (confidence between 0 and 100)
);

create table public.food_search_cache (
  query_key text primary key,
  query_text text not null,
  provider text not null references public.food_sources(id),
  result_food_ids uuid[] not null default '{}',
  hit_count bigint not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.food_api_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  normalized_query text not null,
  provider text not null,
  result_count integer not null default 0,
  cache_hit boolean not null default false,
  latency_ms integer,
  created_at timestamptz not null default now()
);
create index food_api_events_query_idx on public.food_api_events (normalized_query, created_at desc);

create table public.workouts (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null,
  custom_activity text,
  duration_minutes integer not null,
  intensity public.workout_intensity not null,
  starts_in_minutes integer not null,
  scheduled_at timestamptz,
  body_weight_kg numeric(6,2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_duration_valid check (duration_minutes between 5 and 1440),
  constraint workout_timing_valid check (starts_in_minutes between 0 and 1440),
  constraint workout_weight_valid check (body_weight_kg between 25 and 350)
);
create index workouts_user_created_idx on public.workouts (user_id, created_at desc);
create index workouts_context_idx on public.workouts (activity_type, duration_minutes, starts_in_minutes);

create table public.fuel_targets (
  id uuid primary key default extensions.gen_random_uuid(),
  workout_id uuid not null unique references public.workouts(id) on delete cascade,
  carb_target_g numeric(8,2) not null,
  carb_low_g numeric(8,2) not null,
  carb_high_g numeric(8,2) not null,
  grams_per_kg_low numeric(6,3) not null,
  grams_per_kg_high numeric(6,3) not null,
  fast_carbs_g numeric(8,2) not null,
  medium_carbs_g numeric(8,2) not null,
  slow_carbs_g numeric(8,2) not null,
  intra_required boolean not null default false,
  intra_low_g_per_hour numeric(7,2) not null default 0,
  intra_high_g_per_hour numeric(7,2) not null default 0,
  intra_note text,
  timing_label text not null,
  rationale text not null,
  model_version text not null default 'fuel-v1',
  created_at timestamptz not null default now(),
  constraint target_range_valid check (carb_low_g <= carb_target_g and carb_target_g <= carb_high_g),
  constraint target_parts_valid check (fast_carbs_g >= 0 and medium_carbs_g >= 0 and slow_carbs_g >= 0)
);

create table public.meals (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  name text not null,
  image_path text,
  source public.meal_source not null,
  is_estimate boolean not null default false,
  confidence numeric(5,2),
  calories numeric(10,2) not null default 0,
  carbs_g numeric(9,2) not null default 0,
  protein_g numeric(9,2) not null default 0,
  fat_g numeric(9,2) not null default 0,
  fiber_g numeric(9,2) not null default 0,
  fast_carbs_g numeric(9,2) not null default 0,
  medium_carbs_g numeric(9,2) not null default 0,
  slow_carbs_g numeric(9,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_confidence_range check (confidence is null or confidence between 0 and 100),
  constraint meal_totals_nonnegative check (
    calories >= 0 and carbs_g >= 0 and protein_g >= 0 and fat_g >= 0 and fiber_g >= 0 and
    fast_carbs_g >= 0 and medium_carbs_g >= 0 and slow_carbs_g >= 0
  )
);
create index meals_user_created_idx on public.meals (user_id, created_at desc);
create index meals_workout_idx on public.meals (workout_id);

create table public.meal_items (
  id uuid primary key default extensions.gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  portion_id uuid references public.food_portions(id) on delete set null,
  position smallint not null default 0,
  food_name_snapshot text not null,
  brand_snapshot text,
  quantity numeric(9,3) not null default 1,
  grams numeric(9,3) not null,
  calories numeric(10,3) not null default 0,
  carbs_g numeric(9,3) not null default 0,
  protein_g numeric(9,3) not null default 0,
  fat_g numeric(9,3) not null default 0,
  fiber_g numeric(9,3) not null default 0,
  carb_speed_tier_id text not null references public.carb_speed_tiers(id),
  confidence numeric(5,2),
  is_estimate boolean not null default false,
  created_at timestamptz not null default now(),
  constraint meal_item_positive check (quantity > 0 and grams > 0),
  constraint meal_item_confidence_range check (confidence is null or confidence between 0 and 100)
);
create index meal_items_meal_position_idx on public.meal_items (meal_id, position);
create index meal_items_food_idx on public.meal_items (food_id);

create table public.meal_analyses (
  id uuid primary key default extensions.gen_random_uuid(),
  meal_id uuid not null unique references public.meals(id) on delete cascade,
  strictly_score smallint not null,
  carb_score smallint not null,
  timing_score smallint not null,
  distribution_score smallint not null,
  comfort_score smallint not null,
  headline text not null,
  summary text not null,
  components jsonb not null default '[]'::jsonb,
  model_version text not null default 'meal-score-v1',
  created_at timestamptz not null default now(),
  constraint scores_valid check (
    strictly_score between 0 and 100 and carb_score between 0 and 100 and
    timing_score between 0 and 100 and distribution_score between 0 and 100 and comfort_score between 0 and 100
  )
);

create table public.meal_fix_suggestions (
  id uuid primary key default extensions.gen_random_uuid(),
  analysis_id uuid not null references public.meal_analyses(id) on delete cascade,
  position smallint not null default 0,
  action public.fix_action not null,
  food_id uuid references public.foods(id) on delete set null,
  ingredient_name text not null,
  grams numeric(9,2),
  detail text not null,
  estimated_new_score smallint,
  is_applied boolean not null default false,
  created_at timestamptz not null default now(),
  constraint fix_score_valid check (estimated_new_score is null or estimated_new_score between 0 and 100)
);

create table public.fuel_posts (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  author_username text not null,
  caption text not null default '',
  show_workout boolean not null default true,
  show_macros boolean not null default true,
  show_ingredients boolean not null default true,
  saves_count bigint not null default 0,
  copies_count bigint not null default 0,
  likes_count bigint not null default 0,
  comments_count bigint not null default 0,
  is_public boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, meal_id)
);
create index fuel_posts_feed_idx on public.fuel_posts (is_public, published_at desc) where deleted_at is null;
create index fuel_posts_workout_idx on public.fuel_posts (workout_id);
create index fuel_posts_utility_idx on public.fuel_posts ((saves_count + copies_count * 2) desc, published_at desc) where deleted_at is null;

create table public.post_likes (
  post_id uuid not null references public.fuel_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.saved_meals (
  post_id uuid not null references public.fuel_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  collection_name text,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index saved_meals_user_idx on public.saved_meals (user_id, created_at desc);

create table public.meal_copies (
  id uuid primary key default extensions.gen_random_uuid(),
  source_post_id uuid not null references public.fuel_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  copied_meal_id uuid not null references public.meals(id) on delete cascade,
  target_workout_id uuid references public.workouts(id) on delete set null,
  scale_factor numeric(8,4) not null default 1,
  created_at timestamptz not null default now(),
  unique (source_post_id, user_id, copied_meal_id)
);

create table public.post_comments (
  id uuid primary key default extensions.gen_random_uuid(),
  post_id uuid not null references public.fuel_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.post_comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index post_comments_post_idx on public.post_comments (post_id, created_at);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint cannot_follow_self check (follower_id <> followed_id)
);

create table public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint cannot_block_self check (blocker_id <> blocked_id)
);

create table public.post_reports (
  id uuid primary key default extensions.gen_random_uuid(),
  post_id uuid not null references public.fuel_posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create table public.workout_fuel_feedback (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  energy public.feedback_rating not null,
  stomach public.feedback_rating not null,
  performance public.feedback_rating not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, workout_id, meal_id)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger preferences_set_updated_at before update on public.user_fuel_preferences for each row execute function public.set_updated_at();
create trigger foods_set_updated_at before update on public.foods for each row execute function public.set_updated_at();
create trigger cache_set_updated_at before update on public.food_search_cache for each row execute function public.set_updated_at();
create trigger workouts_set_updated_at before update on public.workouts for each row execute function public.set_updated_at();
create trigger meals_set_updated_at before update on public.meals for each row execute function public.set_updated_at();
create trigger posts_set_updated_at before update on public.fuel_posts for each row execute function public.set_updated_at();
create trigger comments_set_updated_at before update on public.post_comments for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    null,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'athlete'), '@', 1))
  ) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.refresh_post_counter()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_post uuid;
begin
  if tg_table_name = 'meal_copies' then
    target_post := coalesce(new.source_post_id, old.source_post_id);
  else
    target_post := coalesce(new.post_id, old.post_id);
  end if;
  update public.fuel_posts set
    likes_count = (select count(*) from public.post_likes where post_id = target_post),
    saves_count = (select count(*) from public.saved_meals where post_id = target_post),
    copies_count = (select count(*) from public.meal_copies where source_post_id = target_post),
    comments_count = (select count(*) from public.post_comments where post_id = target_post and deleted_at is null)
  where id = target_post;
  return coalesce(new, old);
end;
$$;

create trigger likes_refresh_counter after insert or delete on public.post_likes for each row execute function public.refresh_post_counter();
create trigger saves_refresh_counter after insert or delete on public.saved_meals for each row execute function public.refresh_post_counter();
create trigger copies_refresh_counter after insert or delete on public.meal_copies for each row execute function public.refresh_post_counter();
create trigger comments_refresh_counter after insert or update or delete on public.post_comments for each row execute function public.refresh_post_counter();

create or replace function public.search_food_catalog(search_text text, result_limit integer default 25)
returns setof public.foods
language sql stable set search_path = '' as $$
  select f.* from public.foods f
  where f.search_vector @@ websearch_to_tsquery('simple', search_text)
     or extensions.similarity(lower(f.name), lower(search_text)) > 0.15
     or extensions.similarity(lower(coalesce(f.brand, '')), lower(search_text)) > 0.15
     or exists (select 1 from public.food_aliases a where a.food_id = f.id and extensions.similarity(lower(a.alias), lower(search_text)) > 0.15)
  order by
    f.is_verified desc,
    f.data_quality_score desc,
    greatest(similarity(lower(f.name), lower(search_text)), similarity(lower(coalesce(f.brand, '')), lower(search_text))) desc
  limit least(greatest(result_limit, 1), 50);
$$;

grant execute on function public.search_food_catalog(text, integer) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.user_fuel_preferences enable row level security;
alter table public.food_sources enable row level security;
alter table public.carb_speed_tiers enable row level security;
alter table public.foods enable row level security;
alter table public.food_aliases enable row level security;
alter table public.food_portions enable row level security;
alter table public.dietary_tags enable row level security;
alter table public.food_dietary_tags enable row level security;
alter table public.food_search_cache enable row level security;
alter table public.food_api_events enable row level security;
alter table public.workouts enable row level security;
alter table public.fuel_targets enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.meal_analyses enable row level security;
alter table public.meal_fix_suggestions enable row level security;
alter table public.fuel_posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.saved_meals enable row level security;
alter table public.meal_copies enable row level security;
alter table public.post_comments enable row level security;
alter table public.follows enable row level security;
alter table public.blocked_users enable row level security;
alter table public.post_reports enable row level security;
alter table public.workout_fuel_feedback enable row level security;

create policy "Public profiles are discoverable" on public.profiles for select using (not is_private or id = auth.uid());
create policy "Users update their profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Users manage fuel preferences" on public.user_fuel_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Food sources are readable" on public.food_sources for select using (true);
create policy "Carb tiers are readable" on public.carb_speed_tiers for select using (true);
create policy "Foods are readable" on public.foods for select using (true);
create policy "Food aliases are readable" on public.food_aliases for select using (true);
create policy "Food portions are readable" on public.food_portions for select using (true);
create policy "Dietary tags are readable" on public.dietary_tags for select using (true);
create policy "Food tag links are readable" on public.food_dietary_tags for select using (true);

create policy "Users manage workouts" on public.workouts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Published workout context is readable" on public.workouts for select using (exists (select 1 from public.fuel_posts p where p.workout_id = id and p.is_public and p.show_workout and p.deleted_at is null));
create policy "Users read own targets" on public.fuel_targets for select using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "Published fuel targets are readable" on public.fuel_targets for select using (exists (select 1 from public.fuel_posts p where p.workout_id = workout_id and p.is_public and p.show_workout and p.deleted_at is null));
create policy "Users insert own targets" on public.fuel_targets for insert with check (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "Users update own targets" on public.fuel_targets for update using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "Users delete own targets" on public.fuel_targets for delete using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));

create policy "Users manage meals" on public.meals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Published meal summaries are readable" on public.meals for select using (exists (select 1 from public.fuel_posts p where p.meal_id = id and p.is_public and p.deleted_at is null));
create policy "Users manage meal items" on public.meal_items for all using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())) with check (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()));
create policy "Published meal ingredients are readable" on public.meal_items for select using (exists (select 1 from public.fuel_posts p where p.meal_id = meal_id and p.is_public and p.show_ingredients and p.deleted_at is null));
create policy "Users manage meal analyses" on public.meal_analyses for all using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())) with check (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()));
create policy "Published scores are readable" on public.meal_analyses for select using (exists (select 1 from public.fuel_posts p where p.meal_id = meal_id and p.is_public and p.deleted_at is null));
create policy "Users read own fixes" on public.meal_fix_suggestions for select using (exists (select 1 from public.meal_analyses a join public.meals m on m.id = a.meal_id where a.id = analysis_id and m.user_id = auth.uid()));
create policy "Users create own fixes" on public.meal_fix_suggestions for insert with check (exists (select 1 from public.meal_analyses a join public.meals m on m.id = a.meal_id where a.id = analysis_id and m.user_id = auth.uid()));
create policy "Users update own fixes" on public.meal_fix_suggestions for update using (exists (select 1 from public.meal_analyses a join public.meals m on m.id = a.meal_id where a.id = analysis_id and m.user_id = auth.uid()));
create policy "Users delete own fixes" on public.meal_fix_suggestions for delete using (exists (select 1 from public.meal_analyses a join public.meals m on m.id = a.meal_id where a.id = analysis_id and m.user_id = auth.uid()));

create policy "Public posts are readable" on public.fuel_posts for select using (deleted_at is null and (is_public or user_id = auth.uid()));
create policy "Users create posts from own meals" on public.fuel_posts for insert with check (user_id = auth.uid() and exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()));
create policy "Users update own posts" on public.fuel_posts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own posts" on public.fuel_posts for delete using (user_id = auth.uid());

create policy "Likes are readable" on public.post_likes for select using (true);
create policy "Users manage own likes" on public.post_likes for insert with check (user_id = auth.uid());
create policy "Users remove own likes" on public.post_likes for delete using (user_id = auth.uid());
create policy "Users read own saves" on public.saved_meals for select using (user_id = auth.uid());
create policy "Users save meals" on public.saved_meals for insert with check (user_id = auth.uid());
create policy "Users remove own saves" on public.saved_meals for delete using (user_id = auth.uid());
create policy "Users read own copies" on public.meal_copies for select using (user_id = auth.uid());
create policy "Users create own copies" on public.meal_copies for insert with check (user_id = auth.uid() and exists (select 1 from public.meals m where m.id = copied_meal_id and m.user_id = auth.uid()));

create policy "Visible comments are readable" on public.post_comments for select using (deleted_at is null);
create policy "Users create comments" on public.post_comments for insert with check (user_id = auth.uid());
create policy "Users update own comments" on public.post_comments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own comments" on public.post_comments for delete using (user_id = auth.uid());

create policy "Follows are readable" on public.follows for select using (true);
create policy "Users create follows" on public.follows for insert with check (follower_id = auth.uid());
create policy "Users remove follows" on public.follows for delete using (follower_id = auth.uid());
create policy "Users manage blocks" on public.blocked_users for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "Users create reports" on public.post_reports for insert with check (reporter_id = auth.uid());
create policy "Users read own reports" on public.post_reports for select using (reporter_id = auth.uid());
create policy "Users manage feedback" on public.workout_fuel_feedback for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.food_sources (id, display_name, homepage_url, attribution, priority, is_authoritative) values
  ('strictly', 'Strictly curated', null, 'Reviewed by StrictlyFuel', 100, true),
  ('usda', 'USDA FoodData Central', 'https://fdc.nal.usda.gov/', 'USDA FoodData Central', 90, true),
  ('open_food_facts', 'Open Food Facts', 'https://world.openfoodfacts.org/', 'Open Food Facts contributors', 60, false),
  ('label', 'Package label', null, 'Nutrition facts supplied from package label', 95, true),
  ('ai_estimate', 'Camera estimate', null, 'Estimated from meal photo', 20, false)
on conflict (id) do update set display_name = excluded.display_name, priority = excluded.priority;

insert into public.carb_speed_tiers (id, rank, display_name, color_hex, short_description, practical_timing_min_minutes, practical_timing_max_minutes, classification_rules) values
  ('fast', 1, 'Fast-digesting', '#D8E66B', 'Lower-burden carbohydrate sources generally suited closer to training.', 0, 90, '{"favor_when_minutes_under":90,"lower_fiber":true,"lower_fat":true}'::jsonb),
  ('medium', 2, 'Medium-digesting', '#78947F', 'Moderate food structure and digestion burden for a wider pre-workout window.', 45, 180, '{"favor_when_minutes_between":[60,180]}'::jsonb),
  ('slow', 3, 'Slow-digesting', '#1D3B2A', 'Higher-fiber or mixed sources generally better with more time before training.', 90, null, '{"favor_when_minutes_over":120,"higher_fiber_or_fat":true}'::jsonb)
on conflict (id) do update set classification_rules = excluded.classification_rules, updated_at = now();

insert into public.dietary_tags (id, display_name, tag_type) values
  ('vegan', 'Vegan', 'diet'), ('vegetarian', 'Vegetarian', 'diet'),
  ('gluten_free', 'Gluten-free', 'diet'), ('dairy_free', 'Dairy-free', 'diet'),
  ('contains_milk', 'Contains milk', 'allergen'), ('contains_peanuts', 'Contains peanuts', 'allergen'),
  ('low_fiber', 'Low fiber', 'preference'), ('low_fat', 'Low fat', 'preference')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-images', 'meal-images', false, 12582912, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Users upload meal images" on storage.objects for insert to authenticated
with check (bucket_id = 'meal-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users read own meal images" on storage.objects for select to authenticated
using (bucket_id = 'meal-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users update own meal images" on storage.objects for update to authenticated
using (bucket_id = 'meal-images' and owner_id = auth.uid()::text);
create policy "Users delete own meal images" on storage.objects for delete to authenticated
using (bucket_id = 'meal-images' and owner_id = auth.uid()::text);

commit;
