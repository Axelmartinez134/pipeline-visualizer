import React, { createContext, useContext, useMemo, useState } from 'react';
import { isAuthed as readAuthed, setAuthed as writeAuthed } from './auth';

type AuthContextValue = {
  authed: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean>(() => readAuthed());

  const value = useMemo<AuthContextValue>(() => {
    return {
      authed,
      login: () => {
        writeAuthed(true);
        setAuthed(true);
      },
      logout: () => {
        writeAuthed(false);
        setAuthed(false);
      },
    };
  }, [authed]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider />');
  return ctx;
}

