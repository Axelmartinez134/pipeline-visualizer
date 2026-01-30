# Inbox UI (LinkedIn) — Phased Plan

Goal: Replace `'/linkedin/queue'` with an **Inbox-style UI** (left thread list, right conversation view + always-visible AI draft composer) while minimizing risk and preserving existing functionality.

Architecture decision (long-term):
- We will **not** introduce a separate backend service anytime soon.
- The system remains a **single repo** with:
  - Frontend in `src/`
  - Serverless/internal API routes in `api/` (the only place that can call Aimfox + use service-role Supabase).
- Implication: we must be disciplined about boundaries, file sizes, and shared types so the codebase scales without a “god folder”.

Scope constraints:
- **No sending yet** (Aimfox outbound). Drafts remain `status='pending'`.
- **One active pending draft per lead** at a time (unless user explicitly rerolls).
- **Top 25** accepted leads get drafts generated in the background (client-triggered → internal API).
- **Needs-attention dot** appears only when a pending draft exists.
  - **Orange**: first-message draft pending
  - **Blue**: follow-up/reply draft pending (initially keyed to `unread_count > 0` + pending follow-up draft)
- Dark theme for now; match layout/structure first.

Non-goals (for now):
- Approval Queue as a separate page (it becomes “draft state inside thread”).
- Follow-up scheduling “5 days since latest message either side” (requires outbound logging; tracked below).
- Any cron/job system.

---

## Engineering guardrails (to reduce technical debt)

These apply across all phases.

- **Feature-first code placement**:
  - New Inbox work should live under `src/features/inbox/*` (components/hooks/domain/api).
  - Route-level components in `src/app/pages/*` should remain thin “composition only”.
- **Server boundary**:
  - Client never calls Aimfox directly.
  - Client calls internal endpoints under `api/internal/inbox/*`.
  - Internal endpoints use `api/lib/aimfox.js` + `api/lib/supabaseAdmin.js`.
- **Single responsibility**:
  - Move sorting/badges/priority logic into pure functions in `src/features/inbox/domain/*`.
  - Keep UI components under ~200 LOC by splitting early.
- **Typed contracts**:
  - For new endpoints, define request/response shapes and validate input server-side (plan: Zod or a minimal validator).
  - Share types with the client (plan: `src/features/inbox/types.ts`).

---

## Phase 0 — Baseline + Safety Checks (no behavior changes)

**Objective**: Confirm current data + routes, define invariants, avoid regressions.

Status: **completed** (baseline validated: build/typecheck/tests pass; lint warnings exist but no errors).

Checklist:
- [ ] Verify the following tables are populated in your Supabase env:
  - `linkedin_leads` (accepted leads exist)
  - `linkedin_conversations` (for at least 1 reply thread)
  - `linkedin_messages` (inbound messages exist)
  - `linkedin_ai_drafts` (pending drafts exist)
- [ ] Confirm current page `'/linkedin/queue'` works (loads drafts and approves/rejects status).
- [ ] Confirm Aimfox webhook ingestion works (new reply increases `unread_count` and writes `linkedin_messages`).

Acceptance criteria:
- No code changes shipped; we have confidence in current behavior and sample data to test the inbox UI.

---

## Phase 1 — Introduce Inbox Route (UI shell only)

**Objective**: Replace `LinkedInQueuePage` at route `'/linkedin/queue'` with a new `LinkedInInboxPage` that renders the **two-panel layout** (left list / right panel), but does not yet auto-generate drafts.

Tasks:
- [ ] Create new page component: `src/app/pages/LinkedInInboxPage.tsx` (thin wrapper)
- [ ] Create feature skeleton:
  - `src/features/inbox/pages/InboxPage.tsx`
  - `src/features/inbox/components/*`
  - `src/features/inbox/hooks/*`
  - `src/features/inbox/domain/*`
- [ ] Update routing in `src/app/routes/AppRoutes.tsx`:
  - `'/linkedin/queue'` → `LinkedInInboxPage`
- [ ] Update LinkedIn sidebar label in `src/app/layouts/ProductShell.tsx`:
  - Change `Approval Queue` label to `Inbox` (keep path `/linkedin/queue`)
- [ ] Keep the old `LinkedInQueuePage.tsx` in repo (unused) for reference during transition.

UI behavior:
- Left panel: placeholder list skeleton (or empty state).
- Right panel: placeholder empty state (“Select a lead”).

Acceptance criteria:
- Navigating to `'/linkedin/queue'` shows Inbox layout without runtime errors.
- Other LinkedIn routes unaffected.

---

## Phase 2 — Data plumbing for Inbox (read-only)

**Objective**: Populate Inbox UI read-only from Supabase:
- left list includes **all accepted leads**
- conversations/messages show in the right panel when available
- show “needs attention” dot only if a pending draft exists

Data sources:
- Leads: `linkedin_leads` filtered to `lead_status = 'accepted'` (and any other “active” statuses you want later).
- Conversations: `linkedin_conversations` by `lead_id`
- Messages: `linkedin_messages` by `lead_id` and/or `conversation_id`
- Drafts: `linkedin_ai_drafts` by `lead_id` with `status='pending'` (ensure **only one** active pending draft is surfaced)

Tasks:
- [ ] Build a unified view-model on the client (in `src/features/inbox/domain/*` + `types.ts`):
  - `Thread = { lead, conversation?, lastMessageAt?, unreadCount?, pendingDraft? }`
- [ ] Implement left list ordering (first version):
  - Threads with `pendingDraft` first
  - Otherwise order by `lastMessageAt` (or `connection_accepted_at` as fallback)
- [ ] Implement “needs attention” indicator:
  - Dot shown only if `pendingDraft` exists
  - Color = orange if `draft_type='first_message'`, blue if `draft_type in ('reply','followup')`
