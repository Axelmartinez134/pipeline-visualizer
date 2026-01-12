-- Store "my profile" context as plain text (no JSON required)

alter table public.user_profiles
  add column if not exists my_profile_text text;

-- Backfill from my_profile_json if present (best-effort)
update public.user_profiles
set my_profile_text = coalesce(my_profile_text, jsonb_pretty(my_profile_json))
where my_profile_text is null and my_profile_json is not null;

