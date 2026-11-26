import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { PublicItem } from '../types';
import { CATEGORY_META, timeAgo } from '../lib/catalog';
import { StatusBadge, TypeBadge } from './Badges';

export function ItemThumb({ item, className = '' }: { item: Pick<PublicItem, 'image_url' | 'title' | 'category'>; className?: string }) {
  const [broken, setBroken] = useState(false);
  const Icon = CATEGORY_META[item.category]?.icon ?? CATEGORY_META.other.icon;
  if (item.image_url && !broken) {
    return (
      <img
        src={item.image_url}
        alt={item.title}
        loading="lazy"
        onError={() => setBroken(true)}
        className={`size-full object-cover ${className}`}
      />
    );
  }
  return (
    <div className={`grid size-full place-items-center bg-sunken text-faint ${className}`}>
      <Icon className="size-1/4 min-h-6 min-w-6" strokeWidth={1.25} />
    </div>
  );
}

export default function ItemCard({ item }: { item: PublicItem }) {
  return (
    <Link
      to={`/item/${item.id}`}
      className="group card flex flex-col overflow-hidden transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <ItemThumb item={item} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        <div className="absolute left-3 top-3"><TypeBadge type={item.type} /></div>
        {item.status !== 'open' && <div className="absolute right-3 top-3"><StatusBadge status={item.status} /></div>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-1 font-medium text-ink">{item.title}</h3>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="size-3.5 shrink-0" />
          <span className="line-clamp-1">{item.location}</span>
        </p>
        <p className="mt-auto pt-2 font-mono text-xs text-faint">{timeAgo(item.created_at)}</p>
      </div>
    </Link>
  );
}

export function ItemGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading items">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="aspect-[4/3] animate-pulse bg-sunken" />
          <div className="space-y-2.5 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-sunken" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-sunken" />
          </div>
        </div>
      ))}
    </div>
  );
}
