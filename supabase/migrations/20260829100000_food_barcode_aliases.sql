begin;

-- A packaged food can have several valid UPC/EAN representations (for example
-- a 12-digit UPC and its zero-prefixed 13-digit EAN). Keep those aliases
-- separate from foods.barcode so every successful lookup becomes reusable.
create table if not exists public.food_barcode_aliases (
  barcode text primary key check (barcode ~ '^[0-9]{8,18}$'),
  food_id uuid not null references public.foods(id) on delete cascade,
  source text not null default 'catalog',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists food_barcode_aliases_food_idx on public.food_barcode_aliases(food_id);
alter table public.food_barcode_aliases enable row level security;
drop policy if exists food_barcode_aliases_read on public.food_barcode_aliases;
create policy food_barcode_aliases_read on public.food_barcode_aliases for select using (true);

insert into public.food_barcode_aliases (barcode, food_id, source)
select barcode, id, source_id from public.foods
where barcode is not null and barcode ~ '^[0-9]{8,18}$'
on conflict (barcode) do update set food_id = excluded.food_id, updated_at = now();

commit;
