-- Phase 6D: store AI prompt templates per user (editable in Settings)

alter table public.user_profiles
  add column if not exists ai_system_prompt text,
  add column if not exists ai_user_prompt_template text;

