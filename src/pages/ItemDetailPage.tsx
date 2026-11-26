import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, ShieldCheck, Sparkles, User } from 'lucide-react';
import { format } from 'date-fns';
import type { Match, PublicItem } from '../types';
import { api } from '../lib/api';
import { categoryLabel, timeAgo } from '../lib/catalog';
import { ItemThumb } from '../components/ItemCard';
import { StatusBadge, TypeBadge } from '../components/Badges';
import MatchRow from '../components/MatchRow';
import ClaimModal from '../components/ClaimModal';
import { useToast } from '../components/Toast';

function ActionPanel({ item, onClaim }: { item: PublicItem; onClaim: () => void }) {
  if (item.status === 'resolved') {
    return (
      <div className="rounded-2xl bg-success-soft p-5 text-success">
        <p className="font-medium">Returned to its owner</p>
        <p className="mt-1 text-sm opacity-80">This case is closed.</p>
      </div>
    );
  }
  if (item.mine) {
    return (
      <div className="card space-y-2 p-5">
        <p className="font-medium">You reported this item</p>
        <p className="text-sm text-muted">Staff will email you when a claim is verified. Possible matches are listed below.</p>
      </div>
    );
  }
  if (item.type === 'lost') {
    return (
      <div className="card space-y-3 p-5">
        <p className="font-medium">Have you seen this?</p>
        <p className="text-sm text-muted">Hand it to any desk and post it as found — the owner will be matched automatically.</p>
        <Link to="/report?type=found" className="btn-primary w-full">I found this</Link>
      </div>
    );
  }
  return (
    <div className="card space-y-4 p-5">
      <div>
        <p className="font-medium">Is this yours?</p>
        <p className="mt-1 text-sm text-muted">
          {item.status === 'claimed'
            ? 'Someone has already claimed it and staff are reviewing. If it is yours, claim it too — staff will compare the proofs.'
            : 'Send a claim with a detail only the owner would know.'}
        </p>
      </div>
      <button onClick={onClaim} className="btn-accent w-full py-3">Claim this item</button>
      <p className="flex items-start gap-2 text-xs text-muted">
        <ShieldCheck className="size-4 shrink-0" /> Contact details stay private until staff verify your claim.
      </p>
    </div>
  );
}

export default function ItemDetailPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const [data, setData] = useState<{ item: PublicItem; matches: Match[] } | null>(null);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(() => {
    api.getItem(id).then(setData).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    setData(null);
    setError('');
    load();
  }, [load]);

  if (error) {
    return (
      <div className="container-page py-32 text-center">
        <h1 className="font-display text-4xl">Item not found</h1>
        <p className="mt-2 text-muted">It may have been removed.</p>
        <Link to="/browse" className="btn-primary mt-6">Browse items</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.2fr_1fr]" aria-busy="true">
        <div className="aspect-square animate-pulse rounded-3xl bg-sunken" />
        <div className="space-y-4">
          <div className="h-10 w-3/4 animate-pulse rounded bg-sunken" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-sunken" />
        </div>
      </div>
    );
  }

  const { item, matches } = data;
  const d = item.descriptor_json;

  return (
    <div className="container-page py-10">
      <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All items
      </Link>

      <div className="mt-6 grid gap-10 md:grid-cols-[1.15fr_1fr]">
        <div className="aspect-square overflow-hidden rounded-3xl border border-line bg-sunken">
          <ItemThumb item={item} />
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap gap-2">
              <TypeBadge type={item.type} />
              <StatusBadge status={item.status} />
            </div>
            <h1 className="mt-4 font-display text-5xl leading-tight">{item.title}</h1>
            {item.description && <p className="mt-3 text-ink-soft">{item.description}</p>}
          </div>

          <dl className="grid gap-4 border-y border-line py-5 text-sm sm:grid-cols-2">
            <div className="flex gap-3"><MapPin className="size-4 shrink-0 text-muted" /><div><dt className="text-muted">Where</dt><dd>{item.location}</dd></div></div>
            <div className="flex gap-3"><Calendar className="size-4 shrink-0 text-muted" /><div><dt className="text-muted">When</dt><dd>{format(new Date(item.date_occurred), 'd MMM yyyy')}</dd></div></div>
            <div className="flex gap-3"><User className="size-4 shrink-0 text-muted" /><div><dt className="text-muted">Reported by</dt><dd>{item.reporter}</dd></div></div>
            <div className="flex gap-3"><Sparkles className="size-4 shrink-0 text-muted" /><div><dt className="text-muted">Category</dt><dd>{categoryLabel(item.category)} · posted {timeAgo(item.created_at)}</dd></div></div>
          </dl>

          <ActionPanel item={item} onClaim={() => setClaiming(true)} />

          {d && d.source === 'vision' && (
            <div>
              <p className="eyebrow">Detected from the photo</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[d.primaryColor, d.brand, d.material, ...d.distinctiveFeatures].filter(Boolean).map((t) => (
                  <span key={t as string} className="chip capitalize">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="mt-20">
        <h2 className="font-display text-3xl">
          {item.type === 'lost' ? 'Found items that could be this' : 'Lost reports that could be this'}
        </h2>
        <p className="mt-1 text-sm text-muted">Ranked by visual similarity. Updated whenever something new is reported.</p>
        <div className="mt-6 space-y-3">
          {matches.length ? (
            matches.map((m, i) => <MatchRow key={m.item.id} match={m} rank={i} />)
          ) : (
            <p className="card p-8 text-center text-sm text-muted">No likely matches yet.</p>
          )}
        </div>
      </section>

      {claiming && (
        <ClaimModal
          item={item}
          onClose={() => setClaiming(false)}
          onSuccess={() => {
            setClaiming(false);
            toast('success', 'Claim sent for review', 'Staff will check your proof and email you.');
            load();
          }}
        />
      )}
    </div>
  );
}
