-- AI-assisted topic message selection. Run after 010_topic_owner_read.sql.

create table if not exists public.topic_selection_requests (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  candidate_count integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.topic_selection_requests
  add column if not exists callback_token_hash text;

create table if not exists public.topic_message_suggestions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.topic_selection_requests(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  relevance_score numeric check (relevance_score >= 0 and relevance_score <= 1),
  rationale text not null default '',
  status text not null default 'suggested' check (status in ('suggested', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  unique (request_id, message_id)
);

create index if not exists topic_selection_requests_topic_idx on public.topic_selection_requests(topic_id, created_at desc);
create index if not exists topic_message_suggestions_request_idx on public.topic_message_suggestions(request_id);

alter table public.topic_selection_requests enable row level security;
alter table public.topic_message_suggestions enable row level security;

drop policy if exists "topic owners read selection requests" on public.topic_selection_requests;
create policy "topic owners read selection requests"
on public.topic_selection_requests for select to authenticated
using (exists (select 1 from public.topics where id = topic_id and owner_id = auth.uid()) or public.has_topic_role(topic_id, array['owner','editor']));

drop policy if exists "topic owners create selection requests" on public.topic_selection_requests;
create policy "topic owners create selection requests"
on public.topic_selection_requests for insert to authenticated
with check (requested_by = auth.uid() and (exists (select 1 from public.topics where id = topic_id and owner_id = auth.uid()) or public.has_topic_role(topic_id, array['owner','editor'])));

drop policy if exists "topic owners read suggestions" on public.topic_message_suggestions;
create policy "topic owners read suggestions"
on public.topic_message_suggestions for select to authenticated
using (exists (select 1 from public.topics where id = topic_id and owner_id = auth.uid()) or public.has_topic_role(topic_id, array['owner','editor']));

drop policy if exists "topic owners confirm suggestions" on public.topic_message_suggestions;
create policy "topic owners confirm suggestions"
on public.topic_message_suggestions for update to authenticated
using (exists (select 1 from public.topics where id = topic_id and owner_id = auth.uid()) or public.has_topic_role(topic_id, array['owner','editor']))
with check (exists (select 1 from public.topics where id = topic_id and owner_id = auth.uid()) or public.has_topic_role(topic_id, array['owner','editor']));

drop policy if exists "topic owners read selected messages" on public.topic_messages;
create policy "topic owners read selected messages"
on public.topic_messages for select to authenticated
using (exists (select 1 from public.topics where id = topic_id and owner_id = auth.uid()) or public.has_topic_role(topic_id, array['owner','editor','viewer']));

drop policy if exists "topic owners insert selected messages" on public.topic_messages;
create policy "topic owners insert selected messages"
on public.topic_messages for insert to authenticated
with check (exists (select 1 from public.topics where id = topic_id and owner_id = auth.uid()) or public.has_topic_role(topic_id, array['owner','editor']));

drop policy if exists "topic owners remove selected messages" on public.topic_messages;
create policy "topic owners remove selected messages"
on public.topic_messages for delete to authenticated
using (exists (select 1 from public.topics where id = topic_id and owner_id = auth.uid()) or public.has_topic_role(topic_id, array['owner','editor']));
