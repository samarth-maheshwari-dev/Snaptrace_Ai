import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert, Lock, ArrowRight, LayoutDashboard, Database, ClipboardCheck, BarChart3, LogOut,
  Sparkles, Check, X, AlertCircle, Eye, CheckCircle2, Trash2, Calendar, MapPin
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { Item, Claim } from '../types';

interface ClaimWithItem extends Claim {
  item?: Item;
}

export default function AdminPage() {
  // Password gate state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('snaptrace_admin_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [gateError, setGateError] = useState('');

  // Active Tab state: 'dashboard' | 'items' | 'claims' | 'stats'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'items' | 'claims' | 'stats'>('dashboard');

  // Backend fetched state
  const [stats, setStats] = useState<any>(null);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [allClaims, setAllClaims] = useState<ClaimWithItem[]>([]);
  const [loading, setLoading] = useState(true);

  // All Items spreadsheet filter states
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'lost' | 'found'>('all');
  const [itemStatusFilter, setItemStatusFilter] = useState<'all' | 'open' | 'claimed' | 'resolved'>('all');

  // Trigger content fetches on Auth or Tab updates
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchAdminData = async () => {
      setLoading(true);
      try {
        // Fetch Admin Statistics Overview
        const resStats = await fetch('/api/admin/stats');
        if (resStats.ok) {
          const statsData = await resStats.json();
          setStats(statsData);
        }

        // Fetch All Items
        const resItems = await fetch('/api/items');
        if (resItems.ok) {
          const itemsData = await resItems.json();
          setAllItems(itemsData);
        }

        // Fetch All Claims joined with Items
        const resClaims = await fetch('/api/admin/claims');
        if (resClaims.ok) {
          const claimsData = await resClaims.json();
          setAllClaims(claimsData);
        }
      } catch (err) {
        console.error('Failed to resolve admin data fetching:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [isAuthenticated, activeTab]);

  // Auth processing
  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'admin2026') {
      setIsAuthenticated(true);
      sessionStorage.setItem('snaptrace_admin_auth', 'true');
      setGateError('');
    } else {
      setGateError('Incorrect administrator password.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('snaptrace_admin_auth');
  };

  // Direct action handlers
  const handleMarkResolved = async (itemId: string) => {
    try {
      // Find any claim corresponding to this item that is still pending, and auto-approve it
      const claim = allClaims.find((c) => c.item_id === itemId && c.status === 'pending');
      if (claim) {
        await fetch(`/api/admin/claims/${claim.id}/approve`, { method: 'POST' });
      } else {
        // No claim, just update item status directly on item
        const item = allItems.find((i) => i.id === itemId);
        if (item) {
          await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, status: 'resolved' }),
          });
        }
      }

      alert('Item marked resolved successfully!');
      
      // Refresh
      const rStats = await fetch('/api/admin/stats');
      const sData = await rStats.json();
      setStats(sData);

      const rItems = await fetch('/api/items');
      const iData = await rItems.json();
      setAllItems(iData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this report from campus files? This action is irreversible.')) {
      return;
    }

    try {
      const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Report deleted successfully.');
        setAllItems((prev) => prev.filter((i) => i.id !== itemId));
        
        // Refresh metrics
        const rStats = await fetch('/api/admin/stats');
        const sData = await rStats.json();
        setStats(sData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveClaim = async (claimId: string) => {
    try {
      const res = await fetch(`/api/admin/claims/${claimId}/approve`, { method: 'POST' });
      if (res.ok) {
        alert('Claim approved successfully. Corresponding item is cataloged as resolved/returned!');
        setAllClaims((prev) =>
          prev.map((c) => (c.id === claimId ? { ...c, status: 'approved' } : c))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    try {
      const res = await fetch(`/api/admin/claims/${claimId}/reject`, { method: 'POST' });
      if (res.ok) {
        alert('Claim rejected. Item status reverts to open for search matches.');
        setAllClaims((prev) =>
          prev.map((c) => (c.id === claimId ? { ...c, status: 'rejected' } : c))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Truncate UUID to first 8 chars
  const formatId = (id: string) => id.split('-')[0] || id.slice(0, 8);

  const getRelativeTime = (isoString: string) => {
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true });
    } catch (e) {
      return 'recently';
    }
  };

  // TABLET/MOBILE RESPONSIVE NAVIGATION STREAMPEL
  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'items', name: 'All Items', icon: Database },
    { id: 'claims', name: 'Pending Claims', icon: ClipboardCheck },
    { id: 'stats', name: 'Stats Analysis', icon: BarChart3 },
  ] as const;

  // Render Lock Security panel
  if (!isAuthenticated) {
    return (
      <div className="bg-[#0D0D0D] text-[#F5F5F5] min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#161616] border border-[#2A2A2A] rounded-2xl p-8 max-w-sm w-full space-y-6 shadow-2xl text-center font-inter"
        >
          {/* Logo element */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FF2D55] to-[#FF6B35] flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-[#FF2D55]/30">
              S
            </div>
            <div>
              <h1 className="font-syne font-black text-white text-xl tracking-wide">Admin Access Panel</h1>
              <p className="text-[10px] uppercase font-mono tracking-widest text-[#FF2D55] font-bold">SnapTrace Verification</p>
            </div>
          </div>

          {gateError && (
            <div className="bg-red-500/10 border border-red-500/20 text-[#FF2D55] text-xs p-3.5 rounded-xl flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 animate-bounce" />
              <span>{gateError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono text-gray-500 tracking-wider block font-bold">Administrator Key</label>
              <div className="relative">
                <input
                  required
                  type="password"
                  placeholder="Enter access code..."
                  className="input-style pl-10 pr-4 text-xs h-11"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>
            </div>

            <button
              type="submit"
              className="button-primary w-full text-xs font-bold py-3 uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Enter Admin Portal
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <Link
            to="/"
            className="text-xs text-gray-400 hover:text-white hover:underline font-medium block"
          >
            ← Return to Public Workspace
          </Link>

        </motion.div>
      </div>
    );
  }

  // Filter spreadsheet elements
  const filteredSpreadsheetItems = allItems.filter((i) => {
    if (itemTypeFilter !== 'all' && i.type !== itemTypeFilter) return false;
    if (itemStatusFilter !== 'all' && i.status !== itemStatusFilter) return false;
    return true;
  });

  const pendingClaimsCount = allClaims.filter((c) => c.status === 'pending').length;

  return (
    <div className="bg-[#0D0D0D] text-[#F5F5F5] min-h-screen flex flex-col md:flex-row font-inter">
      
      {/* 1. LEFT FIXED SIDEBAR DESKTOP */}
      <aside className="w-full md:w-64 bg-[#161616] border-b md:border-r md:border-b-0 border-[#2A2A2A] md:h-screen sticky top-0 z-40 shrink-0 flex flex-row md:flex-col justify-between p-4 md:p-6">
        
        {/* Brand visual header inside desk */}
        <div className="flex items-center gap-3 md:mb-10 select-none">
          <div className="w-8 h-8 rounded-full bg-[#FF2D55] flex items-center justify-center font-bold text-white text-base">
            S
          </div>
          <span className="font-syne font-black text-base text-white tracking-wider hidden sm:block">
            nap<span className="text-[#FF2D55]">Trace</span> <span className="text-[10px] text-gray-500 font-mono tracking-tighter">ADM</span>
          </span>
        </div>

        {/* Tablet/Phone horizontal row or Desktop stack */}
        <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible items-center md:items-stretch flex-grow md:flex-grow-0 pt-1 md:pt-0">
          {navItems.map((tab) => {
            const ActiveIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold select-none cursor-pointer tracking-wider font-inter border-b-2 md:border-b-0 md:border-l-2 transition-all ${
                  isActive
                    ? 'text-[#FF2D55] border-[#FF2D55] bg-[#FF2D55]/5 font-bold'
                    : 'text-gray-400 border-transparent hover:text-white hover:bg-[#1A1A1A]/30'
                }`}
              >
                <ActiveIcon className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap flex items-center gap-1.5">
                  {tab.name}
                  {tab.id === 'claims' && pendingClaimsCount > 0 && (
                    <span className="bg-[#FF2D55] text-white text-[9px] font-mono font-black rounded-full px-1.5 py-0.5 animate-pulse">
                      {pendingClaimsCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Exit admin controls drawer */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-all hover:bg-red-500/5 hover:border-red-500/20 border border-transparent rounded-xl cursor-pointer md:mt-10 max-h-10 self-center md:self-stretch"
        >
          <LogOut className="w-4 h-4 text-gray-500" />
          <span className="hidden md:block">Log Out</span>
        </button>

      </aside>

      {/* 2. MAIN ADMIN CONTENT ZONE */}
      <main className="flex-grow p-4 sm:p-8 overflow-y-auto max-w-6xl mx-auto w-full">
        
        {loading ? (
          <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-[#FF2D55] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest animate-pulse">Synching records database...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* TAB CONTENT: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Visual statistics card block */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left select-none">
                  <div className="card-style p-5 space-y-2">
                    <span className="text-gray-500 text-[10px] font-mono block uppercase">Total items reported</span>
                    <h3 className="font-syne font-black text-3xl text-white">{stats?.totalPosted || 0}</h3>
                  </div>
                  <div className="card-style p-5 space-y-2">
                    <span className="text-gray-500 text-[10px] font-mono block uppercase text-[#FF2D55]">Active Lost Entries</span>
                    <h3 className="font-syne font-black text-3xl text-white">{stats?.openLost || 0}</h3>
                  </div>
                  <div className="card-style p-5 space-y-2">
                    <span className="text-gray-500 text-[10px] font-mono block uppercase text-blue-400">Spotted Found Entries</span>
                    <h3 className="font-syne font-black text-3xl text-white">{stats?.openFound || 0}</h3>
                  </div>
                  <div className="card-style p-5 space-y-2">
                    <span className="text-gray-500 text-[10px] font-mono block uppercase text-[#00D26A]">Resolved today</span>
                    <h3 className="font-syne font-black text-3xl text-white">{stats?.resolvedToday || 0}</h3>
                  </div>
                </div>

                {/* Spreadsheet Recent activity desk */}
                <div className="bg-[#161616] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-xl text-left">
                  <div className="border-b border-[#2A2A2A] p-5">
                    <h3 className="font-syne font-bold text-white text-lg leading-none">Recent Activity Desk</h3>
                    <span className="text-[10px] text-gray-500 font-mono">Last 10 cataloged items listed across systems</span>
                  </div>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-xs font-inter border-collapse">
                      <thead>
                        <tr className="bg-[#0F0F0F] border-b border-[#2A2A2A] text-gray-500 font-mono text-[10px] uppercase">
                          <th className="px-5 py-3 text-left">Classification</th>
                          <th className="px-5 py-3 text-left">Item Name</th>
                          <th className="px-5 py-3 text-left">Coordinates</th>
                          <th className="px-5 py-3 text-left">State</th>
                          <th className="px-5 py-3 text-left">Recorded</th>
                          <th className="px-5 py-3 text-center">Ref</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allItems.slice(0, 10).map((row) => (
                          <tr key={row.id} className="border-b border-[#202020] hover:bg-[#1A1A1A]/40 transition-colors">
                            <td className="px-5 py-3.5 font-bold select-none capitalize">
                              {row.type === 'found' ? (
                                <span className="text-blue-400">Found</span>
                              ) : (
                                <span className="text-[#FF2D55]">Lost</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-white font-semibold line-clamp-1">{row.title}</td>
                            <td className="px-5 py-3.5 text-gray-400 max-w-[150px] truncate">{row.location}</td>
                            <td className="px-5 py-3.5 uppercase font-mono font-bold">
                              {row.status === 'open' && <span className="text-[#00D26A]">Open</span>}
                              {row.status === 'claimed' && <span className="text-[#FFB800]">Claimed</span>}
                              {row.status === 'resolved' && <span className="text-gray-500">Resolved</span>}
                            </td>
                            <td className="px-5 py-3.5 text-gray-500 font-mono">{getRelativeTime(row.created_at)}</td>
                            <td className="px-5 py-3.5 text-center">
                              <Link
                                to={`/item/${row.id}`}
                                className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-[#1C1C1D] text-gray-400 hover:text-white transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB CONTENT: ALL ITEMS MANAGING */}
            {activeTab === 'items' && (
              <motion.div
                key="items"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Filters Row */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-[#161616] border border-[#2A2A2A] rounded-2xl p-5 text-left">
                  <div className="flex flex-wrap gap-4 items-center">
                    {/* Classification filter */}
                    <div className="flex bg-[#0F0F0F] p-1.5 rounded-xl border border-[#2A2A2A] text-xs">
                      {(['all', 'lost', 'found'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setItemTypeFilter(t)}
                          className={`py-1.5 px-3 rounded-lg font-semibold capitalize font-inter transition-all cursor-pointer ${
                            itemTypeFilter === t ? 'bg-[#FF2D55] text-white font-bold' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* Status filter dropdown */}
                    <select
                      value={itemStatusFilter}
                      onChange={(e) => setItemStatusFilter(e.target.value as any)}
                      className="bg-[#0F0F0F] border border-[#2A2A2A] text-gray-300 font-semibold rounded-xl text-xs px-4 py-2 cursor-pointer outline-none focus:border-[#FF2D55]"
                    >
                      <option value="all">All Statuses</option>
                      <option value="open">Open Logs</option>
                      <option value="claimed">Claimed Reviews</option>
                      <option value="resolved">Resolved Sets</option>
                    </select>
                  </div>

                  <span className="text-xs text-gray-500 font-mono font-bold">
                    Showing {filteredSpreadsheetItems.length} filtered items
                  </span>
                </div>

                {/* Big items sheet */}
                <div className="bg-[#161616] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-xl text-left">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-xs font-inter border-collapse">
                      <thead>
                        <tr className="bg-[#0F0F0F] border-b border-[#2A2A2A] text-gray-500 font-mono text-[10px] uppercase">
                          <th className="px-5 py-3 text-left">Thumbnail</th>
                          <th className="px-5 py-3 text-left">ID</th>
                          <th className="px-5 py-3 text-left">Item Title</th>
                          <th className="px-5 py-3 text-left">Category</th>
                          <th className="px-5 py-3 text-left">Status</th>
                          <th className="px-5 py-3 text-center">Actions Coordinates</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSpreadsheetItems.map((item) => (
                          <tr key={item.id} className="border-b border-[#202020] hover:bg-[#1A1A1A]/40 transition-colors">
                            <td className="px-5 py-3">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.title}
                                  className="w-10 h-10 rounded border border-[#2A2A2A] object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 border border-[#2A2A2A] bg-black rounded flex items-center justify-center text-lg">
                                  📦
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3 text-gray-500 font-mono font-semibold">
                              {formatId(item.id)}
                            </td>
                            <td className="px-5 py-3 font-semibold text-white">
                              <div>
                                <span className="block font-bold">{item.title}</span>
                                <span className="text-[10px] text-gray-400 font-mono font-normal">📍 {item.location}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-gray-400 capitalize">{item.category}</td>
                            <td className="px-5 py-3">
                              {item.status === 'open' && (
                                <span className="bg-[#00D26A]/20 text-[#00D26A] border border-[#00D26A]/30 px-2.5 py-0.5 rounded-full font-semibold font-mono uppercase text-[9px]">
                                  Open
                                </span>
                              )}
                              {item.status === 'claimed' && (
                                <span className="bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/30 px-2.5 py-0.5 rounded-full font-semibold font-mono text-[9px]">
                                  Claimed
                                </span>
                              )}
                              {item.status === 'resolved' && (
                                <span className="bg-gray-500/20 text-gray-400 border border-gray-500/30 px-2.5 py-0.5 rounded-full font-semibold font-mono text-[9px]">
                                  Resolved
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <div className="inline-flex gap-2.5 items-center">
                                {/* Explore */}
                                <Link
                                  to={`/item/${item.id}`}
                                  className="p-1.5 rounded-lg border border-[#2A2A2A] text-gray-400 hover:text-white hover:bg-black/40 transition-colors"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>

                                {/* Direct resolve */}
                                {item.status !== 'resolved' && (
                                  <button
                                    onClick={() => handleMarkResolved(item.id)}
                                    className="p-1.5 rounded-lg border border-[#2A2A2A] hover:border-[#00D26A] text-gray-400 hover:text-[#00D26A] hover:bg-[#00D26A]/5 transition-colors cursor-pointer"
                                    title="Mark resolved"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Delete */}
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 rounded-lg border border-[#2A2A2A] hover:border-[#FF2D55] text-gray-400 hover:text-[#FF2D55] hover:bg-[#FF2D55]/5 transition-colors cursor-pointer"
                                  title="Delete item report"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB CONTENT: PENDING CLAIMS */}
            {activeTab === 'claims' && (
              <motion.div
                key="claims"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6 text-left"
              >
                <div className="space-y-1 pl-1 select-none">
                  <h3 className="font-syne font-black text-2xl text-white leading-none">Claim Verification Desk</h3>
                  <span className="text-xs text-gray-500 font-inter">Audit applicant credentials and descriptive proof text markers.</span>
                </div>

                {allClaims.length === 0 ? (
                  <div className="card-style py-16 text-center space-y-3">
                    <span className="text-5xl block select-none">🎉</span>
                    <h4 className="font-syne font-bold text-white text-lg">No pending claim audits</h4>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed font-inter">
                      Awesome! All filed student ownership audits have been approved, rejected, or cleared.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {allClaims.map((claim) => (
                      <div
                        key={claim.id}
                        className="bg-[#161616] border border-[#2A2A2A] rounded-2xl p-6 flex flex-col lg:flex-row gap-6 hover:border-[#FF2D55]/20 hover:shadow-lg transition-all"
                      >
                        {/* Left visual indicator thumbnail parent */}
                        <div className="w-full lg:w-48 shrink-0 space-y-2">
                          <Link to={`/item/${claim.item?.id}`} className="block group">
                            {claim.item?.image_url ? (
                              <img
                                src={claim.item.image_url}
                                alt={claim.item.title}
                                className="w-full h-32 rounded-xl object-cover border border-[#2A2A2A]"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-32 border border-[#2A2A2A] bg-black rounded-xl flex items-center justify-center text-4xl select-none">
                                📦
                              </div>
                            )}
                            <span className="block font-syne font-bold text-sm text-white mt-2 group-hover:text-[#FF2D55] transition-colors line-clamp-1">
                              {claim.item?.title || 'Reported Item'}
                            </span>
                          </Link>
                          <span className="text-[10px] font-mono text-gray-500 block">
                            Item ID: {claim.item ? formatId(claim.item.id) : 'Null'}
                          </span>
                        </div>

                        {/* Middle detailed metadata block */}
                        <div className="flex-grow space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4 text-xs font-inter border-b border-[#222] pb-3 text-gray-400">
                            <div>
                              <span className="text-[10px] font-mono text-gray-500 block uppercase leading-none mb-1">Claimer Name</span>
                              <strong className="text-white text-sm">{claim.claimer_name}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] font-mono text-gray-500 block uppercase leading-none mb-1">Student ID Card</span>
                              <strong className="text-white text-sm font-mono">{claim.student_id}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] font-mono text-gray-500 block uppercase leading-none mb-1">Email Directory</span>
                              <strong className="text-[#FF2D55] font-semibold text-xs">{claim.claimer_email}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] font-mono text-gray-500 block uppercase leading-none mb-1">Phone Contact</span>
                              <strong className="text-white text-xs">{claim.phone || 'None'}</strong>
                            </div>
                          </div>

                          {/* Blockquote Proof of Ownership */}
                          <div className="space-y-1.5 text-xs font-inter leading-relaxed bg-black/40 p-4 rounded-xl border border-[#222] relative">
                            <span className="text-[9px] font-mono text-[#FFB800] uppercase tracking-wide font-bold block">
                              Claimer Proof Statement
                            </span>
                            <blockquote className="text-gray-300 italic">
                              "{claim.proof_text}"
                            </blockquote>
                            <span className="text-[8px] font-mono text-gray-500 block text-right pt-2">
                              Filed: {getRelativeTime(claim.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Right quick Approve/Reject buttons */}
                        <div className="w-full lg:w-44 shrink-0 flex flex-row lg:flex-col gap-2 justify-center lg:justify-center items-center">
                          {claim.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleApproveClaim(claim.id)}
                                className="flex-1 lg:w-full bg-[#00D26A] hover:bg-[#00B050] text-black font-extrabold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-[#00D26A]/10"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Approve claim
                              </button>
                              
                              <button
                                onClick={() => handleRejectClaim(claim.id)}
                                className="flex-1 lg:w-full border border-red-500/30 hover:border-[#FF2D55] text-[#FF2D55] hover:bg-[#FF2D55]/5 font-bold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                                Reject claim
                              </button>
                            </>
                          ) : (
                            <div className="text-center space-y-1">
                              <span className="text-xs uppercase font-mono block text-gray-500">Audit Status</span>
                              <strong className={`text-sm uppercase font-bold font-syne ${claim.status === 'approved' ? 'text-[#00D26A]' : 'text-[#FF2D55]'}`}>
                                {claim.status}
                              </strong>
                            </div>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}

              </motion.div>
            )}

            {/* TAB CONTENT: STATS DATA CHART VISUALIZATIONS */}
            {activeTab === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6 text-left"
              >
                <div className="space-y-1 pl-1 select-none">
                  <h3 className="font-syne font-black text-2xl text-white leading-none">Statistical Analytics</h3>
                  <span className="text-xs text-gray-500 font-inter">Live data visual graphs representing items posted and category density.</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Chart 1: Bar Chart of postings */}
                  <div className="card-style p-6 space-y-4">
                    <span className="text-[10px] font-mono text-gray-500 block uppercase font-bold">Daily Postings Tracker (Last 7 Days)</span>
                    <div className="h-64 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.postsLast7Days || []} margin={{ left: -20 }}>
                          <XAxis dataKey="date" stroke="#888" fontSize={11} tickLine={false} />
                          <YAxis stroke="#88" fontSize={11} tickLine={false} />
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <Tooltip contentStyle={{ backgroundColor: '#161616', border: '1px solid #2A2A2A', color: 'white' }} />
                          <Bar dataKey="posted" fill="#FF2D55" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Category Pie chart */}
                  <div className="card-style p-6 space-y-4">
                    <span className="text-[10px] font-mono text-gray-500 block uppercase font-bold">Category Distribution Breakdown</span>
                    <div className="h-64 mt-2 flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats?.categoryStats || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {(stats?.categoryStats || []).map((entry: any, index: number) => {
                              const colors = ['#FF2D55', '#FF6B35', '#FFB800', '#00D26A', '#3B82F6', '#888'];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#161616', border: '1px solid #2A2A2A', color: 'white' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Interactive inline legend */}
                      <div className="absolute bottom-1 right-1 flex flex-col text-[10px] text-gray-400 gap-1 font-mono font-bold select-none text-right bg-black/60 px-3 py-2 rounded-lg border border-[#222]">
                        {(stats?.categoryStats || []).slice(0, 4).map((entry: any, i: number) => {
                          const colors = ['#FF2D55', '#FF6B35', '#FFB800', '#00D26A'];
                          return (
                            <div key={i} className="flex items-center gap-1.5 justify-end">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i] }} />
                              <span>{entry.name}: {entry.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Chart 3: Doughnut Chart Status Breakdown */}
                  <div className="card-style p-6 space-y-4 lg:col-span-2">
                    <span className="text-[10px] font-mono text-gray-500 block uppercase font-bold">Status Profile Density (Lost vs Found vs Resolved)</span>
                    <div className="h-64 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.statusStats || []} layout="vertical" margin={{ left: 20 }}>
                          <XAxis type="number" stroke="#888" fontSize={11} />
                          <YAxis dataKey="name" type="category" stroke="#888" fontSize={11} tickLine={false} />
                          <CartesianGrid stroke="#222" />
                          <Tooltip contentStyle={{ backgroundColor: '#161616', border: '1px solid #2A2A2A', color: 'white' }} />
                          <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                            {(stats?.statusStats || []).map((entry: any, index: number) => {
                              const colors = ['#FF2D55', '#3B82F6', '#00D26A'];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}

      </main>

    </div>
  );
}
