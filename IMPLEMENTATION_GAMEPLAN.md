# Implementation Gameplan (Phased)

This document is the step-by-step guide for building the AutomatedBots LinkedIn Outreach app.

**Rule:** We implement **one phase at a time**. At the end of each phase we stop and ask for approval before continuing.

---

## North Star (Definition of Done)
A private app at `automatedbots.ai` where **only** `axel@automatedbots.com` can access:

- Retroactive sync: pull past accepted connections (Ads campaign)
- Real-time: receive Aimfox events for new accepts + replies
- Track leads + conversations + messages in Supabase (source of truth)
- Draft approval workflow (AI later)
- Send messages via Aimfox from the UI
- Durable audit trail for webhooks/events

---

## Phase 0 — Foundations (DONE)
**Goal:** Make the app real and private.

- Supabase Auth (email/password) + allowlist (`axel@automatedbots.com`)
- Route gating for `/linkedin/*`
- Session loading UX (no blank screen)
- Shadcn-style login UI (single panel)

**Exit criteria:**
- Can sign in/out
- `/linkedin/*` redirects to `/login` when not authed

**Checkpoint:** ✅ Completed

---

## Phase 1 — Backend scaffolding (Vercel Serverless Functions)
**Goal:** Prove serverless functions run and can receive traffic safely.

- Add `/api/health`
- Add `/api/webhooks/aimfox` (POST only)
  - Validate shared secret (initial approach)
  - Return `200` fast
  - Minimal logging for smoke test

**Exit criteria:**
- `/api/health` returns `{ ok: true }`
- `/api/webhooks/aimfox` accepts a test payload (curl/Postman) and returns `200`

**Checkpoint:** Ask user for approval to continue to Phase 2.

---

## Phase 2 — Database “source of truth” (minimal schema first)
**Goal:** Persist events in a debuggable way.

Start with minimal tables:
- `linkedin_webhook_events` (audit trail + idempotency)
- `linkedin_leads`
- `linkedin_conversations`
- `linkedin_messages`

Add:
- indexes
- timestamps / updated_at approach
- uniqueness rules for idempotency (event_id, message_urn, conversation_urn)

**Exit criteria:**
- Tables exist in Supabase
- Inserts/upserts from serverless functions work (using service role server-side)

**Checkpoint:** Ask user for approval to continue to Phase 3.

---

## Phase 3 — Webhook processing (real-time updates)
**Goal:** Aimfox events update DB state automatically.

Webhook handler:
- Store raw event to `linkedin_webhook_events`
- Process at least:
  - `accepted` → upsert lead (+ timestamps/status)
  - `campaign_reply` (and reply/inbox equivalents) → insert message, update conversation + lead
- Mark processed + store error info if needed

**Exit criteria:**
- Live Aimfox webhook → DB updated correctly
- Duplicate webhook deliveries do not duplicate records

**Checkpoint:** Ask user for approval to continue to Phase 4.

---

## Phase 4 — Retroactive sync (Ads campaign)
**Goal:** Pull past accepted connections (and any available history).

- Add `/api/sync/retroactive`
  - Filter to Ads campaign (only campaign now)
  - Batched/paged to avoid timeouts
- Optional when needed: `sync_status` for progress

**Exit criteria:**
- Running sync imports historical accepted leads into `linkedin_leads`
- Sync can resume safely (idempotent)

**Checkpoint:** Ask user for approval to continue to Phase 5.

---

## Phase 5 — UI: real data surfaces (LinkedIn product only)
**Goal:** Replace placeholders with real DB-backed views.

Inside `/linkedin/*`:
- `/linkedin/campaign` → lead list + filters
- `/linkedin/queue` → drafts list (Phase 6)
- `/linkedin/settings` → sync controls + diagnostics
- `/linkedin/upload` remains placeholder for now but styled consistently

**Exit criteria:**
- Can see imported leads + newest activity
- UI reflects DB updates from webhooks

**Checkpoint:** Ask user for approval to continue to Phase 6.

---

## Phase 6 — Drafts + approval workflow (manual drafts first)
**Goal:** Build the approval queue + the context foundation for high-quality drafts.

### 6A) Database changes (foundation)
- Extend `linkedin_leads`:
  - `apify_profile_json` (JSONB)
  - `apify_last_scraped_at` (timestamptz)
  - optional tracking fields: run ids + error fields
- Add `user_profiles` (About Me) keyed to `auth.users.id` (1 row per user)
  - offer + ICP
  - tone / voice guidelines
  - hard constraints
  - calendly / CTA preferences
- Add `linkedin_ai_drafts` (approval queue)
  - status: `pending | approved | rejected | sent`
  - link to `lead_id` (+ `conversation_id` when available)
  - store draft content + metadata + timestamps

### 6B) Automatic lead enrichment (Apify)
When a lead is inserted via `accepted` webhook:
- If `apify_profile_json` is null, run Apify enrichment:
  - Actor 1: `supreme_coder/linkedin-profile-scraper` (deep profile)
  - Actor 2: `harvestapi/linkedin-profile-posts` (posts + comments/reactions)
- Store raw results back onto the lead row (`apify_profile_json`) and set `apify_last_scraped_at`.

### 6C) UI (Settings + Queue)
- Settings page:
  - Add an "About Me" editor saved in `user_profiles`
- Approval Queue page:
  - List `pending` drafts
  - Edit + approve/reject (sending happens in Phase 7)

### 6D) AI generation (Anthropic) — last step in Phase 6
- Server-side Anthropic endpoint to generate a first message draft using:
  - lead Apify JSON
  - your About Me profile
- Writes a `pending` row to `linkedin_ai_drafts`

**Exit criteria:**
- Leads can be enriched (Apify JSON stored)
- About Me can be saved/loaded (per-user row)
- Approval Queue lists drafts and supports edit + approve/reject
- Reminder: Phase 7 is required to actually send messages.

**Checkpoint:** Ask user for approval to continue to Phase 7.

---

## Phase 7 — Message sending via Aimfox (server-side)
**Goal:** Send messages safely from your app.

- Add `/api/messages/send`
  - Validate signed-in user (Supabase session)
  - Call Aimfox API with server-side key
  - Insert sent message to `linkedin_messages`
  - Update conversation + lead timestamps/status

**Exit criteria:**
- From UI, send a message and see it recorded in DB
- Subsequent replies appear via webhook

**Checkpoint:** Ask user for approval to continue to Phase 8.

---

## Phase 8 — Reliability + security hardening
**Goal:** Make it robust against retries, bugs, and noise.

- Stronger webhook validation (signature if supported)
- Strict idempotency guarantees
- Rate limiting on webhook endpoint
- Better error reporting/alerts
- Optional queue introduction if needed

**Exit criteria:**
- Confident production reliability (no double inserts, safe retries)

**Checkpoint:** Ask user for approval to continue to Phase 9.

---

## Phase 9 — RLS + multi-tenant readiness (later)
**Goal:** Prepare for scaling without rewrites.

- RLS policies for all tables
- Add tenant/org model + ownership columns
- Multi-account Aimfox support (`aimfox_accounts`)

**Exit criteria:**
- Secure, multi-tenant capable foundation

