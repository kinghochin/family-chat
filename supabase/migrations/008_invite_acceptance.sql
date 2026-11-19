-- Ensure invited users become household members even when email confirmation is enabled.
-- Run after 007_member_lifecycle.sql.

create or replace function public.add_user_from_pending_invite(target_user uuid, target_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user is null or target_email is null then
    return false;
  end if;

  if not exists (
    select 1 from public.household_invites
    where lower(email) = lower(target_email)
      and accepted_at is null
  ) then
    return false;
  end if;

  insert into public.household_members (user_id, role, removed_at)
  values (target_user, 'member', null)
  on conflict (user_id) do update set removed_at = null, joined_at = now();

  update public.household_invites
  set accepted_at = now()
  where lower(email) = lower(target_email) and accepted_at is null;

  return true;
end;
$$;

grant execute on function public.add_user_from_pending_invite(uuid, text) to authenticated;

create or replace function public.accept_pending_invites_for_current_user()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
begin
  select email into current_email from auth.users where id = auth.uid();
  return public.add_user_from_pending_invite(auth.uid(), current_email);
end;
$$;

grant execute on function public.accept_pending_invites_for_current_user() to authenticated;

create or replace function public.handle_invited_user_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.add_user_from_pending_invite(new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_invite_membership on auth.users;
create trigger on_auth_user_invite_membership
after insert on auth.users
for each row execute function public.handle_invited_user_membership();
