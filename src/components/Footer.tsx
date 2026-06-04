import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer id="app-footer" className="bg-[#0A0A0A] border-t border-[#2A2A2A] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Column 1 - Brand Info */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF2D55] to-[#FF6B35] flex items-center justify-center font-bold text-white text-base">
                S
              </div>
              <span className="font-syne font-bold text-lg text-white">
                nap<span className="text-[#FF2D55]">Trace</span>
              </span>
            </Link>
            <p className="text-[#888888] font-inter text-sm max-w-sm">
              Show what you lost. Find it in seconds. Utilizing the power of Gemini Vision AI to connect students with their misplaced items.
            </p>
          </div>

          {/* Column 2 - Links */}
          <div className="flex flex-col space-y-2.5 md:pl-16">
            <span className="font-syne text-white font-bold text-sm uppercase tracking-wider mb-1">
              Quick Navigation
            </span>
            <Link to="/" className="text-gray-400 hover:text-[#FF2D55] text-sm font-inter transition-colors">
              Home
            </Link>
            <Link to="/browse" className="text-gray-400 hover:text-[#FF2D55] text-sm font-inter transition-colors">
              Browse Items
            </Link>
            <Link to="/post" className="text-gray-400 hover:text-[#FF2D55] text-sm font-inter transition-colors">
              Post Report
            </Link>
            <Link to="/snapsearch" className="text-gray-400 hover:text-[#FF2D55] text-sm font-inter transition-colors">
              SnapSearch AI
            </Link>
            <Link to="/admin" className="text-gray-400 hover:text-[#FF2D55] text-sm font-inter transition-colors">
              Admin Portal
            </Link>
          </div>

          {/* Column 3 - Hackathon Credits */}
          <div className="space-y-3">
            <span className="font-syne text-white font-bold text-sm uppercase tracking-wider">
              Hackathon Showcase
            </span>
            <div className="bg-[#161616] p-4 rounded-xl border border-[#2A2A2A] text-xs font-mono text-gray-400 space-y-1.5 leading-relaxed">
              <div>📍 Built for IntelliAI Arena 2026</div>
              <div>⚡ Powered by gemini-2.5-flash-image</div>
              <div>🏫 AI Nexus Club, AITR Indore</div>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#2A2A2A] mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#888888] text-xs font-inter">
            &copy; {new Date().getFullYear()} SnapTrace Dev Team. All rights reserved.
          </p>
          <p className="text-[#888888] text-xs font-mono">
            Powered by Gemini Vision AI + Supabase Engine
          </p>
        </div>
      </div>
    </footer>
  );
}
