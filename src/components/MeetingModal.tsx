"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, User, Phone } from "lucide-react";

export interface Meeting {
  id: number;
  name: string;
  type: string;
  time: string;
  status: string;
  transcriptPreview?: string;
}

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting | null;
}

export default function MeetingModal({ isOpen, onClose, meeting }: MeetingModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // FIX [12]: Focus trap — move focus into modal when it opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the animation start before grabbing focus
      const id = setTimeout(() => closeButtonRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  // FIX [12]: Keyboard trap — prevent Tab from leaving the modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!meeting) return null;

  const titleId = `modal-title-${meeting.id}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          // FIX [12]: Proper ARIA attributes for dialog
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/50 dark:bg-[#0A0514]/75 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal panel */}
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            // FIX [21]: rounded-[2rem] → rounded-3xl (canonical)
            className="
              relative w-full max-w-md
              bg-white dark:bg-pyrexx-darkCard
              rounded-3xl
              shadow-float
              overflow-hidden flex flex-col max-h-[65vh]
            "
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-pyrexx-purple/20">
              <h2
                id={titleId}
                className="text-xl font-bold text-slate-800 dark:text-white"
              >
                Meeting Details
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                // FIX [10]: Descriptive aria-label
                aria-label="Close meeting details"
                className="
                  p-2.5 rounded-full cursor-pointer
                  bg-slate-100 dark:bg-pyrexx-surface
                  hover:bg-pyrexx-blue/20 dark:hover:bg-pyrexx-purple/40
                  text-slate-500 dark:text-slate-300
                  transition-colors
                "
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <dl className="space-y-5">
                <div className="flex items-center gap-4 text-slate-700 dark:text-slate-200">
                  <div className="p-2.5 bg-pyrexx-blue/10 dark:bg-pyrexx-blue/20 rounded-xl shrink-0">
                    <User className="text-pyrexx-blue" size={16} aria-hidden="true" />
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-0.5">Patient</dt>
                    <dd className="font-semibold text-base">{meeting.name}</dd>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-700 dark:text-slate-200">
                  <div className="p-2.5 bg-pyrexx-purple/10 dark:bg-pyrexx-purple/20 rounded-xl shrink-0">
                    <Phone className="text-pyrexx-purple" size={16} aria-hidden="true" />
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-0.5">Service</dt>
                    <dd className="font-semibold text-base">{meeting.type}</dd>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-700 dark:text-slate-200">
                  <div className="p-2.5 bg-pyrexx-blue/10 dark:bg-pyrexx-blue/20 rounded-xl shrink-0">
                    <Clock className="text-pyrexx-blue" size={16} aria-hidden="true" />
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-0.5">Time</dt>
                    <dd className="font-semibold text-base">{meeting.time}</dd>
                  </div>
                </div>

                {meeting.transcriptPreview && (
                  <div className="mt-2 p-4 bg-slate-50 dark:bg-pyrexx-surface rounded-2xl border border-pyrexx-blue/15 dark:border-pyrexx-purple/20">
                    <h4 className="text-[10px] font-bold text-pyrexx-purple dark:text-pyrexx-blue mb-2.5 uppercase tracking-wider">
                      AI Transcript Preview
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">
                      "{meeting.transcriptPreview}"
                    </p>
                  </div>
                )}
              </dl>
            </div>

            {/* Footer action */}
            <div className="px-6 pb-6 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="
                  w-full py-3 rounded-xl cursor-pointer font-semibold text-sm
                  bg-pyrexx-blue/10 dark:bg-pyrexx-blue/20
                  text-pyrexx-blue hover:bg-pyrexx-blue hover:text-white
                  dark:hover:bg-pyrexx-blue dark:hover:text-white
                  transition-colors
                "
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
