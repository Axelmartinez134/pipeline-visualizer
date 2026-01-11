import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isAllowedEmail, supabase } from '../../lib/supabaseClient';

type AuthContextValue = {
  loading: boolean;
  authed: boolean;
  session: Session | null;
  loginWithPassword: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const authed = !!session?.user;

  useEffect(() => {
    let mounted = true;

    // Initial session fetch
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          console.error('[auth] getSession error', error);
          setSession(null);
          setLoading(false);
          return;
        }

        const nextSession = data.session ?? null;
        if (nextSession?.user && !isAllowedEmail(nextSession.user.email)) {
          supabase.auth.signOut().finally(() => {
            if (!mounted) return;
            setSession(null);
            setLoading(false);
          });
          return;
        }

        setSession(nextSession);
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        console.error('[auth] getSession failed', e);
        setSession(null);
        setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      if (nextSession?.user && !isAllowedEmail(nextSession.user.email)) {
        supabase.auth.signOut().finally(() => {
          if (!mounted) return;
          setSession(null);
        });
        return;
      }
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      loading,
      authed,
      session,
      loginWithPassword: async (email: string, password: string) => {
        const normalizedEmail = (email || '').trim().toLowerCase();
        if (!normalizedEmail) return { ok: false, error: 'Email is required.' };
        if (!password) return { ok: false, error: 'Password is required.' };
        if (!isAllowedEmail(normalizedEmail)) return { ok: false, error: 'Access denied.' };

        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) return { ok: false, error: error.message };
        if (!data.user) return { ok: false, error: 'Sign-in failed.' };
        if (!isAllowedEmail(data.user.email)) {
          await supabase.auth.signOut();
          return { ok: false, error: 'Access denied.' };
        }

        return { ok: true };
      },
      logout: async () => {
        await supabase.auth.signOut();
      },
    };
  }, [authed, loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider />');
  return ctx;
}

