import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const ALLOWED_EMAIL = (import.meta.env.VITE_ALLOWED_EMAIL as string | undefined)?.toLowerCase() ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (and Vercel env vars).',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  if (!ALLOWED_EMAIL) return true; // if unset, don't enforce
  return email.toLowerCase() === ALLOWED_EMAIL;
}

