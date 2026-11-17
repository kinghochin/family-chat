# Trip Research Organiser Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a collaborative Next.js and Supabase web application where users create topics such as trip plans, collect links/places/notes/photos/recommendations, and organise them by drag and drop.

**Architecture:** Use Next.js App Router with TypeScript for the web application, Supabase Auth/Postgres/Storage for backend services, and `dnd-kit` for accessible drag-and-drop interactions. The MVP will use manual capture first, with Instagram/Threads ingestion treated as a later adapter because private-message access and platform policies create substantial technical and product risk.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Supabase Auth, Supabase Postgres, Supabase Storage, `@dnd-kit/core`, `@dnd-kit/sortable`, Zod, React Hook Form, Vitest, Testing Library, and Playwright.

---

## 1. Product definition

### Core user journey

1. Sign up or sign in.
2. Create a topic, for example `Japan Trip — October 2027`.
3. Add research items through a URL, pasted text, image, or manual note.
4. The app creates an item card with title, URL, source, preview metadata, category, and notes.
5. Drag items between collections such as `Inbox`, `Tokyo`, `Kyoto`, `Restaurants`, and `Maybe Later`.
6. Reorder items within a collection.
7. Add collaborators to the topic.
8. Convert selected items into a day-based itinerary later.

### MVP boundary

Build these first:

- Authentication.
- Topic creation, editing, archiving, and deletion.
- Collections inside a topic.
- Research-item creation and editing.
- URL metadata preview where available.
- Drag and drop between collections and within a collection.
- Supabase Row Level Security.
- Basic responsive UI.
- Audit-friendly ordering and ownership fields.

Defer these until the core workflow is validated:

- Automatic Instagram and Threads message scraping.
- Browser extension.
- AI summarisation and duplicate detection.
- Google Maps API integration.
- Calendar export.
- Real-time collaborative cursors.
- Public sharing.
- Monetisation and team billing.

### Important product decision

The application should not depend on access to private Instagram or Threads messages for the MVP. Users should be able to paste a URL, paste message text, upload a screenshot, or use a future browser extension. This keeps the first release useful even when Meta access changes or private-message automation is unavailable.

---

## 2. Proposed information architecture

```text
User
└── Topic / trip plan
    ├── Members
    ├── Collections
    │   ├── Inbox
    │   ├── Destination or day groups
    │   └── Custom groups
    ├── Research items
    │   ├── URL
    │   ├── Place
    │   ├── Note
    │   ├── Image
    │   └── Imported message
    └── Activity history
```

Recommended initial screens:

- `/` — authenticated user’s topics.
- `/topics/new` — create topic.
- `/topics/[topicId]` — board view with collections and draggable cards.
- `/topics/[topicId]/settings` — topic name, members, archive/delete.
- `/topics/[topicId]/items/[itemId]` — detailed item editor.
- `/auth/sign-in` and `/auth/sign-up` — authentication.

The main board should be useful without forcing users into a calendar view. A day-based itinerary can be added as another view over the same ordered collections later.

---

## 3. Database design

Create Supabase migrations under `supabase/migrations/`.

### `profiles`

- `id uuid primary key references auth.users(id)`
- `display_name text`
- `avatar_url text`
- `created_at timestamptz not null default now()`

### `topics`

- `id uuid primary key default gen_random_uuid()`
- `owner_id uuid not null references profiles(id)`
- `name text not null`
- `description text`
- `cover_image_path text`
- `status text not null default 'active' check (status in ('active', 'archived'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `topic_members`

- `topic_id uuid not null references topics(id) on delete cascade`
- `user_id uuid not null references profiles(id) on delete cascade`
- `role text not null check (role in ('owner', 'editor', 'viewer'))`
- `created_at timestamptz not null default now()`
- primary key `(topic_id, user_id)`

### `collections`

- `id uuid primary key default gen_random_uuid()`
- `topic_id uuid not null references topics(id) on delete cascade`
- `name text not null`
- `collection_type text not null default 'custom' check (collection_type in ('inbox', 'destination', 'day', 'category', 'custom'))`
- `position numeric not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Use fractional or gap-based ordering for collections so moving one collection does not require rewriting every row.

### `research_items`

- `id uuid primary key default gen_random_uuid()`
- `topic_id uuid not null references topics(id) on delete cascade`
- `collection_id uuid not null references collections(id) on delete cascade`
- `created_by uuid not null references profiles(id)`
- `item_type text not null check (item_type in ('link', 'place', 'note', 'image', 'message'))`
- `title text not null`
- `description text`
- `url text`
- `source_platform text check (source_platform in ('manual', 'instagram', 'threads', 'web', 'upload'))`
- `source_author text`
- `source_message text`
- `metadata jsonb not null default '{}'::jsonb`
- `image_path text`
- `position numeric not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

The `metadata` object can hold preview data, address, coordinates, price range, opening hours, tags, and future extractor output without prematurely over-normalising every field.

### `activity_events`

- `id uuid primary key default gen_random_uuid()`
- `topic_id uuid not null references topics(id) on delete cascade`
- `actor_id uuid not null references profiles(id)`
- `event_type text not null`
- `entity_type text not null`
- `entity_id uuid`
- `payload jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Use this for basic history and debugging, not as the primary source of current state.

