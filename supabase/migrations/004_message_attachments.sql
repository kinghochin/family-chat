-- Message attachment storage for the family inbox.
-- Run after 003_auth_profiles.sql in the Supabase SQL editor.

alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', false)
on conflict (id) do nothing;

create policy "signed in users upload message attachments"
on storage.objects for insert to authenticated
with check (bucket_id = 'message-attachments' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "signed in users read message attachments"
on storage.objects for select to authenticated
using (bucket_id = 'message-attachments');

create policy "users delete their message attachments"
on storage.objects for delete to authenticated
using (bucket_id = 'message-attachments' and owner_id = (select auth.uid()));
