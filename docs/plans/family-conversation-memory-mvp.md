# Family Conversation Memory MVP Plan

> **For Hermes:** Use this plan to implement the MVP task-by-task with strict TDD for application behavior.

**Product name:** Family Chat / Gatherly MVP

**Goal:** Create a shared family conversation memory system that receives messages from a Telegram group and a web input box, stores every message with its sender, lets family members retrospectively select related messages to create a topic, and generates useful summaries, decisions, tasks, and open questions.

**Primary example:** A family discusses a Japan trip over many days without creating a thread. Later, a family member selects the relevant messages, creates `Japan trip`, and receives an organised summary and optional trip-planning view.

**Tech stack:** Next.js App Router, TypeScript, Supabase Auth/Postgres/Storage, Telegram Bot API, Pydantic-equivalent TypeScript validation with Zod, structured LLM provider adapter, `dnd-kit` for the optional trip board, Vitest/Testing Library, and Playwright.

---

## 1. Confirmed product decisions

- Telegram bot is a member of the family group.
- The owner may also send messages to Hermes Agent as an alternative ingestion route, but the MVP must have a clear message-ingestion adapter rather than special-case logic.
- Family members use username-only identity for the MVP.
- MVP supports one household/family only.
- Every family member can see every stored message.
- Summaries support all three modes:
  - On-demand when a user clicks **Summarise**.
  - Automatically when a topic is created.
  - Periodic refresh when new messages are added to the topic.
- Topic creation starts with manual selection of historical messages.
- Deleted messages are retained in the database as historical records. They are marked deleted/tombstoned rather than physically removed.
- Voice messages are deferred from the MVP.
- Users do not need to choose a topic before sending a message.
- A message belongs to the household first and can be linked to one or more topics later.

---

## 2. Product thesis

The product is not primarily a chat replacement. Telegram remains a familiar capture channel. The web application becomes the family’s memory, organisation, and decision layer.

```text
Talk naturally first
        ↓
Store every message in the household inbox
        ↓
Select related history after the discussion
        ↓
Create a topic
        ↓
Summarise decisions, tasks and open questions
        ↓
Keep the topic useful as new messages arrive
```

The MVP should optimise for:

1. Zero-friction capture.
2. Complete and trustworthy message history.
3. Easy retrospective topic creation.
4. Summaries that distinguish facts, decisions, tasks and uncertainty.
5. Visible source messages behind every summary claim.

Do not force topic classification during message capture. That would create friction and fail the real family behaviour the product is designed around.

---

## 3. Core user journeys

### Journey A: Telegram capture

1. A family member sends a message in the Telegram family group.
2. The Telegram bot receives the update.
3. The webhook validates the request and identifies the Telegram username.
4. The system maps the username to a family member.
5. The original message is stored immediately.
6. The message appears in the web inbox without requiring a topic.

### Journey B: Web capture

1. A family member opens the web app.
2. They enter a username or select their existing username.
3. They type a message into the simple input box.
4. The message is stored with `source_channel = web`.
5. It appears in the common household timeline.

The web input must remain simple. It should feel like sending a quick family message, not filling in a project-management form.

### Journey C: Retrospective topic creation

1. A user opens the household message timeline.
2. They search or filter by date, sender or keyword.
3. They select related messages across a time range.
4. They click **Create topic**.
5. They provide a topic name, for example `Japan trip`.
6. The system creates the topic and links selected messages.
7. A summary job starts automatically.
8. The topic page shows the original messages, summary, decisions, tasks and open questions.

### Journey D: Topic refresh

1. New messages arrive in the household.
2. A topic owner or editor chooses **Add recent related messages**, or the system offers a suggestion.
3. The user confirms which messages belong to the topic.
4. The summary refreshes and records its source message set and generation version.

Automatic topic suggestions are explicitly deferred until the manual topic flow is reliable and real usage data exists.

---

## 4. MVP scope

### Must have

- Single household.
- Household members with username-only identity.
- Telegram bot ingestion.
- Web message input.
- Unified chronological message feed.
- Sender and source-channel display.
- Search by message text.
- Filter by sender and date range.
- Select multiple historical messages.
- Create a named topic from selected messages.
- Topic timeline showing linked original messages.
- On-demand summary generation.
- Automatic summary on topic creation.
- Manual summary refresh after new messages are linked.
- Summary sections:
  - What was discussed.
  - Decisions.
  - Tasks and owners where identifiable.
  - Open questions.
  - Important dates and places.
