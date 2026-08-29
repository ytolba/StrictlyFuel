begin;

-- ---------------------------------------------------------------------------
-- Server-side enforcement of AI usage allowances.
--
-- The client tracks usage in AsyncStorage for instant UI feedback, but that is
-- trivially reset by reinstalling. The vision calls are what actually cost
-- money, so the real gate lives here and in the edge functions.
-- ---------------------------------------------------------------------------

-- Subscription state, written only by the RevenueCat webhook (service role).
create table public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_pro boolean not null default false,
  product_id text,
  store text,
  period_type text,
  expires_at timestamptz,
  original_app_user_id text,
  last_event_at timestamptz,
  updated_at timestamptz not null default now()
);

create index user_subscriptions_expires_idx on public.user_subscriptions (expires_at) where is_pro;

-- One row per consumed credit. Also doubles as an audit trail for cost.
create table public.ai_usage_events (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('scan', 'reshuffle')),
  created_at timestamptz not null default now()
);

-- The hot path is "count this user's events for this feature this week".
create index ai_usage_events_user_feature_time_idx
  on public.ai_usage_events (user_id, feature, created_at desc);

-- Allowances live in a table so they can be tuned without shipping a build.
create table public.ai_feature_limits (
  feature text not null check (feature in ('scan', 'reshuffle')),
  is_pro boolean not null,
  weekly_limit integer not null check (weekly_limit >= 0),
  primary key (feature, is_pro)
);

insert into public.ai_feature_limits (feature, is_pro, weekly_limit) values
  ('scan', false, 3),
  ('scan', true, 100),
  ('reshuffle', false, 5),
  ('reshuffle', true, 200);

alter table public.user_subscriptions enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.ai_feature_limits enable row level security;

-- Users may read their own state, but never write it: all writes go through
-- the security-definer function below or the service role.
create policy user_subscriptions_select_own on public.user_subscriptions
  for select using (auth.uid() = user_id);

create policy ai_usage_events_select_own on public.ai_usage_events
  for select using (auth.uid() = user_id);

create policy ai_feature_limits_readable on public.ai_feature_limits
  for select using (true);

-- ---------------------------------------------------------------------------
-- Is this user currently Pro? Treats a missing row as free, and an expired
-- subscription as free even if the webhook has not yet caught up.
-- ---------------------------------------------------------------------------
create or replace function public.is_pro_user(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.is_pro and (s.expires_at is null or s.expires_at > now())
     from public.user_subscriptions s
     where s.user_id = p_user_id),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Atomically check the weekly allowance and, if there is room, consume one
-- credit. Returns the resulting state either way so callers can render an
-- accurate message without a second round trip.
--
-- The week matches the client: Postgres `date_trunc('week', ...)` starts on
-- Monday, as does the ISO week key used in entitlementService.ts.
-- ---------------------------------------------------------------------------
create or replace function public.consume_ai_credit(p_feature text)
returns table (allowed boolean, used integer, weekly_limit integer, is_pro boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_is_pro boolean;
  v_limit integer;
  v_used integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_feature not in ('scan', 'reshuffle') then
    raise exception 'unknown_feature' using errcode = '22023';
  end if;

  v_is_pro := public.is_pro_user(v_user_id);

  select l.weekly_limit into v_limit
  from public.ai_feature_limits l
  where l.feature = p_feature and l.is_pro = v_is_pro;

  v_limit := coalesce(v_limit, 0);

  -- Serialise concurrent calls from the same user so two in-flight requests
  -- cannot both pass the check on the final remaining credit.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_user_id::text || ':' || p_feature)::bigint);

  select count(*)::integer into v_used
  from public.ai_usage_events e
  where e.user_id = v_user_id
    and e.feature = p_feature
    and e.created_at >= date_trunc('week', now());

  if v_used >= v_limit then
    return query select false, v_used, v_limit, v_is_pro;
    return;
  end if;

  insert into public.ai_usage_events (user_id, feature) values (v_user_id, p_feature);

  return query select true, v_used + 1, v_limit, v_is_pro;
end;
$$;

-- ---------------------------------------------------------------------------
-- Read-only view of the current allowance, so the client can reconcile its
-- local counter with the server on launch.
-- ---------------------------------------------------------------------------
create or replace function public.ai_credit_status()
returns table (feature text, used integer, weekly_limit integer, is_pro boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_is_pro boolean;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_is_pro := public.is_pro_user(v_user_id);

  return query
    select l.feature,
           coalesce((
             select count(*)::integer from public.ai_usage_events e
             where e.user_id = v_user_id
               and e.feature = l.feature
               and e.created_at >= date_trunc('week', now())
           ), 0),
           l.weekly_limit,
           v_is_pro
    from public.ai_feature_limits l
    where l.is_pro = v_is_pro;
end;
$$;

revoke all on function public.consume_ai_credit(text) from public;
revoke all on function public.ai_credit_status() from public;
revoke all on function public.is_pro_user(uuid) from public;
grant execute on function public.consume_ai_credit(text) to authenticated;
grant execute on function public.ai_credit_status() to authenticated;

commit;
