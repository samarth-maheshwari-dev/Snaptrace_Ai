import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { api } from '../lib/api';
import { loadGoogleScript, useAuth } from '../lib/auth';

/** Google's own button. Clicking it opens Google's popup; on success Google calls back with an ID token. */
export function SignInButton({ onDone }: { onDone?: () => void }) {
  const { googleClientId, devLogin, setUser } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [devEmail, setDevEmail] = useState('');

  useEffect(() => {
    if (!googleClientId || !ref.current) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async ({ credential }) => {
            try {
              const { user } = await api.auth.google(credential); // server verifies the token
              setUser(user);
              onDone?.();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Sign-in failed.');
            }
          },
        });
        window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with' });
      })
      .catch((e) => setError(e.message));
    return () => { cancelled = true; };
  }, [googleClientId, setUser, onDone]);

  async function devSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const { user } = await api.auth.dev(devEmail);
      setUser(user);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {googleClientId && <div ref={ref} className="min-h-10" />}
      {!googleClientId && devLogin && (
        <form onSubmit={devSubmit} className="flex w-full max-w-sm gap-2">
          <input className="field" type="email" required placeholder="you@college.edu (dev login)" value={devEmail} onChange={(e) => setDevEmail(e.target.value)} />
          <button className="btn-primary shrink-0">Sign in</button>
        </form>
      )}
      {!googleClientId && !devLogin && <p className="text-sm text-muted">Sign-in isn't configured on this server yet.</p>}
      {error && <p className="text-sm text-accent-ink">{error}</p>}
    </div>
  );
}

/** Wraps a page/section that needs a signed-in user. */
export function RequireSignIn({ children, reason }: { children: ReactNode; reason: string }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-sunken" />;
  if (user) return <>{children}</>;
  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-sunken"><Lock className="size-5" /></span>
      <div>
        <p className="font-medium">Sign in to continue</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{reason}</p>
      </div>
      <SignInButton />
    </div>
  );
}
