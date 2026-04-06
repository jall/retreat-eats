-- ============================================================
-- Migration 005: User profiles + avatar storage
--
--   1. Create `profiles` table keyed by user_id, readable by any
--      authenticated user so retreat members can see each other's
--      avatars. Writable only by the row owner.
--   2. Create a public `avatars` storage bucket and policies so
--      users can upload/replace their own avatar image.
-- ============================================================

-- --------------------------------------------------------
-- 1. profiles table
-- --------------------------------------------------------
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  avatar_url text,
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select to authenticated
  using (true);

drop policy if exists "profiles_insert" on profiles;
create policy "profiles_insert" on profiles
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "profiles_delete" on profiles;
create policy "profiles_delete" on profiles
  for delete to authenticated
  using (user_id = auth.uid());

-- --------------------------------------------------------
-- 2. Avatars storage bucket
-- --------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Each user gets their own folder keyed by user_id. Object path
-- format: {user_id}/{filename}.
-- Policies are keyed on the first path segment matching auth.uid().

drop policy if exists "avatars_select" on storage.objects;
create policy "avatars_select" on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert" on storage.objects;
create policy "avatars_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update" on storage.objects;
create policy "avatars_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete" on storage.objects;
create policy "avatars_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
