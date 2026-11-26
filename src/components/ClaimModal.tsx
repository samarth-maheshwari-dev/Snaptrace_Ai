import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import type { PublicItem } from '../types';
import { api } from '../lib/api';
import { ItemThumb } from './ItemCard';
import { useAuth } from '../lib/auth';
import { RequireSignIn } from './SignIn';

interface Props {
  item: PublicItem;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClaimModal({ item, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState({ studentId: '', phone: '', proof: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes; focus moves into the dialog; background doesn't scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('input, button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.createClaim({
        item_id: item.id,
        student_id: form.studentId,
        phone: form.phone || undefined,
        proof_text: form.proof,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-title"
        className="relative flex max-h-[92dvh] w-full max-w-lg animate-rise flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[var(--shadow-lift)] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div className="flex items-center gap-3">
            <div className="size-12 shrink-0 overflow-hidden rounded-xl"><ItemThumb item={item} /></div>
            <div>
              <p className="eyebrow">Claim this item</p>
              <h2 id="claim-title" className="font-medium text-ink">{item.title}</h2>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted hover:bg-sunken hover:text-ink">
            <X className="size-5" />
          </button>
        </div>

        {!user ? (
          <div className="p-5"><RequireSignIn reason="Claims are tied to your Google account so staff can verify you and contact you."><span /></RequireSignIn></div>
        ) : (
        <form onSubmit={submit} className="space-y-4 overflow-y-auto p-5">
          <p className="rounded-xl bg-sunken/70 px-3.5 py-2.5 text-sm text-ink-soft">
            Claiming as <span className="font-medium">{user?.name}</span> · {user?.email}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="c-sid">Student / staff ID</label>
              <input id="c-sid" className="field font-mono" required minLength={3} value={form.studentId} onChange={set('studentId')} />
            </div>
            <div>
              <label className="label" htmlFor="c-phone">Phone <span className="font-normal text-faint">(optional)</span></label>
              <input id="c-phone" type="tel" className="field" value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="c-proof">How can you prove it's yours?</label>
            <textarea
              id="c-proof" required minLength={20} rows={4} className="field resize-none" value={form.proof} onChange={set('proof')}
              placeholder="Something not visible in the photo — wallpaper, what's inside, a scratch underneath, the engraving…"
            />
            <p className="mt-1.5 text-xs text-muted">Don't repeat what's in the listing. Staff use this to check ownership.</p>
          </div>

          {error && <p className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm text-accent-ink">{error}</p>}

          <div className="flex items-start gap-2.5 rounded-xl bg-sunken/70 p-3 text-xs text-muted">
            <ShieldCheck className="size-4 shrink-0 text-ink-soft" />
            A staff member reviews your proof and then puts you in touch with the finder. Contact details are never shown publicly.
          </div>

          <button type="submit" disabled={busy} className="btn-primary w-full py-3">
            {busy ? 'Sending…' : 'Send claim for review'}
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