- [ ] Right panel:
  - Conversation timeline from `linkedin_messages` (if any)
  - Show pending draft (if any) in composer area (editable client state only)

Acceptance criteria:
- Inbox left list renders accepted leads.
- Selecting a lead shows its timeline (if exists) and any pending draft.
- No writes yet.

---

## Phase 3 — Draft generation APIs (first-message)

**Objective**: Allow Inbox to create a first-message draft when none exists, while enforcing:
- exactly one active pending draft per lead
- reroll replaces the existing pending draft

Approach:
- Reuse the existing AI draft generation logic in `api/internal/drafts/generate.js`, but add a **new handler** suitable for Inbox:
  - `POST /api/internal/inbox/ensure-draft`
  - `POST /api/internal/inbox/reroll-draft`

Implementation note:
- Because we’re staying in a single repo, these serverless endpoints become the long-term “backend”.
- Keep them small and composable; shared helpers should live in `api/lib/*` (not copied per route).

Tasks:
- [ ] Add internal API endpoint: `api/internal/inbox/ensure-draft.js`
  - Inputs: `{ leadId, draftType }` (initially only `first_message`)
  - Behavior:
    - If a pending draft exists for `(user_id, lead_id)` → return it
    - Else generate a draft (reusing opener prompt) and insert `status='pending'`
- [ ] Add internal API endpoint: `api/internal/inbox/reroll-draft.js`
  - Inputs: `{ leadId, draftType, feedback? }`
  - Behavior:
    - Mark existing pending draft as superseded (e.g. `status='rejected'` or new status like `archived`) OR update in-place
    - Generate a new pending draft
    - Return new draft id
- [ ] Decide “superseded” strategy:
  - Preferred: add a new status like `archived` later; for now, use existing `rejected` with a note in `ai_context` (keeps schema stable).

Acceptance criteria:
- Selecting a lead with no pending first-message draft can create exactly one.
- Reroll replaces the active pending draft.

---

## Phase 4 — Background generation for Top 25

**Objective**: On Inbox load, auto-generate drafts for the top 25 accepted leads (client-triggered).

Tasks:
- [ ] Add internal API endpoint: `api/internal/inbox/bootstrap-drafts.js`
  - Behavior:
    - Query accepted leads (top 25 by priority you choose; initial: newest accepted first)
    - For each, ensure draft exists (same logic as ensure-draft)
    - Return summary counts
- [ ] Client behavior in `LinkedInInboxPage`:
  - After initial data fetch, call bootstrap endpoint
  - Refresh local thread list afterward
- [ ] Add guardrails:
  - Debounce / “run once per session” (localStorage key)
  - Avoid re-running if drafts already exist

Acceptance criteria:
- Inbox becomes populated with draft-ready threads without manual clicking.
- No duplicate pending drafts.

---

## Phase 5 — Follow-up/reply foundations (no scheduling yet)

**Objective**: Introduce `draft_type='reply'|'followup'` in the UI and generation endpoints, without full “5-day logic”.

Tasks:
- [ ] Update draft generation endpoint(s) to accept `draftType`:
  - For `reply`/`followup`, generation may still reuse opener prompt temporarily OR return “not implemented” until follow-up prompt is ready.
- [ ] Left list blue-dot behavior:
  - Initial simplification: show blue “needs attention” when `unread_count > 0` AND a pending follow-up draft exists.
  - Later improvement: generate follow-up draft automatically when a thread becomes unread.

Acceptance criteria:
- System supports draft_type differentiation in UI and storage.

---

## Phase 6 — (Later) Sending + outbound logging (tracked dependency)

**This is explicitly deferred**, but required for the final product goal.

Requirements to implement later:
- [ ] Add server-side send endpoint using Aimfox (do NOT expose API key client-side).
- [ ] On successful send:
  - Update draft: `sent_at = now()`, `status` → sent/approved
  - Insert outbound record into `linkedin_messages` (message_type = 'sent') with timestamps
  - Upsert conversation if needed, store `conversation_urn` and link to `linkedin_conversations`
- [ ] Then enable “5 days since latest message either side” follow-up scheduling:
  - Requires reliable outbound `sent_at` timestamps stored in DB.

---

## Open Decisions (keep in sync)

- Follow-up generation trigger: “5 days after latest message (either side)” → blocked until outbound logging exists.
- Superseded-draft strategy: new `status='archived'` vs reuse `rejected`.

## Debt watchlist (explicitly track)

- **Outbound logging required**: When sending is implemented, we must write outbound messages to `linkedin_messages` (or a dedicated outbound table) so follow-up timing can use “latest message either side”.
- **Prevent 500+ LOC files**: Split Inbox UI into small components/hooks early; avoid piling logic into a single page.

---

## Phase 7 — Code splitting / bundle size (later)

Background:
- Current production build warns that some chunks exceed ~500kB after minification.
- Not blocking Inbox phases, but should be addressed to improve load time and long-term scalability.

Objective:
- Reduce initial JS bundle size and improve perceived performance via route-level splitting and targeted lazy-loading.

Tasks:
- [ ] Identify largest modules contributing to `dist/assets/index-*.js` (bundle analysis)
- [ ] Introduce route-level `React.lazy()` + `Suspense` for heavy routes (e.g., 3D visualizer vs LinkedIn UI)
- [ ] Split heavy 3D modules behind dynamic imports (load only when that route is visited)
- [ ] Consider `build.rollupOptions.output.manualChunks` in `vite.config.js` if needed
- [ ] Add performance acceptance criteria (e.g. first load JS under X MB gzipped for marketing pages)

Acceptance criteria:
- Production build warning is eliminated or materially reduced.
- No regression in core navigation; lazy routes render with a consistent loader.

