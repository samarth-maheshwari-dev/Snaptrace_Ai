import type { ItemStatus, ItemType } from '../types';

export function TypeBadge({ type }: { type: ItemType }) {
  return type === 'found' ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-found-soft px-2.5 py-1 text-xs font-medium text-found">
      <span className="size-1.5 rounded-full bg-found" /> Found
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">
      <span className="size-1.5 rounded-full bg-accent" /> Lost
    </span>
  );
}

const STATUS: Record<ItemStatus, { label: string; cls: string }> = {
  open: { label: 'Open', cls: 'bg-surface text-ink-soft border border-line' },
  claimed: { label: 'Claim pending', cls: 'bg-warning-soft text-warning' },
  resolved: { label: 'Returned', cls: 'bg-success-soft text-success' },
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  const s = STATUS[status];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

/** Match score as a ring + number. Colour bands match the server's thresholds. */
export function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const tone = score >= 75 ? 'text-success' : score >= 55 ? 'text-warning' : 'text-faint';
  return (
    <div className={`relative grid shrink-0 place-items-center ${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={4} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <span className="absolute font-mono text-sm font-medium text-ink">{score}</span>
    </div>
  );
}
