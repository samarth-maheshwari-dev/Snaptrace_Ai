import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, ScanSearch, ShieldCheck } from 'lucide-react';
import type { PublicItem } from '../types';
import { api } from '../lib/api';
import ItemCard, { ItemGridSkeleton } from '../components/ItemCard';
import { ScoreRing } from '../components/Badges';

const STEPS = [
  {
    icon: Camera,
    title: 'Snap a photo',
    body: 'Upload a photo of what you lost — or one like it. No forms full of guesses.',
  },
  {
    icon: ScanSearch,
    title: 'We compare it',
    body: 'Gemini Vision describes the item; we score it against everything handed in, and show why it matched.',
  },
  {
    icon: ShieldCheck,
    title: 'Prove it, collect it',
    body: 'Tell staff something only the owner would know. They verify it and connect you with the finder.',
  },
];

/** Static hero composition: a "photo" pinned next to the match it found. */
function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-md" aria-hidden>
      <div className="absolute left-0 top-6 w-[58%] -rotate-3 rounded-2xl border border-line bg-surface p-2.5 shadow-[var(--shadow-lift)]">
        <div className="relative overflow-hidden rounded-xl">
          <img src="/images/items/bottle.svg" alt="" className="aspect-square w-full object-cover" />
          <div className="absolute inset-x-0 top-0 h-1/4 animate-scan bg-gradient-to-b from-transparent via-white/50 to-transparent" />
        </div>
        <p className="px-1 pb-0.5 pt-2.5 font-mono text-[11px] text-muted">your_photo.jpg</p>
      </div>
      <div className="absolute bottom-2 right-0 w-[60%] rotate-2 rounded-2xl border border-line bg-surface p-3 shadow-[var(--shadow-lift)]">
        <div className="flex items-center gap-3">
          <img src="/images/items/bottle.svg" alt="" className="size-14 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Blue steel water bottle</p>
            <p className="truncate text-xs text-muted">Found · Sports ground</p>
          </div>
          <ScoreRing score={86} size={48} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="chip">Same colour</span>
          <span className="chip">Dent on side</span>
        </div>
      </div>
      <svg className="absolute left-[44%] top-[46%] w-[22%] text-accent" viewBox="0 0 100 60" fill="none">
        <path d="M2 8 C 40 0, 70 20, 92 50" stroke="currentColor" strokeWidth="2" strokeDasharray="4 5" />
        <path d="M84 50 L93 52 L91 42" stroke="currentColor" strokeWidth="2" />
      </svg>
    </div>
  );
}

export default function HomePage() {
  const [items, setItems] = useState<PublicItem[] | null>(null);

  useEffect(() => {
    api.listItems().then(setItems).catch(() => setItems([]));
  }, []);

  const recent = items?.filter((i) => i.status !== 'resolved').slice(0, 6);
  const stats = items && {
    waiting: items.filter((i) => i.type === 'found' && i.status !== 'resolved').length,
    lost: items.filter((i) => i.type === 'lost' && i.status === 'open').length,
    returned: items.filter((i) => i.status === 'resolved').length,
  };

  return (
    <>
      {/* Hero */}
      <section className="container-page grid items-center gap-12 pb-20 pt-14 md:grid-cols-[1.1fr_1fr] md:pt-20">
        <div className="animate-rise">
          <p className="eyebrow">Campus lost &amp; found</p>
          <h1 className="mt-4 font-display text-[clamp(2.75rem,6vw,4.75rem)] leading-[0.98] tracking-tight">
            Lost something?
            <br />
            <em className="text-accent">Show us</em> what it looked like.
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted">
            “Blue bottle” matches forty listings. A photo of <em>your</em> bottle — dent and all — matches one.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/search" className="btn-accent px-6 py-3">
              <Camera className="size-4" /> Search with a photo
            </Link>
            <Link to="/report" className="btn-outline px-6 py-3">I found something</Link>
          </div>
          {stats && (
            <dl className="mt-10 flex gap-8 border-t border-line pt-6">
              {([
                ['Waiting to be claimed', stats.waiting],
                ['Reported lost', stats.lost],
                ['Returned', stats.returned],
              ] as const).map(([label, n]) => (
                <div key={label}>
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-1 font-mono text-2xl">{n}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <HeroVisual />
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-surface">
        <div className="container-page py-16">
          <h2 className="font-display text-4xl">How it works</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="font-mono text-xs text-faint">0{i + 1}</span>
                <s.icon className="mt-3 size-6 text-ink" strokeWidth={1.5} />
                <h3 className="mt-4 text-lg font-medium">{s.title}</h3>
                <p className="mt-2 text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Recent */}
      <section className="container-page pt-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-4xl">Recently reported</h2>
            <p className="mt-2 text-muted">Handed in at desks across campus this week.</p>
          </div>
          <Link to="/browse" className="btn-ghost hidden sm:inline-flex">
            See all <ArrowRight className="size-4" />
          </Link>
        </div>
        {!recent ? (
          <ItemGridSkeleton />
        ) : recent.length === 0 ? (
          <p className="card p-10 text-center text-muted">Nothing reported yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
        <Link to="/browse" className="btn-outline mt-8 w-full sm:hidden">See all items</Link>
      </section>
    </>
  );
}
