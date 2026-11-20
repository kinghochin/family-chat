# Gatherly — trip research organiser

A focused MVP for collecting and organising trip ideas. Create a topic, save links or notes, and drag ideas between collections such as Inbox, Tokyo, Kyoto, and Food & coffee.

## Current MVP

- Next.js App Router + TypeScript
- Responsive board UI
- Drag-and-drop cards between collections
- Search/filtering of saved ideas
- Manual idea composer for notes and links
- Supabase schema with authentication-ready RLS policies
- Local demo data so the board can be evaluated before connecting Supabase

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor.
3. Add environment variables in `.env.local`:

```bash
SUPABASE_URL=your-project-url
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_JWKS_URL=your-project-jwks-url
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
HERMES_WEBHOOK_URL=https://your-hermes-gateway.example/webhooks/topic-selection
HERMES_WEBHOOK_SECRET=your-webhook-secret
HERMES_TELEGRAM_CHAT_ID=805353200
NEXT_PUBLIC_APP_URL=https://family-chat-black.vercel.app
```

The current board intentionally runs with local demo state. The next implementation slice should connect topic, collection, and item queries to Supabase after the interaction model is validated.

## Authentication

Run `supabase/migrations/003_auth_profiles.sql` after the conversation-memory migration, then run `supabase/migrations/004_message_attachments.sql` to create the private message-attachment bucket and metadata column, `supabase/migrations/005_household_settings.sql` to create the shared group details, `supabase/migrations/006_household_members.sql` to enable member invites, `supabase/migrations/007_member_lifecycle.sql` to enable accepting invites, editing members, and dropping members, and `supabase/migrations/008_invite_acceptance.sql` to ensure invited users are added even when email confirmation is enabled, and `supabase/migrations/009_backfill_profiles.sql` to populate names for accounts created before the profile trigger, `supabase/migrations/010_topic_owner_read.sql` to let topic owners read topics they create, and `supabase/migrations/011_topic_selection_requests.sql` to enable Hermes-assisted message suggestions and confirmation. Then configure the Supabase Auth URL settings so the Site URL and redirect URLs include the deployed Vercel URL. The app provides `/login` and `/signup`, protects the family routes, and uses email/password authentication.

## Hermes-assisted topic selection

The topic details page can ask Hermes to find related messages. The app creates a selection request, sends the candidate messages to `HERMES_WEBHOOK_URL`, and polls for a signed callback. Hermes can notify Telegram using `HERMES_TELEGRAM_CHAT_ID`; users still confirm suggestions in the app before records are inserted into `topic_messages`. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. The Hermes gateway must be reachable from the deployed Vercel application, and its webhook prompt must POST the structured suggestions to the supplied `callback_url` with the supplied `callback_token`.

## Verification

```bash
npm run lint
npm run build
```

## Product direction

The first useful product is a shared research organiser. Instagram/Threads capture should be added through an explicit browser extension or approved export/import route rather than making the MVP depend on fragile private-message scraping.
