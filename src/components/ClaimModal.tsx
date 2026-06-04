import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { X, Send, AlertTriangle } from 'lucide-react';
import { Item } from '../types';

interface ClaimModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClaimModal({ item, isOpen, onClose, onSuccess }: ClaimModalProps) {
  const [formData, setFormData] = useState({
    claimerName: '',
    studentId: '',
    claimerEmail: '',
    phone: '',
    proofText: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.claimerName || !formData.studentId || !formData.claimerEmail || !formData.proofText) {
      setErrorMsg('Please load all required field inputs.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.id,
          claimer_name: formData.claimerName,
          claimer_email: formData.claimerEmail,
          student_id: formData.studentId,
          phone: formData.phone || undefined,
          proof_text: formData.proofText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit claim request.');
      }

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 30 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative bg-[#161616] border border-[#2A2A2A] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
      >
        {/* Header Header */}
        <div className="border-b border-[#2A2A2A] p-5 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-[#FFB800] match-label font-bold">
              Claim Request
            </span>
            <h2 className="font-syne font-bold text-xl text-white mt-0.5 line-clamp-1">
              {item.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-[#2A2A2A] text-gray-400 hover:text-white hover:bg-[#1A1A1A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          
          {/* Miniature Summary */}
          <div className="flex items-center gap-3 bg-[#0F0F0F] p-3 rounded-xl border border-[#2A2A2A]">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.title}
                className="w-12 h-12 rounded-lg object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-lg">
                📦
              </div>
            )}
            <div className="text-xs font-inter text-gray-400">
              <span className="block font-medium text-white line-clamp-1">{item.title}</span>
              📍 {item.location} · 🗓️ {item.date_occurred}
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-[#FF2D55] text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Fields Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1 space-y-1.5">
              <label className="text-xs text-[#888888] font-inter font-medium">
                Full Name <span className="text-[#FF2D55]">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="Rahul Sharma"
                className="input-style text-sm font-inter"
                value={formData.claimerName}
                onChange={(e) => setFormData({ ...formData, claimerName: e.target.value })}
              />
            </div>
            
            <div className="col-span-2 sm:col-span-1 space-y-1.5">
              <label className="text-xs text-[#888888] font-inter font-medium">
                Student ID <span className="text-[#FF2D55]">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="AITR/2024/041"
                className="input-style text-sm font-mono"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#888888] font-inter font-medium">
              University Email Address <span className="text-[#FF2D55]">*</span>
            </label>
            <input
              required
              type="email"
              placeholder="rahulsharma@aitr.ac.in"
              className="input-style text-sm font-inter"
              value={formData.claimerEmail}
              onChange={(e) => setFormData({ ...formData, claimerEmail: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#888888] font-inter font-medium">
              Phone Contact <span className="text-gray-500">(Optional)</span>
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              className="input-style text-sm font-inter"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#888888] font-inter font-medium block">
              Proof of Ownership <span className="text-[#FF2D55]">*</span>
            </label>
            <span className="text-[10px] text-gray-500 font-inter leading-tight block">
              Describe something unique about this item that only the true owner would know, such as private settings, internal marks, stickers, lockscreen visual, etc.
            </span>
            <textarea
              required
              rows={3}
              placeholder="e.g. My laptop has a small scratched logo bottom right, and a red key ring attached to the charging plug..."
              className="input-style text-sm font-inter resize-none h-24"
              value={formData.proofText}
              onChange={(e) => setFormData({ ...formData, proofText: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#FF2D55] hover:bg-[#E0263A] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(255,45,85,0.2)] disabled:opacity-40 disabled:hover:scale-100"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Claim Request
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
