import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, MapPin, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Item } from '../types';

interface ItemCardProps {
  item: Item;
  key?: any;
}

// Category Emoji Mapper
export const categoryEmojis: Record<string, string> = {
  electronics: "📱",
  clothing: "👕",
  stationery: "✏️",
  accessories: "⌚",
  accessory: "⌚",
  "id/cards": "🪪",
  id_card: "🪪",
  other: "📦",
};

export default function ItemCard({ item }: ItemCardProps) {
  const [imageError, setImageError] = useState(false);

  const getCategoryEmoji = (cat: string) => {
    const key = cat.toLowerCase();
    return categoryEmojis[key] || "📦";
  };

  // Convert time to human description
  const timeAgo = () => {
    try {
      return formatDistanceToNow(new Date(item.created_at), { addSuffix: true });
    } catch (e) {
      return "recently";
    }
  };

  return (
    <div className="group bg-[#161616] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:border-[#FF2D55]/50 hover:shadow-[0_0_20px_rgba(255,45,85,0.15)] flex flex-col h-full">
      
      {/* Top Banner Content (Image or Emoji Fallback) */}
      <div className="relative aspect-square w-full bg-[#0F0F0F] flex items-center justify-center overflow-hidden">
        
        {!imageError && item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 animate-pulse">
            <span className="text-6xl select-none">{getCategoryEmoji(item.category)}</span>
            <span className="text-[#888888] text-xs font-mono tracking-wider uppercase">
              {item.category}
            </span>
          </div>
        )}

        {/* Floating Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {item.type === 'found' ? (
            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              Found
            </span>
          ) : (
            <span className="bg-[#FF2D55]/20 text-[#FF2D55] border border-[#FF2D55]/30 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              Lost
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3">
          {item.status === 'open' && (
            <span className="bg-[#00D26A]/20 text-[#00D26A] border border-[#00D26A]/30 rounded-full px-3 py-1 text-xs font-semibold animate-pulse backdrop-blur-sm">
              Open
            </span>
          )}
          {item.status === 'claimed' && (
            <span className="bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/30 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              Claimed
            </span>
          )}
          {item.status === 'resolved' && (
            <span className="bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              Resolved
            </span>
          )}
        </div>
      </div>

      {/* Card Content Footer */}
      <div className="p-5 flex flex-col flex-grow justify-between gap-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-white text-lg font-syne line-clamp-1 group-hover:text-[#FF2D55] transition-colors">
            {item.title}
          </h3>
          
          <div className="flex items-center gap-2 text-xs text-[#888888] font-inter">
            <Package className="w-3.5 h-3.5 text-gray-500" />
            <span className="line-clamp-1">{item.category}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#888888] font-inter">
            <MapPin className="w-3.5 h-3.5 text-[#FF2D55]" />
            <span className="line-clamp-1">{item.location}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#888888] font-mono">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span>{timeAgo()}</span>
          </div>
        </div>

        <Link
          to={`/item/${item.id}`}
          className="w-full flex items-center justify-center gap-2 border border-[#2A2A2A] text-white hover:border-[#FF2D55] rounded-xl py-2.5 text-xs font-semibold transition-all group-hover:bg-[#FF2D55]/5"
        >
          View Details
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

    </div>
  );
}
