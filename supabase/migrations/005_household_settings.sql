-- Shared household/group details for the one-household MVP.
-- Run after 004_message_attachments.sql in the Supabase SQL editor.

create table if not exists public.household_settings (
  id boolean primary key default true check (id = true),
  name text not null default 'The Harris family' check (char_length(trim(name)) > 0),
  description text not null default 'One shared family memory.' check (char_length(trim(description)) > 0),
  avatar_label text not null default 'H' check (char_length(trim(avatar_label)) between 1 and 2),
  updated_at timestamptz not null default now()
);

insert into public.household_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.household_settings enable row level security;

create policy "signed in users read household settings"
on public.household_settings for select to authenticated using (true);

create policy "signed in users update household settings"
on public.household_settings for update to authenticated using (true) with check (true);

drop trigger if exists household_settings_touch_updated_at on public.household_settings;
create trigger household_settings_touch_updated_at
before update on public.household_settings
for each row execute function public.touch_updated_at();
