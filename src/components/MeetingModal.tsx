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
      {/* Light backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-pyrexx-dark/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[60vh]"
      >
        <div className="flex justify-between items-center p-6 border-b border-pyrexx-light">
          <h2 className="text-xl font-bold text-slate-800">Meeting Details</h2>
          <button onClick={onClose} className="p-2 bg-slate-50 rounded-full hover:bg-pyrexx-light transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-600">
              <User className="text-pyrexx-cyan" size={20} />
              <span className="font-medium">{meeting.name}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Phone className="text-pyrexx-purple" size={20} />
              <span className="font-medium">{meeting.type}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Clock className="text-pyrexx-cyan" size={20} />
              <span className="font-medium">{meeting.time}</span>
            </div>
            
            {meeting.transcriptPreview && (
              <div className="mt-6 p-4 bg-pyrexx-light rounded-2xl border border-pyrexx-light">
                <h4 className="text-sm font-semibold text-pyrexx-purple mb-2">Transcript Preview</h4>
                <p className="text-sm text-slate-600 italic leading-relaxed">
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