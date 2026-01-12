-- Store full prompt/debug artifacts for drafts

alter table public.linkedin_ai_drafts
  add column if not exists ai_system_prompt text,
  add column if not exists ai_request_json jsonb;

