-- Phase 6: About Me (user_profiles), drafts (linkedin_ai_drafts), and Apify enrichment columns on leads

create extension if not exists "pgcrypto";

-- 1) Extend leads to store enrichment results (simple-first approach)
alter table public.linkedin_leads
  add column if not exists apify_profile_json jsonb,
  add column if not exists apify_last_scraped_at timestamptz,
  add column if not exists apify_error text,
  add column if not exists apify_profile_run_id text,
  add column if not exists apify_posts_run_id text;

-- 2) About Me profile keyed to auth.users
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  offer_icp text,
  tone_guidelines text,
  hard_constraints text,
  calendly_cta_prefs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists update_user_profiles_updated_at on public.user_profiles;
create trigger update_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.update_updated_at_column();

alter table public.user_profiles enable row level security;

drop policy if exists "read own profile" on public.user_profiles;
create policy "read own profile"
  on public.user_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "insert own profile" on public.user_profiles;
create policy "insert own profile"
  on public.user_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "update own profile" on public.user_profiles;
create policy "update own profile"
  on public.user_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3) Draft approval queue
create table if not exists public.linkedin_ai_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid references public.linkedin_leads(id) on delete cascade,
  conversation_id uuid references public.linkedin_conversations(id) on delete set null,
  status text not null default 'pending',
  draft_type text not null default 'first_message',
  draft_message text not null,
  original_draft text,
  ai_model text,
  ai_prompt text,
  ai_context jsonb,
  edit_count integer not null default 0,
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_linkedin_ai_drafts_user_status_created
  on public.linkedin_ai_drafts (user_id, status, created_at desc);
create index if not exists idx_linkedin_ai_drafts_lead
  on public.linkedin_ai_drafts (lead_id);

drop trigger if exists update_linkedin_ai_drafts_updated_at on public.linkedin_ai_drafts;
create trigger update_linkedin_ai_drafts_updated_at
before update on public.linkedin_ai_drafts
for each row execute function public.update_updated_at_column();

alter table public.linkedin_ai_drafts enable row level security;

drop policy if exists "read own drafts" on public.linkedin_ai_drafts;
create policy "read own drafts"
  on public.linkedin_ai_drafts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "insert own drafts" on public.linkedin_ai_drafts;
create policy "insert own drafts"
  on public.linkedin_ai_drafts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "update own drafts" on public.linkedin_ai_drafts;
create policy "update own drafts"
  on public.linkedin_ai_drafts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

