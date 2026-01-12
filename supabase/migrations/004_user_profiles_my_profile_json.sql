-- Phase 6D: store your own profile context for shared-connection openers

alter table public.user_profiles
  add column if not exists my_profile_json jsonb;

