import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, RefreshCw, Archive } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ItemCard from '../components/ItemCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Item } from '../types';

export default function BrowsePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering States
  const [type, setType] = useState<'all' | 'lost' | 'found'>('all');
  const [category, setCategory] = useState('All Categories');
  const [status, setStatus] = useState<'all' | 'open' | 'claimed' | 'resolved'>('all');
  const [locationQuery, setLocationQuery] = useState('');
  const [debouncedLocation, setDebouncedLocation] = useState('');

  // Location search input debouncer (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLocation(locationQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [locationQuery]);

  // Fetch Items on filter state updates
  useEffect(() => {
    const fetchFilteredItems = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (type !== 'all') queryParams.append('type', type);
        if (category !== 'All Categories') queryParams.append('category', category);
        if (status !== 'all') queryParams.append('status', status);
        if (debouncedLocation) queryParams.append('location', debouncedLocation);

        const res = await fetch(`/api/items?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch (err) {
        console.error('Error fetching items in browse:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredItems();
  }, [type, category, status, debouncedLocation]);

  const handleClearFilters = () => {
    setType('all');
    setCategory('All Categories');
    setStatus('all');
    setLocationQuery('');
  };

  const categories = [
    'All Categories',
    'Electronics',
    'Clothing',
    'Stationery',
    'Accessories',
    'ID/Cards',
    'Other',
  ];

  return (
    <div className="bg-[#0D0D0D] text-[#F5F5F5] min-h-screen flex flex-col font-inter">
      <Navbar />

      <main className="flex-grow pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <section className="py-8">
          <div className="space-y-1 text-left">
            <h2 className="text-4xl font-extrabold font-syne text-white tracking-tight">
              Browse All Items
            </h2>
            <p className="text-gray-400 font-inter text-sm font-light">
              Filter by report classifications, category tags, locations, or ongoing recovery statuses.
            </p>
          </div>
        </section>

        {/* Sticky Filter Bar */}
        <section className="sticky top-16 z-30 bg-[#0D0D0D]/90 backdrop-blur-md border-b border-[#2A2A2A] py-5 mb-8">
          <div className="flex flex-col gap-4">
            
            {/* Filter Row 1 (Core Filters) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              
              {/* Type toggle: All | Lost | Found */}
              <div className="flex bg-[#161616] p-1.5 rounded-xl border border-[#2A2A2A] w-full">
                {(['all', 'lost', 'found'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 text-xs py-2 px-3 rounded-lg font-semibold capitalize font-inter transition-all cursor-pointer ${
                      type === t
                        ? 'bg-[#FF2D55] text-white shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Category Dropdown */}
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-[#161616] border border-[#2A2A2A] rounded-xl text-white text-xs outline-none px-4 py-3 w-full font-inter cursor-pointer appearance-none focus:border-[#FF2D55]"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#161616]">
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Location Input Search box */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search location (e.g. Canteen)..."
                  className="bg-[#161616] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 text-xs outline-none pl-10 pr-4 py-3 w-full font-inter focus:border-[#FF2D55]"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>

              {/* Status Toggle: All | Open | Claimed | Resolved */}
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="bg-[#161616] border border-[#2A2A2A] rounded-xl text-white text-xs outline-none px-4 py-3 w-full font-inter cursor-pointer appearance-none focus:border-[#FF2D55]"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open Logs</option>
                  <option value="claimed">Claimed Reviews</option>
                  <option value="resolved">Resolved Sets</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                  <Archive className="w-3.5 h-3.5" />
                </div>
              </div>

            </div>

            {/* Bottom Status feedback line */}
            <div className="flex items-center justify-between text-xs font-mono text-gray-500">
              <span>Showing {items.length} listed items</span>
              <button
                onClick={handleClearFilters}
                className="text-[#FF2D55] hover:text-[#E0263A] hover:underline flex items-center gap-1 cursor-pointer font-bold transition-colors"
              >
                <RefreshCw className="w-3 h-3 animate-spin duration-300" />
                Reset Filter States
              </button>
            </div>
          </div>
        </section>

        {/* Dynamic Display Grid */}
        <section className="pb-16">
          {loading ? (
            <LoadingSkeleton />
          ) : items.length === 0 ? (
            <div className="card-style py-24 text-center max-w-xl mx-auto space-y-4">
              <span className="text-6xl block">🔍</span>
              <h3 className="font-syne font-black text-xl text-white">No Items Matching Guidelines</h3>
              <p className="text-xs text-gray-400 font-inter max-w-sm mx-auto leading-relaxed">
                We couldn't locate any active reports fitting your exact filters. Try loosening search words or reset filter targets.
              </p>
              <button
                onClick={handleClearFilters}
                className="border border-[#2A2A2A] hover:border-[#FF2D55] text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all font-inter"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
