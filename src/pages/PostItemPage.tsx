import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Category, ItemType } from '../types';
import { api } from '../lib/api';
import { compressImage } from '../lib/image';
import { CATEGORY_LIST, CATEGORY_META, today } from '../lib/catalog';
import ImagePicker, { useObjectUrl } from '../components/ImagePicker';
import { useToast } from '../components/Toast';
import { RequireSignIn } from '../components/SignIn';
import { useAuth } from '../lib/auth';

/**
 * One page, not a 3-step wizard: the old wizard hid validation errors behind alert()
 * and lost everything on a refresh. Photo is optional but strongly encouraged.
 */
export default function PostItemPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const { user } = useAuth();

  const [type, setType] = useState<ItemType>(params.get('type') === 'lost' ? 'lost' : 'found');
  const [file, setFile] = useState<File | null>(null);
  const preview = useObjectUrl(file);
  const [form, setForm] = useState({
    title: '', category: '' as Category | '', location: '', date: today(), description: '',
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.category) return setError('Pick a category.');
    setError('');
    try {
      let image_id: string | undefined;
      if (file) {
        setBusy('Uploading and reading the photo…');
        const upload = await api.uploadImage(await compressImage(file));
        image_id = upload.imageId;
        if (upload.aiError) toast('error', 'Photo saved, but not analysed', upload.aiError);
      }
      setBusy('Saving your report…');
      const { item, matches } = await api.createItem({
        type,
        title: form.title,
        category: form.category,
        location: form.location,
        date_occurred: form.date,
        description: form.description || undefined,
        image_id,
      });
      toast(
        'success',
        'Report posted',
        matches.length ? `We already found ${matches.length} possible match${matches.length > 1 ? 'es' : ''}.` : undefined,
      );
      navigate(`/item/${item.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post the report.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="container-page max-w-2xl py-12">
      <p className="eyebrow">Report an item</p>
      <h1 className="mt-3 font-display text-5xl">{type === 'found' ? 'You found something.' : 'You lost something.'}</h1>
      <p className="mt-3 text-muted">
        {type === 'found'
          ? 'Thank you. Hand it to the nearest desk and post it here so the owner can find it.'
          : 'Post it here. If someone hands in a match, it shows up on your listing.'}
      </p>

      <div className="mt-8 inline-flex rounded-full border border-line-strong bg-surface p-1" role="radiogroup" aria-label="Report type">
        {(['found', 'lost'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={`rounded-full px-5 py-2 text-sm transition-colors ${type === t ? 'bg-ink text-canvas' : 'text-ink-soft hover:text-ink'}`}
          >
            I {t} something
          </button>
        ))}
      </div>

      <div className="mt-8">
      <RequireSignIn reason="Reports are linked to your Google account, so staff can reach you and nobody can post fake reports in your name.">
      <form onSubmit={submit} className="space-y-8">
        <section className="space-y-3">
          <h2 className="font-medium">Photo <span className="font-normal text-faint">— optional, but it's what makes matching work</span></h2>
          <ImagePicker file={file} previewUrl={preview} onChange={setFile} onReject={(m) => toast('error', m)} />
        </section>

        <section className="space-y-4">
          <h2 className="font-medium">About the item</h2>
          <div>
            <label className="label" htmlFor="title">What is it?</label>
            <input id="title" className="field" required minLength={3} maxLength={80} value={form.title} onChange={set('title')} placeholder="e.g. Black Dell laptop" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="category">Category</label>
              <select id="category" className="field" required value={form.category} onChange={set('category')}>
                <option value="" disabled>Choose…</option>
                {CATEGORY_LIST.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="date">{type === 'found' ? 'Date found' : 'Date lost'}</label>
              <input id="date" type="date" className="field" required max={today()} value={form.date} onChange={set('date')} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="location">{type === 'found' ? 'Where did you find it?' : 'Where did you last have it?'}</label>
            <input id="location" className="field" required minLength={2} maxLength={120} value={form.location} onChange={set('location')} placeholder="e.g. Central library, 2nd floor" />
          </div>
          <div>
            <label className="label" htmlFor="desc">Details <span className="font-normal text-faint">(optional)</span></label>
            <textarea id="desc" rows={3} maxLength={500} className="field resize-none" value={form.description} onChange={set('description')}
              placeholder={type === 'found' ? "Visible details only. Keep one detail back so the owner can prove it's theirs." : 'Stickers, scratches, keychains, what was inside…'} />
          </div>
        </section>

        <p className="rounded-xl bg-sunken/70 px-4 py-3 text-sm text-muted">
          Posting as <span className="font-medium text-ink">{user?.name}</span> ({user?.email}). Only staff see your email; the listing shows your first name.
        </p>

        {error && <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-ink">{error}</p>}

        <button type="submit" disabled={!!busy} className="btn-accent w-full py-3.5">
          {busy ?? `Post ${type} report`}
        </button>
      </form>
      </RequireSignIn>
      </div>
    </div>
  );
}
