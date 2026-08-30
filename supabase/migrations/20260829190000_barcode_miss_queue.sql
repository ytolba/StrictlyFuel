begin;

-- Private operations queue for barcodes that neither Open Food Facts nor USDA
-- can currently resolve. Repeated scans raise priority without creating one
-- row per user or retaining who scanned the product.
create table if not exists public.food_barcode_misses (
  barcode text primary key check (barcode ~ '^[0-9]{8,18}$'),
  scan_count integer not null default 1 check (scan_count > 0),
  status text not null default 'unresolved' check (status in ('unresolved', 'resolved', 'ignored')),
  resolved_food_id uuid references public.foods(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists food_barcode_misses_priority_idx
  on public.food_barcode_misses (status, scan_count desc, last_seen_at desc);

alter table public.food_barcode_misses enable row level security;

create or replace function public.record_food_barcode_miss(p_barcode text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_barcode !~ '^[0-9]{8,18}$' then return; end if;
  insert into public.food_barcode_misses (barcode)
  values (p_barcode)
  on conflict (barcode) do update
    set scan_count = public.food_barcode_misses.scan_count + 1,
        last_seen_at = now();
end;
$$;

revoke all on function public.record_food_barcode_miss(text) from public, anon, authenticated;
grant execute on function public.record_food_barcode_miss(text) to service_role;

commit;