- Source-message citations/links for every extracted decision or task.
- Tombstone deleted messages rather than hard deletion.
- Shared visibility for all household members.
- Supabase RLS protecting the household.
- Basic audit history for topic creation, message linking, summary generation and edits.

### Explicitly out of scope for MVP

- Voice transcription.
- Automatic topic clustering.
- Multiple households per account.
- Private family messages.
- Full replacement for Telegram chat.
- Telegram message sending from the web app.
- Automatic Instagram or Threads ingestion.
- Public topic sharing.
- Calendar integrations.
- Google Maps API dependency.
- Multi-language translation pipeline.
- AI-generated itinerary as the default experience.
- Complex role-based enterprise permissions.

The trip board already prototyped in the repository should become an optional topic view later, not the core data model.

---

## 5. Domain model

```text
household
├── household_members
├── connected_channels
├── messages
│   └── message_attachments
├── topics
│   ├── topic_messages
│   ├── topic_summaries
│   ├── topic_decisions
│   ├── topic_tasks
│   └── topic_events
└── processing_jobs
```

### `households`

- `id uuid primary key`
- `name text not null`
- `created_by uuid not null`
- `created_at timestamptz`

For MVP, provision one household. Keep the foreign key in every relevant table so multi-household support does not require a destructive redesign later.

### `household_members`

- `id uuid primary key`
- `household_id uuid not null`
- `username text not null`
- `display_name text`
- `telegram_user_id text`
- `telegram_username text`
- `status text not null default 'active'`
- `created_at timestamptz`
- `updated_at timestamptz`

Add a unique constraint on `(household_id, lower(username))` and, where available, `(household_id, telegram_user_id)`.

Username-only identity is acceptable for the MVP, but the first web session must establish who is using the app. Use an invite link or a simple household access code rather than allowing arbitrary unauthenticated posting.

### `channels`

- `id uuid primary key`
- `household_id uuid not null`
- `channel_type text check (channel_type in ('telegram_group', 'web', 'hermes'))`
- `external_id text`
- `display_name text`
- `status text not null default 'active'`
- `created_at timestamptz`

### `messages`

- `id uuid primary key`
- `household_id uuid not null`
- `sender_member_id uuid not null`
- `channel_id uuid not null`
- `external_message_id text`
- `external_chat_id text`
- `reply_to_external_message_id text`
- `body text not null default ''`
- `sent_at timestamptz not null`
- `received_at timestamptz not null default now()`
- `source_channel text check (source_channel in ('telegram', 'web', 'hermes'))`
- `raw_payload jsonb not null default '{}'::jsonb`
- `metadata jsonb not null default '{}'::jsonb`
- `deleted_at timestamptz`
- `created_at timestamptz not null default now()`

The raw Telegram update is retained for audit/debugging, but raw payloads must not be shown casually in the UI. Never store bot tokens in this table.

Add a deduplication constraint where possible on `(channel_id, external_message_id)` so webhook retries cannot create duplicate messages.

### `message_attachments`

