-- Gatherly MVP schema for Supabase
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.topic_members (
  topic_id uuid not null references public.topics(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (topic_id, user_id)
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  collection_type text not null default 'custom' check (collection_type in ('inbox', 'destination', 'day', 'category', 'custom')),
  position numeric not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_items (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  item_type text not null check (item_type in ('link', 'place', 'note', 'image', 'message')),
  title text not null check (char_length(trim(title)) > 0),
  description text,
  url text,
  source_platform text check (source_platform in ('manual', 'instagram', 'threads', 'web', 'upload')),
  source_author text,
  source_message text,
  metadata jsonb not null default '{}'::jsonb,
  image_path text,
  position numeric not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists topic_members_user_idx on public.topic_members(user_id);
create index if not exists collections_topic_idx on public.collections(topic_id);
create index if not exists research_items_topic_idx on public.research_items(topic_id);
create index if not exists research_items_collection_idx on public.research_items(collection_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists topics_touch_updated_at on public.topics;
create trigger topics_touch_updated_at before update on public.topics for each row execute function public.touch_updated_at();
drop trigger if exists collections_touch_updated_at on public.collections;
create trigger collections_touch_updated_at before update on public.collections for each row execute function public.touch_updated_at();
drop trigger if exists research_items_touch_updated_at on public.research_items;
create trigger research_items_touch_updated_at before update on public.research_items for each row execute function public.touch_updated_at();

create or replace function public.is_topic_member(target_topic uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.topic_members where topic_id = target_topic and user_id = auth.uid());
$$;

create or replace function public.has_topic_role(target_topic uuid, allowed_roles text[])
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.topic_members where topic_id = target_topic and user_id = auth.uid() and role = any(allowed_roles));
$$;

alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.topic_members enable row level security;
alter table public.collections enable row level security;
alter table public.research_items enable row level security;

create policy "profiles are visible to signed in users" on public.profiles for select to authenticated using (true);
create policy "users manage their profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "members can read topics" on public.topics for select to authenticated using (public.is_topic_member(id));
create policy "users create topics" on public.topics for insert to authenticated with check (owner_id = auth.uid());
create policy "owners update topics" on public.topics for update to authenticated using (public.has_topic_role(id, array['owner'])) with check (public.has_topic_role(id, array['owner']));
create policy "owners delete topics" on public.topics for delete to authenticated using (public.has_topic_role(id, array['owner']));
create policy "members read topic members" on public.topic_members for select to authenticated using (public.is_topic_member(topic_id));
create policy "owners manage topic members" on public.topic_members for all to authenticated using (public.has_topic_role(topic_id, array['owner'])) with check (public.has_topic_role(topic_id, array['owner']));
create policy "members read collections" on public.collections for select to authenticated using (public.is_topic_member(topic_id));
create policy "editors manage collections" on public.collections for all to authenticated using (public.has_topic_role(topic_id, array['owner','editor'])) with check (public.has_topic_role(topic_id, array['owner','editor']));
create policy "members read research items" on public.research_items for select to authenticated using (public.is_topic_member(topic_id));
create policy "editors manage research items" on public.research_items for all to authenticated using (public.has_topic_role(topic_id, array['owner','editor'])) with check (public.has_topic_role(topic_id, array['owner','editor']));

-- Fix the intentional SQL keyword spacing if this file is pasted into the dashboard.
