import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MyClaim, PublicItem } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { timeAgo } from '../lib/catalog';
import ItemCard, { ItemThumb } from '../components/ItemCard';
import { RequireSignIn } from '../components/SignIn';

const CLAIM_STATUS: Record<MyClaim['status'], { label: string; cls: string; help: string }> = {
  pending: { label: 'Under review', cls: 'bg-warning-soft text-warning', help: 'Staff are checking your proof.' },
  approved: { label: 'Approved', cls: 'bg-success-soft text-success', help: 'Staff will email you to arrange pickup.' },
  rejected: { label: 'Not approved', cls: 'bg-sunken text-muted', help: "Your proof didn't match. Visit the desk if you think this is wrong." },
};

function Activity() {
  const [items, setItems] = useState<PublicItem[] | null>(null);
  const [claims, setClaims] = useState<MyClaim[] | null>(null);

  useEffect(() => {
    api.listItems({ mine: '1' }).then(setItems).catch(() => setItems([]));
    api.myClaims().then(setClaims).catch(() => setClaims([]));
  }, []);

  return (
    <div className="space-y-14">
      <section>
        <h2 className="font-display text-3xl">Your claims</h2>
        <div className="mt-5 space-y-3">
          {claims === null ? <div className="h-20 animate-pulse rounded-2xl bg-sunken" /> : claims.length === 0 ? (
            <p className="card p-6 text-sm text-muted">You haven't claimed anything. <Link to="/search" className="underline">Search with a photo</Link>.</p>
          ) : claims.map((c) => {
            const st = CLAIM_STATUS[c.status];
            return (
              <div key={c.id} className="card flex items-center gap-4 p-4">
                {c.item && <Link to={`/item/${c.item.id}`} className="size-14 shrink-0 overflow-hidden rounded-xl"><ItemThumb item={c.item} /></Link>}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.item?.title ?? 'Item removed'}</p>
                  <p className="text-sm text-muted">{st.help} · {timeAgo(c.created_at)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${st.cls}`}>{st.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display text-3xl">Your reports</h2>
        <div className="mt-5">
          {items === null ? <div className="h-40 animate-pulse rounded-2xl bg-sunken" /> : items.length === 0 ? (
            <p className="card p-6 text-sm text-muted">No reports yet. <Link to="/report" className="underline">Report an item</Link>.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((i) => <ItemCard key={i.id} item={i} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function MyActivityPage() {
  const { user } = useAuth();
  return (
    <div className="container-page py-12">
      <p className="eyebrow">Account</p>
      <h1 className="mt-3 font-display text-5xl">{user ? `Hi, ${user.name.split(' ')[0]}` : 'Sign in'}</h1>
      <div className="mt-10">
        <RequireSignIn reason="See your reports and the status of your claims.">
          <Activity />
        </RequireSignIn>
      </div>
    </div>
  );
}
