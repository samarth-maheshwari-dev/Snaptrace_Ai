import { Component, useEffect, useState, type ReactNode } from 'react';

/** One broken page shouldn't blank the whole app (the old UI had no boundary at all). */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="container-page py-24 text-center">
        <h1 className="font-display text-4xl">Something broke on this page.</h1>
        <p className="mt-2 font-mono text-sm text-muted">{this.state.error.message}</p>
        <button onClick={() => location.reload()} className="btn-primary mt-6">Reload</button>
      </div>
    );
  }
}
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../lib/auth';

const LINKS = [
  { to: '/browse', label: 'Browse' },
  { to: '/search', label: 'Photo search' },
  { to: '/report', label: 'Report an item' },
];

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="SnapTrace home">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <path d="M4 6a2 2 0 0 1 2-2h12l10 12-10 12H6a2 2 0 0 1-2-2z" fill="var(--color-accent)" />
        <circle cx="10" cy="16" r="3" fill="var(--color-canvas)" />
      </svg>
      <span className="text-[17px] font-semibold tracking-tight">SnapTrace</span>
    </Link>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user, loading, signOut } = useAuth();
  useEffect(() => { setOpen(false); }, [pathname]);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3.5 py-2 text-sm transition-colors ${isActive ? 'bg-ink text-canvas' : 'text-ink-soft hover:bg-sunken'}`;

  const links = [
    ...LINKS,
    ...(user ? [{ to: '/me', label: 'My activity' }] : []),
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Staff desk' }] : []),
  ];

  const account = loading ? null : user ? (
    <div className="flex items-center gap-2">
      {user.picture ? (
        <img src={user.picture} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full" />
      ) : (
        <span className="grid size-8 place-items-center rounded-full bg-sunken text-sm font-medium">{user.name[0]?.toUpperCase()}</span>
      )}
      <button onClick={signOut} className="btn-ghost px-3 py-1.5" title={user.email}>Sign out</button>
    </div>
  ) : (
    <Link to="/me" className="btn-outline py-2">Sign in</Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkCls}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block">{account}</div>
        <button
          className="rounded-full p-2 text-ink md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-line bg-canvas px-4 pb-4 pt-2 md:hidden">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `block rounded-xl px-3 py-3 text-base ${isActive ? 'bg-sunken font-medium' : ''}`}>
              {l.label}
            </NavLink>
          ))}
          <div className="mt-3 border-t border-line pt-3">{account}</div>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page flex flex-col gap-6 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-xs">Campus lost &amp; found. Search with a photo instead of guessing keywords.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link to="/browse" className="hover:text-ink">Browse</Link>
          <Link to="/search" className="hover:text-ink">Photo search</Link>
          <Link to="/report" className="hover:text-ink">Report</Link>
          <Link to="/admin" className="hover:text-ink">Staff</Link>
          <a href="https://github.com/samarth-maheshwari-dev/Snaptrace_Ai" className="hover:text-ink" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
