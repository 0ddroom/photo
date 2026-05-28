create extension if not exists pgcrypto;

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size integer not null,
  recommendation_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint photos_nickname_length check (char_length(trim(nickname)) between 1 and 40),
  constraint photos_storage_path_check check (storage_path like 'uploads/%'),
  constraint photos_mime_type_check check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint photos_file_size_check check (file_size > 0 and file_size <= 5242880),
  constraint photos_recommendation_count_check check (recommendation_count >= 0)
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz not null default now(),
  constraint recommendations_visitor_length check (char_length(visitor_id) between 8 and 128),
  constraint recommendations_unique_photo_visitor unique (photo_id, visitor_id)
);

create index if not exists photos_recommendation_sort_idx
  on public.photos (recommendation_count desc, created_at desc);

create index if not exists recommendations_visitor_idx
  on public.recommendations (visitor_id);

alter table public.photos enable row level security;
alter table public.recommendations enable row level security;

drop policy if exists "Anyone can read photos" on public.photos;
create policy "Anyone can read photos"
  on public.photos
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Guests can insert valid photos" on public.photos;
create policy "Guests can insert valid photos"
  on public.photos
  for insert
  to anon, authenticated
  with check (
    char_length(trim(nickname)) between 1 and 40
    and storage_path like 'uploads/%'
    and mime_type in ('image/jpeg', 'image/png', 'image/webp')
    and file_size > 0
    and file_size <= 5242880
    and recommendation_count = 0
  );

grant usage on schema public to anon, authenticated;
grant select, insert on public.photos to anon, authenticated;
revoke all on public.recommendations from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-photos',
  'event-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view gallery files" on storage.objects;
create policy "Anyone can view gallery files"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'event-photos');

drop policy if exists "Guests can upload gallery files" on storage.objects;
create policy "Guests can upload gallery files"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'event-photos'
    and (storage.foldername(name))[1] = 'uploads'
  );

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated;

create or replace function app_private.recommend_photo(
  p_photo_id uuid,
  p_visitor_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  existing_count integer;
  inserted_id uuid;
  updated_count integer;
begin
  if p_visitor_id is null or char_length(p_visitor_id) < 8 or char_length(p_visitor_id) > 128 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_visitor');
  end if;

  perform pg_advisory_xact_lock(hashtext(p_visitor_id));

  select count(*)
  into existing_count
  from public.recommendations
  where visitor_id = p_visitor_id;

  if existing_count >= 3 then
    return jsonb_build_object('ok', false, 'reason', 'limit_reached');
  end if;

  insert into public.recommendations (photo_id, visitor_id)
  values (p_photo_id, p_visitor_id)
  on conflict (photo_id, visitor_id) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return jsonb_build_object('ok', false, 'reason', 'already_recommended');
  end if;

  update public.photos
  set recommendation_count = recommendation_count + 1
  where id = p_photo_id
  returning recommendation_count into updated_count;

  return jsonb_build_object('ok', true, 'recommendation_count', updated_count);
exception
  when foreign_key_violation then
    return jsonb_build_object('ok', false, 'reason', 'photo_not_found');
end;
$$;

create or replace function public.recommend_photo(
  p_photo_id uuid,
  p_visitor_id text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog
as $$
  select app_private.recommend_photo(p_photo_id, p_visitor_id);
$$;

grant execute on function app_private.recommend_photo(uuid, text) to anon, authenticated;
grant execute on function public.recommend_photo(uuid, text) to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'photos'
    ) then
    alter publication supabase_realtime add table public.photos;
  end if;
end $$;
