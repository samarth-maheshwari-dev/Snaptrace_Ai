import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Camera, PlusCircle, Shield } from 'lucide-react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Browse', path: '/browse' },
    { name: 'Report Item', path: '/post' },
    { name: 'SnapSearch', path: '/snapsearch' },
  ];

  return (
    <nav
      id="app-navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'backdrop-blur-md bg-black/60 border-b border-[#2A2A2A]'
          : 'bg-transparent py-2'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF2D55] to-[#FF6B35] flex items-center justify-center font-bold text-white text-xl shadow-[0_0_15px_rgba(255,45,85,0.4)] transition-transform group-hover:scale-110">
              S
            </div>
            <span className="font-syne font-bold text-xl text-white tracking-tight">
              nap<span className="text-[#FF2D55]">Trace</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`font-inter text-sm font-medium transition-colors ${
                    isActive ? 'text-[#FF2D55]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/admin"
              className="group flex items-center gap-1.5 border border-[#2A2A2A] hover:border-gray-500 rounded-xl px-4 py-2 text-xs text-gray-400 hover:text-white font-medium transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Portal
            </Link>

            <Link
              to="/post"
              className="bg-[#FF2D55] hover:bg-[#E0263A] text-white flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold hover:scale-105 hover:shadow-[0_0_15px_rgba(255,45,85,0.35)] active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Post Item
            </Link>
          </div>

          {/* Mobile Hamburger Trigger */}
          <div className="md:hidden flex items-center gap-3">
            <Link
              to="/admin"
              className="p-2 text-gray-400 hover:text-white rounded-lg border border-[#2A2A2A]"
              title="Admin Panel"
            >
              <Shield className="w-4 h-4" />
            </Link>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#161616] rounded-xl border border-[#2A2A2A] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Full-Screen Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-black/95 backdrop-blur-lg flex flex-col md:hidden animate-fade-up">
          <div className="flex flex-col items-center gap-6 pt-16 px-6">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`font-syne text-2xl font-bold transition-all ${
                    isActive ? 'text-[#FF2D55] scale-105' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            
            <div className="w-full border-t border-[#2A2A2A] my-4" />

            <Link
              to="/admin"
              className="w-full flex items-center justify-center gap-2 border border-[#2A2A2A] text-gray-300 font-semibold rounded-xl py-3 text-center"
            >
              <Shield className="w-5 h-5" />
              Administrator Access
            </Link>

            <Link
              to="/post"
              className="w-full bg-[#FF2D55] text-white flex items-center justify-center gap-2 font-bold rounded-xl py-3.5 text-center shadow-[0_0_20px_rgba(255,45,85,0.25)]"
            >
              <PlusCircle className="w-5 h-5" />
              Post Lost or Found Item
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
