begin;

-- Only the trusted publishing function may make a community post visible.
alter table public.fuel_posts
  add column moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'needs_review', 'rejected')),
  add column moderation_checked_at timestamptz,
  add column photo_path text;

alter table public.fuel_posts alter column is_public set default false;

-- Older posts have never passed image review. Hide them until reviewed.
update public.fuel_posts set is_public = false, moderation_status = 'pending'
where is_public = true;

alter table public.fuel_posts add constraint public_posts_must_be_approved
  check (not is_public or moderation_status = 'approved');

drop policy if exists "Users create posts from own meals" on public.fuel_posts;
drop policy if exists "Users update own posts" on public.fuel_posts;
revoke insert, update on public.fuel_posts from anon, authenticated;

create index fuel_posts_moderation_queue_idx
  on public.fuel_posts (created_at) where moderation_status = 'needs_review';

create table public.community_moderation_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index community_moderation_attempts_user_time_idx
  on public.community_moderation_attempts (user_id, created_at desc);
alter table public.community_moderation_attempts enable row level security;
revoke all on public.community_moderation_attempts from anon, authenticated;

-- Photos in this bucket are written only by the publishing function, after review.
-- Public reads are safe because unreviewed uploads are never placed here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-images', 'community-images', true, 5242880, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-review', 'community-review', false, 5242880, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
