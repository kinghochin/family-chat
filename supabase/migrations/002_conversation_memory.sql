-- Family conversation memory MVP additions
-- Run after 001_initial_schema.sql in the Supabase SQL editor.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_username text not null check (char_length(trim(sender_username)) > 0),
  content text not null check (char_length(trim(content)) > 0),
  source text not null default 'web' check (source in ('telegram', 'web', 'hermes')),
  source_message_id text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.topics
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz,
  add column if not exists selection_status text not null default 'manual' check (selection_status in ('manual', 'ai_suggested', 'confirmed'));

create table if not exists public.topic_messages (
  topic_id uuid not null references public.topics(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  selection_source text not null default 'manual' check (selection_source in ('manual', 'ai_suggested', 'confirmed')),
  created_at timestamptz not null default now(),
  primary key (topic_id, message_id)
);

create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  artifact_type text not null check (artifact_type in ('plan', 'checklist', 'summary', 'action_list')),
  title text not null check (char_length(trim(title)) > 0),
  content text not null default '',
  status text not null default 'suggested' check (status in ('suggested', 'confirmed', 'archived')),
  source_message_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists messages_sent_at_idx on public.messages(sent_at desc);
create index if not exists messages_source_idx on public.messages(source);
create index if not exists topic_messages_message_idx on public.topic_messages(message_id);
create index if not exists artifacts_topic_idx on public.artifacts(topic_id);

drop trigger if exists artifacts_touch_updated_at on public.artifacts;
create trigger artifacts_touch_updated_at before update on public.artifacts for each row execute function public.touch_updated_at();

alter table public.messages enable row level security;
alter table public.topic_messages enable row level security;
alter table public.artifacts enable row level security;

create policy "signed in users read messages" on public.messages for select to authenticated using (true);
create policy "signed in users create web messages" on public.messages for insert to authenticated with check (true);
create policy "users retain deleted messages" on public.messages for update to authenticated using (true) with check (true);

create policy "topic members read selected messages" on public.topic_messages for select to authenticated using (public.is_topic_member(topic_id));
create policy "topic editors manage selected messages" on public.topic_messages for all to authenticated using (public.has_topic_role(topic_id, array['owner','editor'])) with check (public.has_topic_role(topic_id, array['owner','editor']));

create policy "topic members read artifacts" on public.artifacts for select to authenticated using (public.is_topic_member(topic_id));
create policy "topic editors create artifacts" on public.artifacts for insert to authenticated with check (public.has_topic_role(topic_id, array['owner','editor']));
create policy "topic editors update artifacts" on public.artifacts for update to authenticated using (public.has_topic_role(topic_id, array['owner','editor'])) with check (public.has_topic_role(topic_id, array['owner','editor']));
create policy "topic editors archive artifacts" on public.artifacts for delete to authenticated using (public.has_topic_role(topic_id, array['owner','editor']));
