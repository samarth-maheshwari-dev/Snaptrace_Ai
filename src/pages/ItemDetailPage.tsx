import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, MapPin, Calendar, Tag, User, ShieldCheck, Mail, Phone, Clock, Compass, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ClaimModal from '../components/ClaimModal';
import ItemCard from '../components/ItemCard';
import { Item } from '../types';

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [similarItems, setSimilarItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Claim modal interactions
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  useEffect(() => {
    const fetchItemDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/items/${id}`);
        if (!res.ok) {
          throw new Error('Item not found');
        }
        const data = await res.json();
        setItem(data);

        // Fetch similar items by category
        const simRes = await fetch(`/api/items?category=${data.category}&status=open`);
        if (simRes.ok) {
          const simData: Item[] = await simRes.json();
          // Filter out current item
          setSimilarItems(simData.filter((i) => i.id !== id).slice(0, 4));
        }
      } catch (err) {
        console.error(err);
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetails();
  }, [id]);

  const handleClaimSuccess = () => {
    setIsModalOpen(false);
    setClaimSubmitted(true);
    alert('✅ Claim submitted successfully! Contact details are now unlocked and visible below.');
    
    // Refresh item details to show claimed badge state
    fetch(`/api/items/${id}`)
      .then((res) => res.json())
      .then((data) => setItem(data));
  };

  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return 'recently';
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true });
    } catch (e) {
      return 'recently';
    }
  };

  if (loading) {
    return (
      <div className="bg-[#0D0D0D] text-[#F5F5F5] min-h-screen flex flex-col font-inter justify-between">
        <Navbar />
        <main className="flex-grow flex items-center justify-center pt-32">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#FF2D55] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest animate-pulse">Loading item profile specifications...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="bg-[#0D0D0D] text-[#F5F5F5] min-h-screen flex flex-col font-inter justify-between">
        <Navbar />
        <main className="flex-grow flex flex-col items-center justify-center pt-32 p-4 space-y-4">
          <AlertCircle className="w-16 h-16 text-[#FF2D55] animate-bounce" />
          <h2 className="text-2xl font-black font-syne text-white">Item Records Misplaced</h2>
          <p className="text-xs text-gray-400 font-inter max-w-sm text-center leading-relaxed">
            We couldn't retrieve the specified item metadata profile. It might have been deleted, resolved, or the ID is mistyped.
          </p>
          <Link
            to="/browse"
            className="button-primary text-xs py-3 px-6 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse Other Listings
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-[#0D0D0D] text-[#F5F5F5] min-h-screen flex flex-col font-inter justify-between">
      <Navbar />

      <main className="flex-grow pt-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pb-16">
        
        {/* Breadcrumbs */}
        <section className="py-2 text-left text-xs font-mono text-gray-500 mb-4 select-none">
          <Link to="/" className="hover:text-[#FF2D55] transition-colors">Home</Link>
          <span className="mx-2">&gt;</span>
          <Link to="/browse" className="hover:text-[#FF2D55] transition-colors">Browse</Link>
          <span className="mx-2">&gt;</span>
          <span className="text-white line-clamp-1 inline-block shrink-0">{item.title}</span>
        </section>

        {/* Back Link navigations */}
        <div className="text-left mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Item Catalog
          </button>
        </div>

        {/* Two-column detailed layout splitting screen */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start text-left">
          
          {/* LEFT SIDE - col span 3 of card descriptors */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Visual representation card */}
            <div className="card-style overflow-hidden bg-[#0F0F0F] border border-[#2A2A2A] aspect-video w-full flex items-center justify-center relative shadow-md">
              {!imageError && item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover filter brightness-95 hover:scale-102 transition-transform duration-500"
                  onError={() => setImageError(true)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center space-y-4">
                  <span className="text-7xl block select-none">📦</span>
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">{item.category} Category</span>
                </div>
              )}

              {/* Float types */}
              <div className="absolute top-4 left-4 flex gap-2 select-none">
                {item.type === 'found' ? (
                  <span className="bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-full px-4 py-1.5 text-xs font-bold backdrop-blur-sm shadow-md capitalize">
                    Found Report
                  </span>
                ) : (
                  <span className="bg-[#FF2D55]/30 text-[#FF2D55] border border-[#FF2D55]/40 rounded-full px-4 py-1.5 text-xs font-bold backdrop-blur-sm shadow-md capitalize">
                    Lost Report
                  </span>
                )}
              </div>
            </div>

            {/* Title & Desc text block */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-black font-syne text-white tracking-tight">
                {item.title}
              </h1>
              
              <p className="text-sm text-gray-400 font-inter leading-relaxed whitespace-pre-line">
                {item.description || 'No detailed written coordinates were provided for this item report. Please check AI-extracted physical traits or submit claim requests for ownership details.'}
              </p>
            </div>

            {/* Informational Profile Grid (2x3 block) */}
            <div className="bg-[#161616] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8 space-y-5 shadow-lg">
              <h3 className="font-syne font-bold text-lg text-white">Item Records Parameters</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-xs font-inter border-t border-[#222] pt-4">
                
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <div>
                    <span className="text-gray-500 block text-[10px] font-mono leading-none">CATEGORY</span>
                    <span className="text-white font-semibold text-sm capitalize">{item.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[#FF2D55]" />
                  <div>
                    <span className="text-gray-500 block text-[10px] font-mono leading-none">LAST LOCATION</span>
                    <span className="text-white font-semibold text-sm line-clamp-1">{item.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <span className="text-gray-500 block text-[10px] font-mono leading-none">DATE RECORDED</span>
                    <span className="text-white font-semibold text-sm">{item.date_occurred}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <span className="text-gray-500 block text-[10px] font-mono leading-none">SUBMITTED BY</span>
                    <span className="text-white font-semibold text-sm">{item.contact_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div>
                    <span className="text-gray-500 block text-[10px] font-mono leading-none">POSTED ON CAMPUS</span>
                    <span className="text-white font-semibold text-sm">{getRelativeTime(item.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Compass className="w-4 h-4 text-gray-500" />
                  <div>
                    <span className="text-gray-500 block text-[10px] font-mono leading-none">ONGOING STATE</span>
                    <span className="text-white font-semibold text-sm uppercase">{item.status}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* AI-Detected Metadata details */}
            {item.descriptor_json && (
              <div className="bg-[#161616]/70 border border-[#2A2A2A] rounded-2xl p-6 sm:p-8 space-y-4">
                <h4 className="font-syne font-bold text-white text-base flex items-center gap-2 select-none">
                  <span>🤖</span> AI-Detected Profile Features
                </h4>
                
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 rounded-full px-3.5 py-1 text-xs capitalize">
                    🎨 Primary: <strong className="text-white">{item.descriptor_json.primaryColor || 'N/A'}</strong>
                  </span>
                  
                  {item.descriptor_json.brand && (
                    <span className="bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 rounded-full px-3.5 py-1 text-xs">
                      🏷️ Brand: <strong className="text-white">{item.descriptor_json.brand}</strong>
                    </span>
                  )}

                  <span className="bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 rounded-full px-3.5 py-1 text-xs capitalize">
                    🧵 Material: <strong className="text-white">{item.descriptor_json.material || 'N/A'}</strong>
                  </span>

                  <span className="bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 rounded-full px-3.5 py-1 text-xs uppercase font-mono">
                    📐 Size: <strong className="text-white">{item.descriptor_json.size || 'M'}</strong>
                  </span>

                  <span className="bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 rounded-full px-3.5 py-1 text-xs uppercase font-mono">
                    🌟 Condition: <strong className="text-white">{item.descriptor_json.condition || 'Good'}</strong>
                  </span>
                </div>

                {item.descriptor_json.distinctiveFeatures && item.descriptor_json.distinctiveFeatures.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-mono text-gray-500 block uppercase font-bold">Physical Identifiers:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.descriptor_json.distinctiveFeatures.map((feat: string, i: number) => (
                        <span key={i} className="bg-[#FF2D55]/5 border border-[#FF2D55]/20 text-[#FF2D55] rounded-lg px-2.5 py-1 text-[10px] font-mono">
                          ★ {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* RIGHT SIDE - col span 2 of sticky prompt actions */}
          <div className="lg:col-span-2 lg:sticky lg:top-24 space-y-6">
            
            {/* Sticky Card Control Panel */}
            <div className="bg-[#161616] border border-[#2A2A2A] rounded-2xl p-6 space-y-5 shadow-2xl">
              
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#FF2D55] font-bold">
                  Active Coordinates Actions
                </span>
                <h4 className="font-syne font-black text-xl text-white leading-none">
                  Item Status Panel
                </h4>
              </div>

              {/* Ongoing State Feedbacks */}
              <div className="flex flex-col gap-4">
                
                {item.status === 'open' && (
                  <>
                    <p className="text-gray-400 font-inter text-xs leading-relaxed">
                      This item is currently flagged as active in campus records. If you are the rightful owner or have spotted its misplacement tracker, choose the corresponding action below.
                    </p>

                    {item.type === 'found' ? (
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="button-primary w-full flex items-center justify-center gap-2 py-3"
                      >
                        📩 Claim This Item as Mine
                      </button>
                    ) : (
                      <Link
                        to="/post"
                        className="button-primary w-full flex items-center justify-center gap-2 py-3 text-center bg-blue-600 hover:bg-blue-700 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] border-none"
                      >
                        📦 I Recovered / Spotted This
                      </Link>
                    )}
                  </>
                )}

                {item.status === 'claimed' && (
                  <div className="bg-[#FFB800]/5 border border-[#FFB800]/25 rounded-xl p-4 space-y-2 text-left">
                    <div className="flex items-center gap-2 text-[#FFB800] font-syne font-bold text-sm">
                      <ShieldCheck className="w-4 h-4 shrink-0 animate-bounce" />
                      <span>Claim Under Review</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-inter leading-relaxed">
                      A student has recently filed a claim request with ownership proofs for this item. Active modifications are currently locked. If you are also filing ownership reviews, please wait or contact administrators.
                    </p>
                  </div>
                )}

                {item.status === 'resolved' && (
                  <div className="bg-[#00D26A]/5 border border-[#00D26A]/25 rounded-xl p-4 space-y-2 text-left">
                    <div className="flex items-center gap-2 text-[#00D26A] font-syne font-bold text-sm">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Item Resolved / Returned</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-inter leading-relaxed">
                      🎉 Hurrah! This item has been successfully reclaimed, verified, and returned to its rightful owner. The campus files have been archive-flagged.
                    </p>
                  </div>
                )}

              </div>

              {/* UNLOCKED / LOCKED CONTACT INFO SECTION */}
              <div className="border-t border-[#2A2A2A] pt-5 space-y-4">
                <span className="text-[10px] font-mono text-gray-500 block uppercase tracking-wider font-bold">
                  Contact Information Coordinates
                </span>

                {claimSubmitted || item.status === 'resolved' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 font-inter text-xs"
                  >
                    <div className="flex items-center gap-3 bg-[#1A1A1A] p-3 rounded-xl border border-[#2A2A2A]">
                      <User className="w-4.5 h-4.5 text-gray-500 shrink-0" />
                      <div>
                        <span className="text-[9px] font-mono text-gray-500 block leading-none">FINDER/REPORTER</span>
                        <span className="text-white font-semibold">{item.contact_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-[#1A1A1A] p-3 rounded-xl border border-[#2A2A2A]">
                      <Mail className="w-4.5 h-4.5 text-gray-500 shrink-0" />
                      <div>
                        <span className="text-[9px] font-mono text-gray-500 block leading-none">EMAIL DIRECTORY</span>
                        <a
                          href={`mailto:${item.contact_email}`}
                          className="text-[#FF2D55] hover:underline font-semibold"
                        >
                          {item.contact_email}
                        </a>
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-500 text-center font-mono italic">
                      Please correspond directly via email to coordinate object handoffs.
                    </p>
                  </motion.div>
                ) : (
                  <div className="bg-[#1A1A1A]/40 border border-[#2A2A2A] rounded-xl p-4 text-center space-y-2 select-none">
                    <span className="text-xl block filter saturate-0 border border-[#2A2A2A] rounded-full w-10 h-10 flex items-center justify-center mx-auto bg-[#1A1A1A]">
                      🔒
                    </span>
                    <h5 className="font-syne font-bold text-white text-xs leading-none pt-1">
                      Contact Data Shield-Locked
                    </h5>
                    <p className="text-[10px] text-gray-500 max-w-[210px] mx-auto leading-relaxed font-inter">
                      To prevent scammers and protect privacy, Finder details are hidden until you initiate a Claim Request.
                    </p>
                  </div>
                )}

              </div>

            </div>

          </div>

        </div>

        {/* SIMILAR ITEMS ROW CONTAINER */}
        <section className="mt-20 pt-10 border-t border-[#2A2A2A] text-left">
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Relevance metrics</span>
              <h2 className="text-2xl font-black font-syne text-white">You Might Also Be Looking For</h2>
            </div>

            {similarItems.length === 0 ? (
              <p className="text-xs text-gray-500 font-inter italic pl-1">
                No duplicate listing parameters detected inside this catalog category currently.
              </p>
            ) : (
              <div className="flex overflow-x-auto gap-6 pb-6 pt-2 scrollbar-thin snap-x scroll-smooth">
                {similarItems.map((sItem) => (
                  <div key={sItem.id} className="w-80 shrink-0 snap-start">
                    <ItemCard item={sItem} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Claim Dialog overlays */}
      <AnimatePresence>
        {isModalOpen && (
          <ClaimModal
            isOpen={isModalOpen}
            item={item}
            onClose={() => setIsModalOpen(false)}
            onSuccess={handleClaimSuccess}
          />
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
