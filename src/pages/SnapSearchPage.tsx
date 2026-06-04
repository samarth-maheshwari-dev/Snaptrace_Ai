import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles, AlertCircle, RefreshCw, Layers, ShieldAlert } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ClaimModal from '../components/ClaimModal';
import { fileToBase64, analyzeItemImage, isDemoMode } from '../lib/gemini';
import { computeSimilarity } from '../utils/similarity';
import { Item, MatchResult } from '../types';

export default function SnapSearchPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(isDemoMode);
  
  // Pipeline Processing States
  const [processing, setProcessing] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  
  // Computed output states
  const [detectedDescriptor, setDetectedDescriptor] = useState<any>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [alreadySearched, setAlreadySearched] = useState(false);

  // Query server status on mount
  useEffect(() => {
    fetch('/api/gemini/status')
      .then((res) => res.json())
      .then((data) => setDemoMode(!data.hasAPIKey))
      .catch(() => setDemoMode(true));
  }, []);

  // Claim Modal states
  const [selectedMatchItem, setSelectedMatchItem] = useState<Item | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const statusMessages = [
    '📸 Analyzing your image...',
    '🤖 Extracting item features...',
    '🔍 Comparing against found items...',
    '📊 Ranking matches...',
  ];

  // Cycle loader status messages every 800ms
  useEffect(() => {
    let timer: any;
    if (processing) {
      timer = setInterval(() => {
        setStatusIndex((prev) => (prev + 1) % statusMessages.length);
      }, 800);
    } else {
      setStatusIndex(0);
    }
    return () => clearInterval(timer);
  }, [processing]);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles[0]) {
      const file = acceptedFiles[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setAlreadySearched(false);
      setMatchResults([]);
      setDetectedDescriptor(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  } as any);

  const handleSnapSearch = async () => {
    if (!imageFile) return;

    setProcessing(true);
    try {
      // 1. Convert file to base64
      const base64Data = await fileToBase64(imageFile);

      // 2. Transmit to server vision pipeline
      const descriptor = await analyzeItemImage(base64Data, imageFile.type);
      setDetectedDescriptor(descriptor);

      // 3. Query all OPEN FOUND reports to match against
      const res = await fetch('/api/items?type=found&status=open');
      if (res.ok) {
        const foundItems: Item[] = await res.json();
        
        // 4. Compute similarities
        const results: MatchResult[] = foundItems
          .map((item) => {
            const score = computeSimilarity(descriptor, item.descriptor_json);
            return { item, score };
          })
          // Filter matching results that have at least 15% relevance to list
          .filter((res) => res.score >= 15)
          // Sort score descending
          .sort((a, b) => b.score - a.score);

        setMatchResults(results);
      }

      setAlreadySearched(true);
    } catch (err) {
      console.error(err);
      alert('SnapSearch experienced a processing error. Please retry.');
    } finally {
      setProcessing(false);
    }
  };

  // Claim actions inside matches list
  const handleTriggerClaim = (item: Item) => {
    setSelectedMatchItem(item);
    setIsModalOpen(true);
  };

  const handleClaimSuccess = () => {
    setIsModalOpen(false);
    alert(`🎉 Claim requests formulated!\n\nYour info has been logged and the item record has been locked to 'claimed'. The admin will audit the proof details and contact you via email.`);
    
    // Refresh lists dynamically to update changed statuses
    if (imageFile) {
      handleSnapSearch();
    }
  };

  return (
    <div className="bg-[#0D0D0D] text-[#F5F5F5] min-h-screen flex flex-col font-inter justify-between">
      <Navbar />

      <main className="flex-grow pt-28 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full pb-16">
        
        {/* Demo Mode notification */}
        {demoMode && (
          <div className="bg-[#FFB800]/10 border border-[#FFB800]/20 text-[#FFB800] text-xs py-3 px-4 rounded-xl text-center mb-6 flex items-center justify-center gap-2 font-medium font-inter animate-fade-up">
            <ShieldAlert className="w-4 h-4 shrink-0 animate-bounce" />
            <span>⚡ Demo Mode — Gemini API key not configured. AI analyses will use cached catalog templates.</span>
          </div>
        )}

        {/* Page Titles Header */}
        <section className="text-center space-y-3 mb-10 select-none">
          <div className="inline-flex items-center gap-1 bg-[#FF2D55]/5 border border-[#FF2D55]/30 text-[#FF2D55] rounded-full px-3 py-1 text-xs font-mono font-extrabold uppercase">
            🤖 AI Search Core
          </div>
          <h2 className="text-4xl sm:text-5xl font-black font-syne text-white flex items-center justify-center gap-2">
            SnapSearch
          </h2>
          <p className="text-xs text-gray-400 font-inter max-w-md mx-auto leading-relaxed font-light">
            Drop a photo of your misplaced object. Our visual vision engines will auto-match profiles and rank closest campus listings instantly.
          </p>
          <div className="text-[10px] font-mono text-gray-500 tracking-wider">
            Powered by gemini-3.5-flash vision
          </div>
        </section>

        {/* DRAG INGESTION AREA */}
        {!processing && !alreadySearched && (
          <section className="max-w-xl mx-auto animate-fade-up">
            <div className="card-style p-6 space-y-6">
              
              {!imagePreview ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-[#FF2D55] bg-[#FF2D55]/5 scale-102'
                      : 'border-[#2A2A2A] hover:border-[#FF2D55] bg-[#1A1A1A]/20'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-3xl">
                    📷
                  </div>
                  <div className="space-y-1 select-none">
                    <span className="block text-base font-bold font-syne text-white">
                      Drop your lost item photo here
                    </span>
                    <span className="block text-xs text-gray-500 font-inter">
                      or click to upload files
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-video max-h-72 w-full rounded-xl overflow-hidden bg-[#0F0F0F] border border-[#2A2A2A] flex items-center justify-center">
                    <img
                      src={imagePreview}
                      alt="Lost items preview"
                      className="max-h-full object-contain filter drop-shadow hover:scale-102 transition-transform"
                    />
                    
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-4 right-4 bg-black/60 hover:bg-[#FF2D55]/20 text-[#FF2D55] border border-[#FF2D55]/30 hover:border-[#FF2D55] p-2 rounded-xl transition-all h-9 w-9 flex items-center justify-center cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <button
                    onClick={handleSnapSearch}
                    className="button-primary w-full flex items-center justify-center gap-2 py-3.5"
                  >
                    <Search className="w-4.5 h-4.5" />
                    Find Matches inside Campus DB
                  </button>
                </div>
              )}

            </div>
          </section>
        )}

        {/* LOADING PROGRESS STRIP */}
        {processing && (
          <section className="max-w-xl mx-auto py-16 text-center space-y-6 animate-pulse">
            <Sparkles className="w-12 h-12 text-[#FFB800] mx-auto animate-spin" />
            
            <div className="space-y-1">
              <h4 className="font-syne font-black text-xl text-white">Computing Vision Models</h4>
              <p className="text-xs font-mono text-[#FF2D55] uppercase tracking-widest">{statusMessages[statusIndex]}</p>
            </div>

            {/* Moving horizontal loader */}
            <div className="relative w-full h-[3px] bg-[#161616] rounded-full overflow-hidden">
              <div 
                className="absolute top-0 h-full bg-gradient-to-r from-[#FF2D55] to-[#FF6B35] rounded-full" 
                style={{
                  width: '50%',
                  animation: 'shimmer 1.5s infinite linear',
                }}
              />
            </div>
            
            <span className="text-[10px] text-gray-500 font-mono block">
              Estimated wait: 3–5 seconds. Keeping networks hot.
            </span>

            {/* Loader inline style rules */}
            <style>{`
              @keyframes shimmer {
                0% { left: -50%; }
                100% { left: 100%; }
              }
            `}</style>
          </section>
        )}

        {/* DYNAMIC RESULTS CONTAINER */}
        {!processing && alreadySearched && (
          <section className="space-y-8 animate-fade-up">
            
            <div className="flex justify-between items-center bg-[#161616] border border-[#2A2A2A] rounded-xl px-5 py-3.5">
              <span className="text-xs text-gray-400 font-mono">Completed search calculation list</span>
              
              <button
                onClick={() => {
                  setAlreadySearched(false);
                  setImageFile(null);
                  setImagePreview(null);
                  setMatchResults([]);
                  setDetectedDescriptor(null);
                }}
                className="text-[#FF2D55] hover:text-[#E0263A] text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Upload New Photo
              </button>
            </div>

            {/* AI DECISION WRAPPERS */}
            {detectedDescriptor && (
              <div className="card-style p-6 space-y-4">
                <h4 className="font-syne font-bold text-white text-base flex items-center gap-2">
                  <span>🤖</span> What Gemini Detected
                </h4>
                
                <div className="flex flex-wrap gap-2.5">
                  <span className="bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-full px-3.5 py-1 text-xs font-inter capitalize">
                    📁 Category: <strong className="text-white">{detectedDescriptor.category || 'Unknown'}</strong>
                  </span>
                  <span className="bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-full px-3.5 py-1 text-xs font-inter">
                    🎨 Primary Color: <strong className="text-white capitalization capitalize">{detectedDescriptor.primaryColor || 'Unknown'}</strong>
                  </span>
                  {detectedDescriptor.brand && (
                    <span className="bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-full px-3.5 py-1 text-xs font-inter">
                      🏷️ Brand: <strong className="text-white">{detectedDescriptor.brand}</strong>
                    </span>
                  )}
                  <span className="bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-full px-3.5 py-1 text-xs font-inter">
                    🧵 Material: <strong className="text-white capitalize">{detectedDescriptor.material || 'Unknown'}</strong>
                  </span>
                  <span className="bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-full px-3.5 py-1 text-xs font-inter uppercase">
                    📐 Size: <strong className="text-white">{detectedDescriptor.size || 'M'}</strong>
                  </span>
                </div>

                {detectedDescriptor.distinctiveFeatures && detectedDescriptor.distinctiveFeatures.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-mono text-gray-500 block uppercase font-bold">Distinctive Features:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {detectedDescriptor.distinctiveFeatures.map((feat: string, i: number) => (
                        <span key={i} className="bg-red-500/5 border border-red-500/25 text-[#FF2D55] rounded-lg px-2.5 py-1 text-[10px] font-mono">
                          ★ {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-400 font-inter italic pt-1 border-t border-[#222]">
                  " {detectedDescriptor.itemDescription || 'Analyzed catalog objects.'} "
                </p>
              </div>
            )}

            {/* RANKED MATCHES TIMELINE */}
            <div className="space-y-4">
              <h3 className="font-syne text-2xl font-black text-white text-left pl-2">Top Matches Found</h3>
              
              {matchResults.length === 0 ? (
                <div className="card-style py-16 text-center space-y-4 max-w-xl mx-auto">
                  <span className="text-5xl block select-none">🔍</span>
                  <div className="space-y-1">
                    <h4 className="font-syne font-bold text-white text-lg">No strong matches found</h4>
                    <p className="text-xs text-gray-400 font-inter max-w-xs mx-auto leading-relaxed">
                      We didn't locate any matching items in the database with a similarity score matching standard guideline rates.
                    </p>
                  </div>
                  <Link
                    to="/post"
                    className="button-primary inline-flex items-center gap-1.5 text-xs px-5 py-2.5 font-bold"
                  >
                    Post this as a Lost Item
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {matchResults.map((res, index) => {
                    const scoreColor =
                      res.score >= 80
                        ? 'bg-[#00D26A]/10 border-2 border-[#00D26A] text-[#00D26A]'
                        : res.score >= 50
                        ? 'bg-[#FFB800]/10 border-2 border-[#FFB800] text-[#FFB800]'
                        : 'bg-gray-500/10 border-2 border-gray-500 text-gray-400';

                    return (
                      <div
                        key={res.item.id}
                        className="bg-[#161616] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5 relative group hover:border-[#FF2D55]/30 hover:shadow-lg transition-all"
                      >
                        {/* Rank Badge */}
                        <div className="absolute top-3 left-3 bg-black/60 border border-[#2A2A2A] rounded-full px-2.5 py-0.5 text-[9px] font-mono font-bold text-[#FFB800]">
                          #{index + 1} Best Match
                        </div>

                        {/* Left Match Score Badges Circular */}
                        <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center font-bold font-syne shrink-0 ${scoreColor}`}>
                          <span className="text-2xl font-black">{res.score}%</span>
                          <span className="text-[8px] font-mono uppercase tracking-widest leading-none mt-0.5">Match</span>
                        </div>

                        {/* Thumbnail */}
                        {res.item.image_url ? (
                          <img
                            src={res.item.image_url}
                            alt={res.item.title}
                            className="w-24 h-24 object-cover rounded-xl border border-[#2A2A2A]"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-xl bg-[#0F0F0F] flex items-center justify-center text-3xl shrink-0 border border-[#2A2A2A]">
                            📦
                          </div>
                        )}

                        {/* Mid detailed metrics */}
                        <div className="text-center sm:text-left flex-grow space-y-1">
                          <h4 className="font-syne font-bold text-white text-lg group-hover:text-[#FF2D55] transition-colors leading-tight">
                            {res.item.title}
                          </h4>
                          <span className="text-xs text-[#888888] font-inter block flex items-center justify-center sm:justify-start gap-1">
                            📍 {res.item.location} · 🗓️ {res.item.date_occurred}
                          </span>
                          
                          {/* Matching tag chips mock */}
                          <div className="flex flex-wrap gap-1 pt-1.5 justify-center sm:justify-start">
                            {res.item.descriptor_json?.category === detectedDescriptor?.category && (
                              <span className="bg-green-500/5 text-[#00D26A] text-[9px] font-mono px-2 py-0.5 rounded border border-green-500/20">
                                Match: Category
                              </span>
                            )}
                            {res.item.descriptor_json?.primaryColor?.toLowerCase() === detectedDescriptor?.primaryColor?.toLowerCase() && (
                              <span className="bg-green-500/5 text-[#00D26A] text-[9px] font-mono px-2 py-0.5 rounded border border-green-500/20">
                                Match: Color
                              </span>
                            )}
                            {res.item.descriptor_json?.brand?.toLowerCase() === detectedDescriptor?.brand?.toLowerCase() && res.item.descriptor_json?.brand && (
                              <span className="bg-green-500/5 text-[#00D26A] text-[9px] font-mono px-2 py-0.5 rounded border border-green-500/20">
                                Match: Brand
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right trigger buttons */}
                        <div className="w-full sm:w-auto shrink-0 flex flex-col gap-2">
                          <Link
                            to={`/item/${res.item.id}`}
                            className="button-ghost text-xs text-center font-bold py-2.5 px-4"
                          >
                            Explore Item
                          </Link>
                          
                          <button
                            onClick={() => handleTriggerClaim(res.item)}
                            className="button-primary text-xs py-2.5 px-4"
                          >
                            Claim Item
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </section>
        )}

      </main>

      {/* Claim Dialog rendering */}
      {selectedMatchItem && (
        <AnimatePresence>
          <ClaimModal
            isOpen={isModalOpen}
            item={selectedMatchItem}
            onClose={() => setIsModalOpen(false)}
            onSuccess={handleClaimSuccess}
          />
        </AnimatePresence>
      )}

      <Footer />
    </div>
  );
}
