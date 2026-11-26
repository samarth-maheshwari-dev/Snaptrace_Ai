import { Link } from 'react-router-dom';
import { MapPin, Check, AlertTriangle, Sparkles } from 'lucide-react';
import type { Match } from '../types';
import { timeAgo } from '../lib/catalog';
import { ItemThumb } from './ItemCard';
import { ScoreRing, StatusBadge } from './Badges';

export default function MatchRow({ match, rank, action }: { match: Match; rank: number; action?: React.ReactNode }) {
  const { item, score, reasons, warnings, confidence, verified } = match;
  const aiNote = reasons.find((r) => r.startsWith('AI check:'));
  const plain = reasons.filter((r) => r !== aiNote);
  return (
    <div className="card flex animate-rise flex-col gap-4 p-4 sm:flex-row sm:items-center" style={{ animationDelay: `${rank * 70}ms` }}>
      <Link to={`/item/${item.id}`} className="block size-24 shrink-0 overflow-hidden rounded-xl">
        <ItemThumb item={item} />
      </Link>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/item/${item.id}`} className="font-medium text-ink hover:underline">{item.title}</Link>
          {item.status !== 'open' && <StatusBadge status={item.status} />}
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="size-3.5" /> {item.location} · {timeAgo(item.created_at)}
        </p>
        {aiNote && (
          <p className="flex items-start gap-1.5 text-sm text-ink-soft">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" /> {aiNote.replace('AI check: ', '')}
          </p>
        )}
        {(plain.length > 0 || warnings.length > 0) && (
          <ul className="flex flex-wrap gap-1.5 pt-1">
            {plain.map((r) => (
              <li key={r} className="chip"><Check className="size-3 text-success" /> {r}</li>
            ))}
            {warnings.map((w) => (
              <li key={w} className="chip border-warning/30 bg-warning-soft text-warning"><AlertTriangle className="size-3" /> {w}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center gap-4 sm:flex-col sm:items-end">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted sm:hidden">Match</span>
          <ScoreRing score={score} />
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wide text-faint">{verified ? 'AI-verified · ' : ''}{confidence} confidence</span>
        {action}
      </div>
    </div>
  );
}
