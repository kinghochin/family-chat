-- Real household member lifecycle: accept, edit, and remove members.
-- Run after 006_household_members.sql.

alter table public.household_members
  add column if not exists removed_at timestamptz;

create index if not exists household_members_active_idx
  on public.household_members (removed_at, joined_at);

create or replace function public.is_household_owner()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where user_id = auth.uid()
      and role = 'owner'
      and removed_at is null
  );
$$;

drop policy if exists "signed in users read household members" on public.household_members;
create policy "active users read household members"
on public.household_members for select to authenticated
using (removed_at is null);

create or replace function public.accept_household_invite(invite_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  invite_email text;
begin
  select lower(email) into current_email from auth.users where id = auth.uid();
  select lower(email) into invite_email
  from public.household_invites
  where token = invite_token and accepted_at is null;

  if current_email is null or invite_email is null or current_email <> invite_email then
    return false;
  end if;

  insert into public.household_members (user_id, role, removed_at)
  values (auth.uid(), 'member', null)
  on conflict (user_id) do update set removed_at = null, joined_at = now();

  update public.household_invites
  set accepted_at = now()
  where token = invite_token and accepted_at is null;

  return true;
end;
$$;

grant execute on function public.accept_household_invite(uuid) to authenticated;

drop function if exists public.update_household_member(uuid, text);
create function public.update_household_member(target_user uuid, new_display_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_household_owner() then
    return false;
  end if;
  if trim(coalesce(new_display_name, '')) = '' or char_length(trim(new_display_name)) > 80 then
    return false;
  end if;
  if not exists (select 1 from public.household_members where user_id = target_user and removed_at is null) then
    return false;
  end if;

  update public.profiles
  set display_name = trim(new_display_name)
  where id = target_user;
  return found;
end;
$$;

grant execute on function public.update_household_member(uuid, text) to authenticated;

drop function if exists public.remove_household_member(uuid);
create function public.remove_household_member(target_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_household_owner() or target_user = auth.uid() then
    return false;
  end if;

  update public.household_members
  set removed_at = now()
  where user_id = target_user and removed_at is null;
  return found;
end;
$$;

grant execute on function public.remove_household_member(uuid) to authenticated;
