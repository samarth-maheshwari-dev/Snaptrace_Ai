import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, Plus } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function HomePage() {
  // Custom count up states
  const [reportedCount, setReportedCount] = useState(0);
  const [recoveredCount, setRecoveredCount] = useState(0);
  const [accuracyCount, setAccuracyCount] = useState(0);
  const [timeCount, setTimeCount] = useState(0);

  useEffect(() => {
    // Simple counting simulator
    const speed = 15;
    const reportedTarget = 4;
    const recoveredTarget = 3;
    const accuracyTarget = 72;
    const timeTarget = 6;

    let rCur = 0;
    let recCur = 0;
    let accCur = 0;
    let tCur = 0;

    const interval = setInterval(() => {
      let done = true;
      if (rCur < reportedTarget) {
        rCur += Math.ceil((reportedTarget - rCur) / speed) || 1;
        setReportedCount(Math.min(rCur, reportedTarget));
        done = false;
      }
      if (recCur < recoveredTarget) {
        recCur += Math.ceil((recoveredTarget - recCur) / speed) || 1;
        setRecoveredCount(Math.min(recCur, recoveredTarget));
        done = false;
      }
      if (accCur < accuracyTarget) {
        accCur += Math.ceil((accuracyTarget - accCur) / speed) || 1;
        setAccuracyCount(Math.min(accCur, accuracyTarget));
        done = false;
      }
      if (tCur < timeTarget) {
        tCur += 1;
        setTimeCount(Math.min(tCur, timeTarget));
        done = false;
      }

      if (done) clearInterval(interval);
    }, 45);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0D0D0D] text-[#F5F5F5] min-h-screen flex flex-col font-inter">
      <Navbar />

      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="relative min-h-screen flex items-center pt-24 overflow-hidden">
          {/* Background Radial Orbs */}
          <div className="absolute top-1/4 right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#FF2D55] to-[#FF6B35] filter blur-[150px] opacity-[0.08] select-none pointer-events-none -z-10" />
          <div className="absolute bottom-10 left-[5%] w-[350px] h-[350px] rounded-full bg-blue-600 filter blur-[120px] opacity-[0.04] select-none pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
              
              {/* Left Column (Main text) */}
              <div className="lg:col-span-3 space-y-6 text-left">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF2D55]/5 border border-[#FF2D55]/25 text-[#FF2D55] text-xs font-mono font-semibold"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF2D55] animate-ping" />
                  🔴 AI-Powered Lost & Found
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-5xl sm:text-6xl xl:text-7xl font-black font-syne leading-[1.1] tracking-tight"
                >
                  Lost something? <br />
                  Show us a <span className="text-[#FF2D55] relative after:absolute after:bottom-1 after:left-0 after:w-full after:h-[6px] after:bg-[#FF2D55]/30">photo.</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-base sm:text-lg text-gray-400 max-w-xl font-normal leading-relaxed"
                >
                  SnapTrace uses Gemini Vision AI to instantly match your lost objects against found campus reports. No text input, no manual logs—just upload a photo and retrieve it instantly.
                </motion.p>

                {/* Call-to-action buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-4 pt-4"
                >
                  <Link
                    to="/snapsearch"
                    className="button-primary flex items-center justify-center gap-2.5 text-sm py-3 px-8 text-center"
                  >
                    <Search className="w-4.5 h-4.5" />
                    Find My Item (SnapSearch)
                  </Link>

                  <Link
                    to="/post"
                    className="button-ghost flex items-center justify-center gap-2.5 text-sm py-3 px-8 text-center"
                  >
                    <Plus className="w-4.5 h-4.5 text-[#FF2D55]" />
                    Report Found Item
                  </Link>
                </motion.div>
              </div>

              {/* Right Column (Floating visual asset) */}
              <div className="lg:col-span-2 hidden lg:flex justify-end">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                  className="relative group"
                >
                  {/* Neon halo background */}
                  <div className="absolute inset-x-0 -inset-y-2 bg-gradient-to-tr from-[#FF2D55] to-[#FF6B35] rounded-3xl blur-2xl opacity-10 group-hover:opacity-20 transition-opacity" />
                  
                  {/* Matching Floating Card Mock */}
                  <div className="relative bg-[#161616] border border-[#2A2A2A] rounded-2xl p-5 w-80 shadow-2xl animate-float">
                    
                    {/* Item Thumbnail */}
                    <div className="aspect-[4/3] rounded-xl bg-gradient-to-tr from-[#202020] to-[#1A1A1A] overflow-hidden border border-[#2A2A2A] mb-4 flex items-center justify-center relative">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-5xl select-none animate-pulse">💻</span>
                        <span className="text-[#888888] text-[10px] font-mono tracking-wider uppercase">
                          ELECTRONICS
                        </span>
                      </div>
                      
                      {/* Percent Match Badge */}
                      <div className="absolute top-3 right-3 bg-[#00D26A]/20 border border-[#00D26A]/40 text-[#00D26A] font-mono text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm animate-pulse">
                        87% Match
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <span className="text-[10px] uppercase tracking-widest text-[#FF2D55] font-mono font-bold">
                        Best AI Suggestion
                      </span>
                      <h4 className="font-syne font-bold text-white text-base">
                        Black Dell Laptop
                      </h4>
                      <div className="flex items-center gap-1.5 text-[#888888] font-inter text-xs">
                        <span>📍 Canteen Area</span>
                        <span>·</span>
                        <span>2 hrs ago</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

            </div>
          </div>
        </section>

        {/* LIVE STATS BAR */}
        <section className="bg-[#0F0F0F] border-y border-[#2A2A2A] py-10 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              {/* Left Accent indicator */}
              <div className="w-[3px] h-12 bg-gradient-to-b from-[#FF2D55] to-[#FF6B35] rounded-full self-center hidden sm:block" />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full text-center">
                <div className="space-y-1">
                  <div className="text-4xl sm:text-5xl font-black font-syne text-white">
                    {reportedCount}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 font-inter uppercase tracking-wide font-medium">
                    Items Reported
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-4xl sm:text-5xl font-black font-syne text-white">
                    {recoveredCount}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 font-inter uppercase tracking-wide font-medium">
                    Items Recovered
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-4xl sm:text-5xl font-black font-syne text-[#00D26A]">
                    {accuracyCount}%
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 font-inter uppercase tracking-wide font-medium">
                    Match Accuracy
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-4xl sm:text-5xl font-black font-syne text-[#FFB800]">
                    {timeCount} min
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 font-inter uppercase tracking-wide font-medium">
                    Avg. Recovery Time
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
