-- Gallery photos table for event images
create extension if not exists pgcrypto;

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  file_name text not null,
  file_url text not null,
  uploaded_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gallery_photos_created_at
on public.gallery_photos (created_at desc);

create or replace function public.set_gallery_photos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_gallery_photos_updated_at on public.gallery_photos;

create trigger trg_set_gallery_photos_updated_at
before update on public.gallery_photos
for each row
execute function public.set_gallery_photos_updated_at();

alter table public.gallery_photos enable row level security;

drop policy if exists gallery_admin_all on public.gallery_photos;
create policy gallery_admin_all
on public.gallery_photos
for all
using (
  auth.jwt() ->> 'role' = 'admin'
  or (select role from public.users where id = auth.uid()) = 'admin'
)
with check (
  auth.jwt() ->> 'role' = 'admin'
  or (select role from public.users where id = auth.uid()) = 'admin'
);

drop policy if exists gallery_authenticated_select on public.gallery_photos;
create policy gallery_authenticated_select
on public.gallery_photos
for select
using (
  (select role from public.users where id = auth.uid()) in ('admin', 'teacher', 'student')
);
