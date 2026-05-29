-- Add PDF attachment support to notifications

alter table public.notifications
  add column if not exists attachment_files jsonb;

update public.notifications
set attachment_files = '[]'::jsonb
where attachment_files is null;

create index if not exists idx_notifications_attachment_files
on public.notifications
using gin (attachment_files);
