-- Phase 2: Minimal source-of-truth schema (Supabase Postgres)
-- Creates:
--   - linkedin_webhook_events (audit/idempotency)
--   - linkedin_leads
--   - linkedin_conversations
--   - linkedin_messages
--
-- Notes:
-- - RLS is ENABLED and only allows SELECT for authenticated users.
--   Writes happen server-side using the service role key.

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Shared updated_at trigger function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language 'plpgsql';

-- 1) Webhook audit trail
create table if not exists public.linkedin_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique,
  event_type text not null,
  payload jsonb not null,
  processed boolean not null default false,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_linkedin_webhook_events_type
  on public.linkedin_webhook_events (event_type);
create index if not exists idx_linkedin_webhook_events_created
  on public.linkedin_webhook_events (created_at desc);
create index if not exists idx_linkedin_webhook_events_processed
  on public.linkedin_webhook_events (processed);

alter table public.linkedin_webhook_events enable row level security;
drop policy if exists "read webhook events (authed)" on public.linkedin_webhook_events;
create policy "read webhook events (authed)"
  on public.linkedin_webhook_events
  for select
  to authenticated
  using (true);

-- 2) Leads
create table if not exists public.linkedin_leads (
  id uuid primary key default gen_random_uuid(),
  linkedin_id text unique not null,
  linkedin_urn text unique,
  public_identifier text,
  full_name text,
  first_name text,
  last_name text,
  headline text,
  occupation text,
  picture_url text,
  profile_url text,
  campaign_id text,
  campaign_name text,
  lead_status text not null default 'pending',
  connection_accepted_at timestamptz,
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_linkedin_leads_status
  on public.linkedin_leads (lead_status);
create index if not exists idx_linkedin_leads_campaign
  on public.linkedin_leads (campaign_id);
create index if not exists idx_linkedin_leads_updated
  on public.linkedin_leads (updated_at desc);
create index if not exists idx_linkedin_leads_accepted
  on public.linkedin_leads (connection_accepted_at desc) where connection_accepted_at is not null;

drop trigger if exists update_linkedin_leads_updated_at on public.linkedin_leads;
create trigger update_linkedin_leads_updated_at
before update on public.linkedin_leads
for each row execute function public.update_updated_at_column();

alter table public.linkedin_leads enable row level security;
drop policy if exists "read leads (authed)" on public.linkedin_leads;
create policy "read leads (authed)"
  on public.linkedin_leads
  for select
  to authenticated
  using (true);

-- 3) Conversations
create table if not exists public.linkedin_conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_urn text unique not null,
  lead_id uuid references public.linkedin_leads(id) on delete cascade,
  last_activity_at timestamptz,
  unread_count integer not null default 0,
  participants jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_linkedin_conversations_lead
  on public.linkedin_conversations (lead_id);
create index if not exists idx_linkedin_conversations_last_activity
  on public.linkedin_conversations (last_activity_at desc);

drop trigger if exists update_linkedin_conversations_updated_at on public.linkedin_conversations;
create trigger update_linkedin_conversations_updated_at
before update on public.linkedin_conversations
for each row execute function public.update_updated_at_column();

alter table public.linkedin_conversations enable row level security;
drop policy if exists "read conversations (authed)" on public.linkedin_conversations;
create policy "read conversations (authed)"
  on public.linkedin_conversations
  for select
  to authenticated
  using (true);

-- 4) Messages
create table if not exists public.linkedin_messages (
  id uuid primary key default gen_random_uuid(),
  message_urn text unique not null,
  conversation_id uuid references public.linkedin_conversations(id) on delete cascade,
  lead_id uuid references public.linkedin_leads(id) on delete cascade,
  body text not null,
  message_type text not null, -- 'sent' | 'received' | 'inmail' | ...
  sender_id text,
  sender_name text,
  recipient_id text,
  recipient_name text,
  raw jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_linkedin_messages_conversation
  on public.linkedin_messages (conversation_id);
create index if not exists idx_linkedin_messages_lead
  on public.linkedin_messages (lead_id);
create index if not exists idx_linkedin_messages_sent_at
  on public.linkedin_messages (sent_at desc);

drop trigger if exists update_linkedin_messages_updated_at on public.linkedin_messages;
create trigger update_linkedin_messages_updated_at
before update on public.linkedin_messages
for each row execute function public.update_updated_at_column();

alter table public.linkedin_messages enable row level security;
drop policy if exists "read messages (authed)" on public.linkedin_messages;
create policy "read messages (authed)"
  on public.linkedin_messages
  for select
  to authenticated
  using (true);

