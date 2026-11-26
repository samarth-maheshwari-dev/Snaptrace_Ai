import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SessionUser } from '../types';
import { api } from './api';

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  googleClientId: string | null;
  devLogin: boolean;
  setUser: (u: SessionUser | null) => void;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

/**
 * The browser never sees a token: the session lives in an httpOnly cookie.
 * We just ask the server "who am I?" on load (/api/auth/me).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleClientId, setClientId] = useState<string | null>(null);
  const [devLogin, setDevLogin] = useState(false);

  useEffect(() => {
    api.auth
      .me()
      .then((r) => { setUser(r.user); setClientId(r.googleClientId); setDevLogin(r.devLogin); })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    // Any 401 from the API means the session expired.
    const onExpired = () => setUser(null);
    window.addEventListener('snaptrace:signed-out', onExpired);
    return () => window.removeEventListener('snaptrace:signed-out', onExpired);
  }, []);

  const signOut = useCallback(async () => {
    await api.auth.logout().catch(() => {});
    window.google?.accounts.id.disableAutoSelect();
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, googleClientId, devLogin, setUser, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/* ---- Google Identity Services typings (just what we use) ---- */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

let gsiPromise: Promise<void> | null = null;
export function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  gsiPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { gsiPromise = null; reject(new Error('Could not load Google sign-in.')); };
    document.head.appendChild(s);
  });
  return gsiPromise;
}