### Required database safeguards

- Add indexes on `topic_members.user_id`, `collections.topic_id`, `research_items.topic_id`, `research_items.collection_id`, and `research_items.updated_at`.
- Add an `updated_at` trigger to mutable tables.
- Add a unique constraint preventing duplicate collection names within a topic if that is part of the UX decision.
- Add database checks for non-empty names and valid positions.
- Create RLS policies so users can only read or modify topics where they are members, with editor/owner checks for writes.
- Never expose the Supabase service-role key to the browser.

---

## 4. Application structure

Use this initial structure:

```text
app/
  (auth)/sign-in/page.tsx
  (auth)/sign-up/page.tsx
  (dashboard)/page.tsx
  (dashboard)/topics/new/page.tsx
  (dashboard)/topics/[topicId]/page.tsx
  (dashboard)/topics/[topicId]/settings/page.tsx
  api/metadata/route.ts
components/
  topics/topic-card.tsx
  topics/topic-form.tsx
  board/board.tsx
  board/collection-column.tsx
  board/research-item-card.tsx
  board/item-editor.tsx
  board/create-item-dialog.tsx
  board/drag-overlay-card.tsx
  shared/empty-state.tsx
  shared/loading-state.tsx
lib/
  supabase/browser.ts
  supabase/server.ts
  supabase/middleware.ts
  topics/queries.ts
  topics/mutations.ts
  items/queries.ts
  items/mutations.ts
  board/reorder.ts
  validation/schemas.ts
  metadata/parse.ts
  permissions.ts
types/
  database.ts
supabase/
  migrations/001_initial_schema.sql
  migrations/002_rls_policies.sql
  seed.sql
tests/
  unit/reorder.test.ts
  unit/validation.test.ts
  integration/topics.test.ts
  e2e/topic-board.spec.ts
```

Keep database reads and writes behind server-side functions or route handlers where practical. Use Supabase browser clients only for authenticated client-side interactions that genuinely need them.

---

## 5. Drag-and-drop design

Use `dnd-kit` rather than implementing pointer events from scratch.

### Required interactions

- Drag a card within the same collection to reorder it.
- Drag a card to another collection.
- Show a drag overlay so the card remains readable while moving.
- Support keyboard dragging and visible focus states.
- Persist the move only after the drop completes.
- Optimistically update the UI, then roll back if the database request fails.
- Prevent edits by viewers.
- Handle deleted or stale cards gracefully if two users edit the same topic.

### Ordering algorithm

Implement a pure function in `lib/board/reorder.ts`:

- Input: item ID, source collection, destination collection, source index, destination index, and current ordered items.
- Output: the updated local board plus the minimal persistence payload.
- Use a gap/fractional position between neighbouring positions.
- If the gap becomes too small, schedule a collection-specific reindex transaction.

Test same-column moves, cross-column moves, first/last positions, empty collections, invalid IDs, and rollback behaviour.

---

## 6. Adding research items

### Manual item flow

The create-item dialog should support:

- Paste URL.
- Paste text/message.
- Add a note.
- Upload an image.
- Choose item type and collection.

For a URL:

1. Create the item immediately with the pasted URL and a safe fallback title.
2. Call `POST /api/metadata` asynchronously.
3. Fetch only permitted public page metadata.
4. Update title, description, preview image, and site name if available.
5. Keep the original URL and user-entered text unchanged.
6. If metadata fetch fails, preserve the item and show a non-blocking warning.

Do not build arbitrary server-side URL fetching without protections. Validate protocols, block localhost/private IP ranges, enforce response-size and timeout limits, and avoid executing arbitrary page JavaScript in the metadata route.

### Future import adapters

Design an adapter interface, but do not implement private-message scraping in the MVP:

```ts
export interface ResearchImportAdapter {
  source: 'instagram' | 'threads' | 'browser_extension' | 'manual';
  import(input: unknown): Promise<ImportedResearchItem[]>;
}
```

Future options include a browser extension that lets a user explicitly save the current message/page, or an export-based importer. Avoid storing platform credentials in this application.

---

## 7. Authentication and permissions

Implement Supabase email/password authentication first. Add OAuth only after the core workflow works.

Permission model:

- `owner`: manage topic, members, collections, and items.
- `editor`: create/update/reorder items and collections.
- `viewer`: read-only access.

