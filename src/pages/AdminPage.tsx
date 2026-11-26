import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, LogOut, Trash2, X } from 'lucide-react';
import type { AdminStats, ClaimWithItem, Item } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { RequireSignIn } from '../components/SignIn';
import { categoryLabel, timeAgo } from '../lib/catalog';
import { ItemThumb } from '../components/ItemCard';
import { TypeBadge } from '../components/Badges';
import { useToast } from '../components/Toast';

type Tab = 'claims' | 'items' | 'overview';

export default function AdminPage() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") {
    return (
      <div className="container-page max-w-md py-20">
        <p className="eyebrow">Staff</p>
        <h1 className="mt-3 font-display text-4xl">Staff desk</h1>
        <div className="mt-8">
          <RequireSignIn reason="Sign in with a staff Google account.">
            <p className="card p-6 text-sm text-muted">Signed in as {user?.email}. This account doesn't have staff access.</p>
          </RequireSignIn>
        </div>
      </div>
    );
  }
  return <Dashboard />;
}

function Dashboard() {
  const toast = useToast();
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('claims');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [claims, setClaims] = useState<ClaimWithItem[]>([]);
  const [showAllClaims, setShowAllClaims] = useState(false);

  const handleErr = useCallback((e: unknown) => {
    toast('error', e instanceof Error ? e.message : 'Something went wrong');
  }, [toast]);

  const refresh = useCallback(async () => {
    try {
      const [s, i, c] = await Promise.all([api.admin.stats(), api.admin.items(), api.admin.claims()]);
      setStats(s); setItems(i); setClaims(c);
    } catch (e) {
      handleErr(e);
    }
  }, [handleErr]);

  useEffect(() => { refresh(); }, [refresh]);

  async function decide(c: ClaimWithItem, decision: 'approve' | 'reject') {
    try {
      await api.admin.decide(c.id, decision);
      toast('success', decision === 'approve' ? 'Claim approved' : 'Claim rejected',
        decision === 'approve' && c.item ? `Put ${c.claimer_email} in touch with ${c.item.contact_email}.` : undefined);
      refresh();
    } catch (e) { handleErr(e); }
  }

  async function setStatus(item: Item, status: Item['status']) {
    try { await api.admin.setStatus(item.id, status); refresh(); } catch (e) { handleErr(e); }
  }

  async function remove(item: Item) {
    if (!window.confirm(`Delete “${item.title}”? This also deletes its claims.`)) return;
    try { await api.admin.deleteItem(item.id); toast('success', 'Deleted'); refresh(); } catch (e) { handleErr(e); }
  }

  const visibleClaims = showAllClaims ? claims : claims.filter((c) => c.status === 'pending');
  const pending = claims.filter((c) => c.status === 'pending').length;

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Staff desk</p>
          <h1 className="mt-2 font-display text-5xl">Dashboard</h1>
        </div>
        <button onClick={signOut} className="btn-ghost">
          <LogOut className="size-4" /> Sign out
        </button>
      </div>

      {stats && (
        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
          {([
            ['Pending claims', stats.pendingClaims],
            ['Open found', stats.openFound],
            ['Open lost', stats.openLost],
            ['Recovery rate', `${stats.recoveryRate}%`],
          ] as const).map(([k, v]) => (
            <div key={k} className="bg-surface p-5">
              <dt className="text-sm text-muted">{k}</dt>
              <dd className="mt-1 font-mono text-3xl">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-10 flex gap-1 border-b border-line" role="tablist">
        {([['claims', `Claims${pending ? ` (${pending})` : ''}`], ['items', 'Items'], ['overview', 'Overview']] as const).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors ${tab === k ? 'border-ink font-medium text-ink' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'claims' && (
        <div className="mt-6 space-y-3">
          <label className="inline-flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="accent-ink" checked={showAllClaims} onChange={(e) => setShowAllClaims(e.target.checked)} />
            Show decided claims
          </label>
          {visibleClaims.length === 0 && <p className="card p-10 text-center text-muted">No claims waiting.</p>}
          {visibleClaims.map((c) => (
            <article key={c.id} className="card grid gap-5 p-5 md:grid-cols-[200px_1fr_auto]">
              {c.item ? (
                <Link to={`/item/${c.item.id}`} className="flex items-center gap-3 md:flex-col md:items-start">
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl md:aspect-square md:size-auto md:w-full"><ItemThumb item={c.item} /></div>
                  <div>
                    <p className="text-sm font-medium">{c.item.title}</p>
                    <p className="text-xs text-muted">{c.item.location}</p>
                  </div>
                </Link>
              ) : <p className="text-sm text-muted">Item deleted</p>}
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-medium">{c.claimer_name}</p>
                  <p className="font-mono text-xs text-muted">{c.student_id}</p>
                  <p className="text-xs text-muted">{c.claimer_email}{c.phone ? ` · ${c.phone}` : ''}</p>
                  <p className="text-xs text-faint">{timeAgo(c.created_at)}</p>
                </div>
                <blockquote className="rounded-xl bg-sunken/70 p-3.5 text-sm text-ink-soft">“{c.proof_text}”</blockquote>
                {c.item?.description && (
                  <p className="text-xs text-muted"><span className="font-medium">Finder's note:</span> {c.item.description}</p>
                )}
              </div>
              <div className="flex items-start gap-2 md:flex-col">
                {c.status === 'pending' ? (
                  <>
                    <button onClick={() => decide(c, 'approve')} className="btn-primary px-4 py-2"><Check className="size-4" /> Approve</button>
                    <button onClick={() => decide(c, 'reject')} className="btn-outline px-4 py-2"><X className="size-4" /> Reject</button>
                  </>
                ) : (
                  <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${c.status === 'approved' ? 'bg-success-soft text-success' : 'bg-sunken text-muted'}`}>
                    {c.status}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === 'items' && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="p-3 font-medium">Item</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Reporter</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="p-3">
                    <Link to={`/item/${i.id}`} className="flex items-center gap-3 hover:underline">
                      <div className="size-10 shrink-0 overflow-hidden rounded-lg"><ItemThumb item={i} /></div>
                      <div><p className="font-medium">{i.title}</p><p className="text-xs text-muted">{categoryLabel(i.category)} · {timeAgo(i.created_at)}</p></div>
                    </Link>
                  </td>
                  <td className="p-3"><TypeBadge type={i.type} /></td>
                  <td className="p-3"><p>{i.contact_name}</p><p className="text-xs text-muted">{i.contact_email}</p></td>
                  <td className="p-3">
                    <select
                      aria-label={`Status of ${i.title}`}
                      value={i.status}
                      onChange={(e) => setStatus(i, e.target.value as Item['status'])}
                      className="rounded-lg border border-line bg-surface px-2 py-1 text-xs"
                    >
                      <option value="open">Open</option>
                      <option value="claimed">Claim pending</option>
                      <option value="resolved">Returned</option>
                    </select>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => remove(i)} aria-label={`Delete ${i.title}`} className="rounded-full p-2 text-muted hover:bg-accent-soft hover:text-accent-ink">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'overview' && stats && (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="card p-5">
            <p className="font-medium">Reports, last 7 days</p>
            <div className="mt-4 h-56">
              <ResponsiveContainer>
                <BarChart data={stats.postsLast7Days}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted)" />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={24} stroke="var(--color-muted)" />
                  <Tooltip cursor={{ fill: 'var(--color-sunken)' }} contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)' }} />
                  <Bar dataKey="posted" name="Reports" fill="var(--color-ink)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-5">
            <p className="font-medium">By category</p>
            <ul className="mt-4 space-y-2.5">
              {[...stats.byCategory].sort((a, b) => b.value - a.value).map((c) => (
                <li key={c.name} className="text-sm">
                  <div className="flex justify-between"><span>{categoryLabel(c.name)}</span><span className="font-mono text-muted">{c.value}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(c.value / Math.max(1, stats.total)) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
