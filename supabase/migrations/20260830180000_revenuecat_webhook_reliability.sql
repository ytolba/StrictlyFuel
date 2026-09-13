begin;

create table if not exists public.revenuecat_webhook_events (
  event_id text primary key,
  event_type text not null,
  app_user_id text,
  event_timestamp timestamptz,
  status text not null check (status in ('received', 'processed', 'ignored', 'failed')),
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists revenuecat_webhook_events_received_idx
  on public.revenuecat_webhook_events (received_at desc);

alter table public.revenuecat_webhook_events enable row level security;

-- No client policies: only the service-role webhook may read or write delivery records.

alter table public.user_subscriptions
  add column if not exists last_event_id text;

commit;
