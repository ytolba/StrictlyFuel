begin;

-- Per-call AI cost accounting.
--
-- Without this there is no way to answer "which feature is spending the money",
-- because the only signal is a monthly invoice from the provider. Every model
-- call records what it cost in tokens, how long it took, and whether it worked.
--
-- Deliberately NOT recorded: prompts, images, model output, or any nutrition or
-- health content. The row is a meter reading, not a transcript.
create table if not exists public.ai_usage_events (
  id uuid primary key default extensions.gen_random_uuid(),
  -- Nulled rather than cascaded on account deletion: the spend already happened
  -- and belongs in the cost history, but it stops being attributable to a
  -- person the moment they delete their account.
  user_id uuid references auth.users(id) on delete set null,
  feature text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  cached_input_tokens integer not null default 0,
  reasoning_tokens integer not null default 0,
  latency_ms integer not null default 0,
  success boolean not null default true,
  retried boolean not null default false,
  -- A short machine code (http_502, timeout, no_output). Never a raw message,
  -- which can carry request content.
  error_code text,
  created_at timestamptz not null default now(),
  constraint ai_usage_feature_known check (feature in ('meal_vision', 'label_vision')),
  constraint ai_usage_tokens_nonnegative check (
    input_tokens >= 0 and output_tokens >= 0 and total_tokens >= 0
    and cached_input_tokens >= 0 and reasoning_tokens >= 0
  )
);

create index if not exists ai_usage_events_feature_idx on public.ai_usage_events (feature, created_at desc);
create index if not exists ai_usage_events_created_idx on public.ai_usage_events (created_at desc);
create index if not exists ai_usage_events_user_idx on public.ai_usage_events (user_id, created_at desc);

alter table public.ai_usage_events enable row level security;

-- No policy is defined on purpose: only the service role (edge functions and
-- the SQL editor) can read or write this table. Clients have no business
-- reading anyone's usage, including their own — the in-app allowance already
-- comes from ai_credit_status().

-- "Which feature is consuming the most AI?" in one query.
create or replace view public.ai_usage_daily as
select
  date_trunc('day', created_at)::date as day,
  feature,
  model,
  count(*)                        as calls,
  count(*) filter (where not success) as failures,
  count(*) filter (where retried)     as retries,
  sum(input_tokens)               as input_tokens,
  sum(output_tokens)              as output_tokens,
  sum(total_tokens)               as total_tokens,
  sum(cached_input_tokens)        as cached_input_tokens,
  round(avg(latency_ms))          as avg_latency_ms
from public.ai_usage_events
group by 1, 2, 3;

commit;
