-- Enable Realtime status updates for Hermes topic-selection callbacks.
-- Run after 011_topic_selection_requests.sql.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'topic_selection_requests'
  ) then
    alter publication supabase_realtime add table public.topic_selection_requests;
  end if;
end
$$;
