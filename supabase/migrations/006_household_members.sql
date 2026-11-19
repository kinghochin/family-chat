-- Household member management and shareable invitations.
-- Run after 005_household_settings.sql in the Supabase SQL editor.

create table if not exists public.household_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now()
);

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(trim(email)) > 3),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;

create policy "signed in users read household members"
on public.household_members for select to authenticated using (true);

create policy "signed in users read household invites"
on public.household_invites for select to authenticated using (true);

create policy "signed in users create household invites"
on public.household_invites for insert to authenticated with check (invited_by = auth.uid());

insert into public.household_members (user_id, role)
select id, 'owner' from auth.users
where not exists (select 1 from public.household_members);
