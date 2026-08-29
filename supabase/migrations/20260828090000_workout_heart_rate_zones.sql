alter table public.workouts
  add column if not exists heart_rate_zones smallint[] not null default '{}';

alter table public.workouts
  drop constraint if exists workouts_heart_rate_zones_valid;

alter table public.workouts
  add constraint workouts_heart_rate_zones_valid check (
    heart_rate_zones <@ array[1,2,3,4,5]::smallint[]
  );

comment on column public.workouts.heart_rate_zones is
  'Optional planned HR zones. Multiple values represent interval or mixed-zone sessions.';
