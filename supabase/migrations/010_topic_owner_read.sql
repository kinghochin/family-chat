-- Allow topic owners to read topics they created.
-- Run after 009_backfill_profiles.sql.

create policy "owners read their topics"
on public.topics for select to authenticated
using (owner_id = auth.uid());
