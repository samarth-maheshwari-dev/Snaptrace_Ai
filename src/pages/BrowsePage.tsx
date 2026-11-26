import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import type { Category, PublicItem } from '../types';
import { api, type ListFilters } from '../lib/api';
import { CATEGORY_LIST, CATEGORY_META } from '../lib/catalog';
import ItemCard, { ItemGridSkeleton } from '../components/ItemCard';

const TYPES = [
  { value: '', label: 'All' },
  { value: 'found', label: 'Found' },
  { value: 'lost', label: 'Lost' },
] as const;

export default function BrowsePage() {
  // Filters live in the URL so a filtered view can be shared or bookmarked.
  const [params, setParams] = useSearchParams();
  const type = (params.get('type') ?? '') as NonNullable<ListFilters['type']> | '';
  const category = (params.get('category') ?? '') as Category | '';
  const q = params.get('q') ?? '';
  const showReturned = params.get('returned') === '1';
  const [query, setQuery] = useState(q);
  const [items, setItems] = useState<PublicItem[] | null>(null);
  const [error, setError] = useState('');

  const update = (key: string, value: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
  };

  // Debounce the text search into the URL.
  useEffect(() => {
    if (query.trim() === q) return;
    const t = setTimeout(() => update('q', query.trim()), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    let cancelled = false; // ignore stale responses when filters change quickly
    setItems(null);
    setError('');
    api
      .listItems({ type: type || undefined, category: category || undefined, q: q || undefined })
      .then((data) => !cancelled && setItems(showReturned ? data : data.filter((i) => i.status !== 'resolved')))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [type, category, q, showReturned]);

  const hasFilters = type || category || q || showReturned;

  return (
    <div className="container-page py-12">
      <h1 className="font-display text-5xl">Browse</h1>
      <p className="mt-2 text-muted">Everything handed in or reported missing on campus.</p>

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              className="field rounded-full pl-10"
              placeholder="Search by name or place — “library”, “keys”…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search items"
            />
          </div>
          <div className="inline-flex self-start rounded-full border border-line-strong bg-surface p-1" role="tablist">
            {TYPES.map((t) => (
              <button
                key={t.value}
                role="tab"
                aria-selected={type === t.value}
                onClick={() => update('type', t.value)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${type === t.value ? 'bg-ink text-canvas' : 'text-ink-soft hover:text-ink'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {CATEGORY_LIST.map((c) => {
            const { icon: Icon, label } = CATEGORY_META[c];
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => update('category', active ? '' : c)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active ? 'border-ink bg-ink text-canvas' : 'border-line-strong bg-surface text-ink-soft hover:border-ink'
                }`}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="inline-flex cursor-pointer items-center gap-2 text-muted">
            <input type="checkbox" className="accent-ink" checked={showReturned} onChange={(e) => update('returned', e.target.checked ? '1' : '')} />
            Include returned items
          </label>
          {hasFilters && (
            <button onClick={() => { setQuery(''); setParams({}, { replace: true }); }} className="inline-flex items-center gap-1 text-muted hover:text-ink">
              <X className="size-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="mt-8">
        {error ? (
          <p className="card p-10 text-center text-accent-ink">{error}</p>
        ) : !items ? (
          <ItemGridSkeleton />
        ) : items.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="font-medium">No items match those filters.</p>
            <p className="mt-1 text-sm text-muted">Try a broader search, or search with a photo instead.</p>
          </div>
        ) : (
          <>
            <p className="mb-4 font-mono text-xs text-muted">{items.length} item{items.length === 1 ? '' : 's'}</p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => <ItemCard key={item.id} item={item} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
