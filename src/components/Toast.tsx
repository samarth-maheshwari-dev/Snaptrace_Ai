import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

type Tone = 'success' | 'error';
interface ToastMsg { id: number; tone: Tone; title: string; body?: string }

const ToastCtx = createContext<(tone: Tone, title: string, body?: string) => void>(() => {});

/** Replaces the browser alert() calls the old UI used everywhere. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const push = useCallback((tone: Tone, title: string, body?: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, title, body }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-lift)]"
          >
            {t.tone === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
            ) : (
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-accent" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{t.title}</p>
              {t.body && <p className="mt-0.5 text-sm text-muted">{t.body}</p>}
            </div>
            <button
              aria-label="Dismiss"
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
              className="rounded-full p-1 text-faint hover:bg-sunken hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
