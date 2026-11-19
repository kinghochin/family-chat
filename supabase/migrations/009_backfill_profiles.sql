-- Backfill profiles for accounts created before the profile trigger/membership flow.
-- Run after 008_invite_acceptance.sql.

insert into public.profiles (id, display_name)
select
  id,
  coalesce(nullif(trim(raw_user_meta_data ->> 'display_name'), ''), split_part(email, '@', 1), 'Family member')
from auth.users
on conflict (id) do update
set display_name = excluded.display_name
where public.profiles.display_name is null
   or trim(public.profiles.display_name) = '';