- `id uuid primary key`
- `message_id uuid not null`
- `storage_path text`
- `mime_type text`
- `file_size integer`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz`

Attachments can be limited to images/files in the MVP. Voice is deferred.

### `topics`

- `id uuid primary key`
- `household_id uuid not null`
- `name text not null`
- `description text`
- `topic_type text default 'general'` with optional values `general`, `trip`, `event`, `school`, `health`, `home`, `finance`
- `status text default 'active'`
- `created_by uuid not null`
- `created_at timestamptz`
- `updated_at timestamptz`

### `topic_messages`

- `topic_id uuid not null`
- `message_id uuid not null`
- `relationship_type text not null default 'selected'` with values `selected`, `suggested`, `confirmed`, `excluded`
- `confidence numeric`
- `added_by uuid`
- `created_at timestamptz`
- primary key `(topic_id, message_id)`

A many-to-many relation is essential. The same message may be relevant to more than one topic.

### `topic_summaries`

- `id uuid primary key`
- `topic_id uuid not null`
- `summary_text text not null`
- `decisions jsonb not null default '[]'::jsonb`
- `tasks jsonb not null default '[]'::jsonb`
- `open_questions jsonb not null default '[]'::jsonb`
- `important_dates jsonb not null default '[]'::jsonb`
- `important_places jsonb not null default '[]'::jsonb`
- `source_message_ids uuid[] not null`
- `generation_mode text check (generation_mode in ('automatic', 'manual', 'refresh'))`
- `model_name text`
- `prompt_version text`
- `created_at timestamptz`

Summaries are append-only versions. The latest summary is displayed, but historical versions remain available for audit and comparison.

### `processing_jobs`

- `id uuid primary key`
- `household_id uuid not null`
- `job_type text check (job_type in ('summary', 'metadata', 'future_topic_suggestion'))`
- `topic_id uuid`
- `status text check (status in ('queued', 'running', 'completed', 'failed'))`
- `attempts integer not null default 0`
- `error_message text`
- `created_at timestamptz`
- `completed_at timestamptz`

Use an idempotency key derived from `(topic_id, source_message_ids_hash, prompt_version)` so repeated webhook events or clicks do not produce duplicate summaries.

---

## 6. Telegram ingestion architecture

```text
Telegram group
      ↓ webhook update
Next.js route /api/telegram/webhook
      ↓ validate + deduplicate
Message ingestion service
      ↓ map Telegram identity
Supabase messages table
      ↓
Household timeline
```

### Webhook requirements

- Store the webhook secret in environment variables only.
- Validate Telegram’s secret header or configured webhook token.
- Return quickly after durable insertion; do not wait for an LLM summary in the webhook request.
- Handle duplicate updates idempotently.
- Support text messages first.
- Preserve reply metadata when Telegram provides it.
- Preserve edited/deleted state where Telegram sends the relevant update.
- Log safe event metadata, not bot tokens or private credentials.

### Adapter interface

```ts
interface MessageIngestionAdapter {
  source: 'telegram' | 'web' | 'hermes';
  normalize(input: unknown): Promise<NormalizedIncomingMessage>;
  persist(message: NormalizedIncomingMessage): Promise<{ id: string }>;
}
```

Telegram, web, and Hermes should share the same normalized message persistence path. This prevents the web and Telegram versions from diverging in behaviour.

### Hermes route

If the user sends messages directly to Hermes Agent, treat that as a separate adapter or gateway integration. Do not make the family web app depend on internal Hermes session storage. The app should receive a normalized message event containing:

- Household identifier.
- Sender username.
- Text.
- Source channel.
- External message ID if one exists.
- Timestamp.

---

## 7. Identity and household access

Username-only is the product identity model, but it still needs a secure web access mechanism.

Recommended MVP approach:

1. The household owner creates or approves a username.
2. The user joins through an invite URL or household access code.
3. The user sets a display name and username.
4. The app associates the authenticated Supabase user with that household member.
5. Telegram usernames are mapped by the owner or by a one-time confirmation flow.

Do not rely only on a user-editable username as authorization. A user could impersonate another member. The username is for attribution; Supabase Auth plus household membership is for access control.

For MVP, every active household member can:

- Read all non-private household messages.
- Create topics.
- Link messages to topics.
- Request summary generation.
- Edit topic names and descriptions.

Only the household owner should manage members, Telegram channel configuration, and deletion/tombstone policy.

---

## 8. Web application screens

### `/inbox`

The default screen should show:

- Simple message composer.
- Chronological household message feed.
- Sender avatar/name.
- Source badge: Telegram, Web, Hermes.
- Date separators.
- Search.
- Sender filter.
- Date filter.
- Multi-select mode.
- **Create topic** action when messages are selected.

### `/topics`

Show:

- Active topics.
- Recently updated topics.
- Summary status.
- Number of linked messages.
- Topic type.
- Last activity date.

### `/topics/[topicId]`

Show:

- Topic title and description.
- Summary card.
- Decisions.
- Tasks and possible owners.
- Open questions.
- Important dates and places.
- Linked message timeline.
- Add/remove message controls.
- Refresh summary button.
- Summary provenance/source links.

### `/settings/members`

Show:

- Family member list.
- Username mapping.
- Telegram identity mapping.
- Invite/access-code management.

The MVP should be clear and calm. Family members should not feel they are entering a work-management system.

---

## 9. Summary generation policy

The summary system must be source-grounded. It should never present an inferred decision as a confirmed decision without evidence.

### Structured output

```ts
interface TopicSummaryOutput {
  summary: string;
  decisions: Array<{
    text: string;
    status: 'confirmed' | 'proposed' | 'uncertain';
    sourceMessageIds: string[];
  }>;
  tasks: Array<{
    text: string;
    ownerUsername?: string;
    dueDate?: string;
    status: 'open' | 'completed' | 'uncertain';
    sourceMessageIds: string[];
  }>;
  openQuestions: Array<{
    text: string;
    sourceMessageIds: string[];
  }>;
  importantDates: Array<{
    date: string;
    context: string;
    sourceMessageIds: string[];
  }>;
  importantPlaces: Array<{
    name: string;
    context: string;
    sourceMessageIds: string[];
  }>;
}
```

### Prompt rules

- Include message IDs and sender usernames in the evidence context.
- Require source message IDs for each decision/task/date/place.
- Distinguish confirmed decisions from suggestions.
- Preserve disagreement instead of collapsing it.
- Mark missing information as unknown.
- Do not invent owners or deadlines.
- Do not include messages outside the selected topic message set.
- Keep the original message timeline available beside the summary.

### Generation modes

- `automatic`: invoked after topic creation.
- `manual`: invoked by the user.
- `refresh`: invoked after the linked message set changes.

Use a provider-neutral summary service so the model provider can change later. Cache by source-message hash and prompt version.

---

## 10. Topic workflow and future intelligence

### MVP manual flow

Manual selection is the initial topic-detection mechanism. It gives the family control and creates labelled data for future automation.

The UI should support:

- Select a contiguous date range.
- Select individual messages.
- Search then select results.
- Select all visible results.
- Preview selected messages before topic creation.
- Remove an accidental selection before creating the topic.

### Future topic suggestions

After real usage data exists, add a suggestion pipeline:

```text
Unlinked messages
      ↓
