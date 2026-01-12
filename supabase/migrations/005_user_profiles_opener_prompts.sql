-- Sell-by-Chat prompting architecture: dedicated opener prompt fields

alter table public.user_profiles
  add column if not exists ai_opener_system_prompt text,
  add column if not exists ai_opener_user_prompt_template text;

-- Backfill opener prompts from existing prompt fields (if present)
update public.user_profiles
set
  ai_opener_system_prompt = coalesce(ai_opener_system_prompt, ai_system_prompt),
  ai_opener_user_prompt_template = coalesce(ai_opener_user_prompt_template, ai_user_prompt_template)
where
  ai_opener_system_prompt is null
  or ai_opener_user_prompt_template is null;