Acceptance criteria:

- An unauthenticated user cannot access the board.
- A user cannot read another user’s private topic by changing a URL.
- A viewer cannot update a topic, collection, or item through the UI or direct API request.
- RLS tests cover owner, editor, viewer, non-member, and deleted-topic cases.

---

## 8. User experience and visual direction

The board should feel like a calm research inbox rather than a complex project-management tool.

MVP layout:

- Left sidebar: topic name, views, settings.
- Main area: horizontally scrollable collection columns.
- Item card: thumbnail, title, source badge, short description, and quick actions.
- Top bar: add item, search, invite, and view switcher.
- Mobile: collections become a selectable tab or stacked list; drag-and-drop remains usable with touch.

Use clear empty states:

- `Inbox is empty — paste a link or add a note.`
- `No items in this day yet.`
- `You have no topics — create your first trip plan.`

Avoid calendar complexity until users demonstrate that day-based planning is the primary workflow.

---

## 9. Testing and verification

### Unit tests

- Zod validation for topic and item forms.
- Position calculation and reorder logic.
- Permission helper functions.
- URL safety validation.
- Metadata parsing with missing, malformed, and oversized fields.

### Integration tests

- Create a topic and default Inbox collection.
- Add a research item.
- Move an item between collections.
- Reorder items.
- Archive a topic.
- Verify RLS for all roles.

### End-to-end tests with Playwright

1. Sign up a test user.
2. Create `Japan Trip`.
3. Add at least three links and one note.
4. Create `Tokyo`, `Kyoto`, and `Restaurants` collections.
5. Drag items into collections and reorder them.
6. Reload and verify order persists.
7. Open the same topic as a viewer and verify editing is disabled.
8. Test mobile viewport and keyboard navigation.

### Quality gates

- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- Verify RLS using a non-service-role Supabase client.
- Verify no secret appears in client bundles.
- Verify URL metadata fetching cannot access local/private network addresses.

---

## 10. Delivery sequence

### Phase 0 — validate the workflow

- Create a low-fidelity board prototype.
- Test with 3–5 real trip plans.
- Measure whether users prefer collections, tags, or day columns.
- Confirm the minimum useful item fields.

### Phase 1 — foundation

- Create Next.js project and environment configuration.
- Configure Supabase project and migrations.
- Implement authentication and profiles.
- Add RLS and seed data.

### Phase 2 — topic and board MVP

- Implement topic list and topic creation.
- Implement collections and default Inbox.
- Implement item creation/editing.
- Implement drag-and-drop and persistence.
- Add responsive layout.

### Phase 3 — research capture

- Add URL metadata preview.
- Add screenshot/image upload.
- Add search and filtering.
- Add activity history.
- Add topic sharing and member roles.

### Phase 4 — itinerary view

- Add day collections or a day-view projection.
- Add dates, time windows, and travel notes.
- Add map links without requiring a maps API initially.
- Add export to Markdown or calendar format.

### Phase 5 — intelligent imports

- Build explicit browser-extension capture.
- Evaluate export-based Instagram/Threads import.
- Add optional AI classification and summarisation only after collecting real item data.
- Use structured output and human confirmation for extracted locations, dates, and recommendations.

---

## 11. Risks and trade-offs

### Meta platform access

Private Instagram and Threads messages are the largest risk. Do not make the product promise unrestricted message search until an approved, stable access method exists. A browser extension or user-provided export is safer than storing Meta credentials or attempting brittle automation.

### Drag-and-drop complexity

Drag-and-drop can become unusable on mobile and for keyboard users. Use `dnd-kit`, preserve keyboard support, and provide move-to-collection controls as a non-drag fallback.

### Ordering conflicts

Two users can move the same item simultaneously. Use `updated_at` or a lightweight version field, return a conflict response, refresh the affected collection, and allow the user to retry.

### Premature AI

Do not begin with automatic AI extraction. First collect the actual types of links, messages, places, and notes users save. Then add deterministic parsing and AI only where repeated manual work is proven.

### Scope control

The first valuable product is a shared research organiser with excellent capture and organisation. It is not yet a complete travel planner, social-network scraper, map engine, or AI agent.

---

## 12. MVP acceptance criteria

The MVP is complete when a new user can:

- Sign up and sign in.
- Create a trip topic.
- See a default Inbox collection.
- Create custom collections.
- Add a URL, note, pasted message, and image.
- Edit and delete items.
- Drag items between collections.
- Reorder items within a collection.
- Reload the page and retain the correct order.
- Invite another user as viewer or editor.
- Use the board on desktop and mobile.
- Never expose another user’s private topic through direct requests.

The team should not start Instagram/Threads automation until these criteria work reliably and the product has been tested with real trip research.