Candidate grouping by time, people, entities and embeddings
      ↓
Suggested topic title and evidence messages
      ↓
User accepts, edits or rejects
      ↓
Confirmed links become training/feedback data
```

Automatic clustering must remain a suggestion system. Do not silently move messages into topics.

---

## 11. Supabase security model

All family data is visible to active members of the same household. It is not public.

Required RLS policies:

- A user can read messages only where they are an active member of the message’s household.
- A user can insert web messages only into their active household and only as themselves.
- A user can read topics and summaries only in their household.
- A user can create and update topics in their household.
- Only owners can manage membership and channel configuration.
- Service-role access is used only by server-side webhook/worker code.
- The browser never receives a service-role key or Telegram bot token.

Add tests for:

- Active member read.
- Non-member read denied.
- Sender spoofing denied.
- Owner-only member management.
- Tombstoned messages remaining visible with deleted state.
- Duplicate Telegram update rejected or ignored safely.

---

## 12. Implementation phases

### Phase 1 — refactor current board into a family inbox

- Add Supabase project environment configuration.
- Add migration for households, members, channels, messages, topics, topic_messages, summaries and jobs.
- Add authenticated household shell.
- Replace demo-only item model with message model while preserving the existing visual quality.
- Implement web message input.
- Implement household timeline.
- Implement username display and source badges.

### Phase 2 — manual retrospective topics

- Add message search and filters.
- Add multi-select mode.
- Add create-topic dialog.
- Link selected messages through `topic_messages`.
- Add topic page with source timeline.
- Add edit/remove message links.

### Phase 3 — summary generation

- Add structured summary schema.
- Add provider-neutral summary service.
- Add automatic summary job after topic creation.
- Add manual summary button.
- Add refresh summary after message-link changes.
- Persist versioned summaries and source message IDs.
- Display provenance for extracted decisions/tasks.

### Phase 4 — Telegram bot ingestion

- Configure Telegram webhook.
- Add `/api/telegram/webhook`.
- Add username mapping.
- Add deduplication and raw update retention.
- Add Telegram source badges and external message links where possible.
- Test webhook retries, malformed updates and unmapped usernames.

### Phase 5 — trip topic view

- Add topic type `trip`.
- Extract places, dates, hotels, restaurants and transport as source-grounded structured entities.
- Reuse the existing drag-and-drop board as a trip-specific view.
- Allow linked messages to remain the source of truth.
- Do not build a full itinerary generator until the family uses the topic workflow successfully.

### Phase 6 — topic suggestions

- Build offline grouping experiments from confirmed topic links.
- Measure precision of suggested links.
- Show suggestions only with evidence and user confirmation.
- Add household-specific feedback and correction data.

---

## 13. Testing and acceptance criteria

### Unit tests

- Telegram update normalisation.
- Username mapping.
- Message deduplication key generation.
- Message tombstoning.
- Multi-select and topic-link payload creation.
- Summary schema validation.
- Source-message validation for decisions/tasks.
- Summary cache key generation.

### Integration tests

- Web message is stored with authenticated sender.
- Telegram update creates exactly one message despite retries.
- Selected messages create a topic and topic-message links.
- Summary job stores a version with exact source message IDs.
- Non-member cannot read household messages.
- Deleted message remains visible as deleted.

### End-to-end tests

1. Join the household as a family member.
2. Send a web message.
3. Confirm it appears in the common timeline.
4. Ingest a Telegram fixture from another member.
5. Search for trip-related messages.
6. Select messages across multiple dates.
7. Create `Japan trip` topic.
8. Confirm the topic includes the exact selected messages.
9. Generate a summary.
10. Confirm decisions/tasks show source messages.
11. Add another message to the topic and refresh.
12. Confirm the previous summary remains in history.

### MVP acceptance criteria

- Family members can send messages through web or Telegram.
- Every message has a sender, source and timestamp.
- All active members can see the shared household timeline.
- Messages do not need a topic before being sent.
- A user can find old messages through search/date/sender filters.
- A user can select related messages after the conversation.
- A user can create a topic from those messages.
- The topic displays the original messages.
- Summaries can run automatically, manually and on refresh.
- Summary claims link back to source messages.
- Deleted messages are retained as tombstones.
- Voice is not required for MVP.
- Telegram webhook retries do not create duplicate messages.

---

## 14. Product risks and CPO recommendations

### Risk: username-only identity is too weak

Recommendation: keep username as the visible family identity, but require Supabase authentication or a household invite/access code for web access. Never authorise solely by a typed username.

### Risk: Telegram bot captures messages members did not expect to persist

Recommendation: make the group bot clearly identifiable, show a one-time onboarding notice, provide `/privacy` and `/delete` guidance, and make retention visible. MVP policy is shared household visibility and tombstoned deletion.

### Risk: summaries create false certainty

Recommendation: make source messages prominent. Every decision/task must have evidence. Use statuses such as confirmed, proposed and uncertain.

### Risk: topic automation arrives too early

Recommendation: manual selection is not a weakness; it is the data-collection and trust-building phase. It teaches the product what the household considers related.

### Risk: product becomes another chat app

Recommendation: do not compete with Telegram on real-time chat. Focus the web app on retrieval, memory, topic reconstruction, summaries and family coordination.

### Risk: trip planning swallows the product

Recommendation: treat trip planning as the first compelling vertical view on top of a general family memory model. Keep the message and topic data model general.

---

## 15. Immediate next implementation slice

Build Phase 1 as a vertical slice:

1. Create Supabase migration for households, members, channels and messages.
2. Add a single-household seed/development mode.
3. Replace the demo board landing page with a family inbox.
4. Add web message composer.
5. Persist messages through a server-side Supabase client when environment variables exist.
6. Keep a clearly labelled local demo fallback when Supabase is not configured.
7. Add message sender, source and timestamp display.
8. Add tests for message creation and sender attribution.
9. Verify with a local browser workflow.
10. Commit as `feat: add family inbox foundation`.

Do not start Telegram webhook or AI summaries until the web inbox and message persistence model are stable.

**Governing principle:**

> Let families talk naturally first. Turn the conversation into structure afterward, with the original messages always available as the source of truth.
