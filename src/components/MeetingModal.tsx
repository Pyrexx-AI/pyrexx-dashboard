"use client";

import { motion } from "framer-motion";
import { X, Clock, User, Phone } from "lucide-react";

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: { name: string; type: string; time: string; status: string; transcriptPreview?: string; } | null;
}

export default function MeetingModal({ isOpen, onClose, meeting }: MeetingModalProps) {
  if (!isOpen || !meeting) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 dark:bg-[#0A0514]/70 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-lg bg-white dark:bg-pyrexx-darkCard rounded-[2rem] shadow-expensive dark:shadow-expensive-dark overflow-hidden flex flex-col max-h-[60vh] transition-colors"
      >
        <div className="flex justify-between items-center p-6 md:p-8 border-b border-slate-100 dark:border-pyrexx-purple/20">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Meeting Details</h2>
          <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-[#2A1842] rounded-full hover:bg-pyrexx-blue/20 dark:hover:bg-pyrexx-purple/40 transition-colors text-slate-500 dark:text-slate-300">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-slate-700 dark:text-slate-200">
              <div className="p-3 bg-pyrexx-blue/10 dark:bg-pyrexx-blue/20 rounded-xl"><User className="text-pyrexx-blue" size={18} /></div>
              <span className="font-semibold text-base md:text-lg">{meeting.name}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-700 dark:text-slate-200">
              <div className="p-3 bg-pyrexx-purple/10 dark:bg-pyrexx-purple/20 rounded-xl"><Phone className="text-pyrexx-purple" size={18} /></div>
              <span className="font-semibold text-base md:text-lg">{meeting.type}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-700 dark:text-slate-200">
              <div className="p-3 bg-pyrexx-blue/10 dark:bg-pyrexx-blue/20 rounded-xl"><Clock className="text-pyrexx-blue" size={18} /></div>
              <span className="font-semibold text-base md:text-lg">{meeting.time}</span>
            </div>
            
            {meeting.transcriptPreview && (
              <div className="mt-8 p-5 md:p-6 bg-slate-50 dark:bg-[#2A1842] rounded-2xl border border-pyrexx-blue/20 dark:border-pyrexx-purple/20">
                <h4 className="text-[11px] md:text-xs font-bold text-pyrexx-purple dark:text-pyrexx-blue mb-3 uppercase tracking-wider">Transcript Preview</h4>
                <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 italic leading-relaxed">
                  "{meeting.transcriptPreview}"
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}