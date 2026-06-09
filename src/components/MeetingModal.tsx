"use client";

import { motion } from "framer-motion";
import { X, Clock, User, Phone } from "lucide-react";

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: {
    name: string;
    type: string;
    time: string;
    status: string;
    transcriptPreview?: string;
  } | null;
}

export default function MeetingModal({ isOpen, onClose, meeting }: MeetingModalProps) {
  if (!isOpen || !meeting) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/10 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-expensive overflow-hidden flex flex-col max-h-[60vh]"
      >
        <div className="flex justify-between items-center p-8 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800">Meeting Details</h2>
          <button onClick={onClose} className="p-3 bg-slate-50 rounded-full hover:bg-pastel-light transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-slate-700">
              <div className="p-3 bg-pastel-light rounded-xl"><User className="text-pastel-dark" size={20} /></div>
              <span className="font-semibold text-lg">{meeting.name}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-700">
              <div className="p-3 bg-pastel-light rounded-xl"><Phone className="text-pastel-dark" size={20} /></div>
              <span className="font-semibold text-lg">{meeting.type}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-700">
              <div className="p-3 bg-pastel-light rounded-xl"><Clock className="text-pastel-dark" size={20} /></div>
              <span className="font-semibold text-lg">{meeting.time}</span>
            </div>
            
            {meeting.transcriptPreview && (
              <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-pastel-light">
                <h4 className="text-sm font-bold text-pastel-dark mb-3 uppercase tracking-wider">Transcript Preview</h4>
                <p className="text-base text-slate-600 italic leading-relaxed">
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