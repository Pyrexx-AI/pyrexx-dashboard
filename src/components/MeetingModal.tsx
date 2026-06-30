"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, User, Phone, MessageSquare } from "lucide-react";

export interface Meeting {
  id: number;
  name: string;
  type: string;
  time: string;
  status: string;
  transcriptPreview?: string;
  bookedAt?: string;
}

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting | null;
}

function statusStyle(status: string) {
  switch (status) {
    case "Completed": return { bg: "var(--success-surface)", color: "var(--success-text)" };
    case "Scheduled": return { bg: "var(--purple-surface)", color: "var(--purple-text)" };
    case "Confirmed": return { bg: "var(--teal-surface)", color: "var(--teal-text)" };
    default:          return { bg: "var(--warning-surface)", color: "var(--warning-text)" };
  }
}

const fields = [
  { icon: User,          labelKey: "Patient",  valueKey: "name" as const },
  { icon: Phone,         labelKey: "Service",  valueKey: "type" as const },
  { icon: Clock,         labelKey: "Time",     valueKey: "time" as const },
];

export default function MeetingModal({ isOpen, onClose, meeting }: MeetingModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) { const t = setTimeout(() => closeRef.current?.focus(), 60); return () => clearTimeout(t); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      
      const panel = panelRef.current; if (!panel) return;
      const nodes = panel.querySelectorAll<HTMLElement>('button,[href],[tabindex]:not([tabindex="-1"])');
      if (nodes.length === 0) return;
      
      const first = nodes[0]; const last = nodes[nodes.length - 1];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!meeting) return null;
  const titleId = `meeting-modal-${meeting.id}`;
  const { bg: statusBg, color: statusColor } = statusStyle(meeting.status);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog" aria-modal="true" aria-labelledby={titleId}>
          {/* Backdrop */}
          <motion.div className="absolute inset-0"
            style={{ background: "rgba(10,5,20,0.60)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }} onClick={onClose} aria-hidden="true" />

          {/* Card */}
          <motion.div ref={panelRef}
            className="relative w-full max-w-sm flex flex-col"
            style={{ background: "var(--bg-card)", borderRadius: "1.5rem",
              border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-xl)" }}
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <div>
                <h2 id={titleId} className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  Meeting Details
                </h2>
                <span className="badge mt-1 text-[10px]" style={{ background: statusBg, color: statusColor }}>
                  {meeting.status}
                </span>
              </div>
              <button ref={closeRef} type="button" onClick={onClose} aria-label="Close meeting details"
                className="flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors"
                style={{ background: "var(--bg-sunken)", color: "var(--text-secondary)" }}>
                <X size={15} aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4 overflow-y-auto custom-scroll" style={{ maxHeight: "55vh" }}>
              <dl className="space-y-3">
                {fields.map(({ icon: Icon, labelKey, valueKey }) => (
                  <div key={labelKey} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--teal-surface)" }}>
                      <Icon size={14} style={{ color: "var(--teal)" }} aria-hidden="true" />
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                        style={{ color: "var(--text-muted)" }}>{labelKey}</dt>
                      <dd className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {meeting[valueKey]}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>

              {meeting.transcriptPreview && (
                <div className="rounded-2xl p-4"
                  style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={12} style={{ color: "var(--teal)" }} aria-hidden="true" />
                    <h4 className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--teal-text)" }}>AI Transcript Preview</h4>
                  </div>
                  <p className="text-xs italic leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    "{meeting.transcriptPreview}"
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-2">
              <button type="button" onClick={onClose}
                className="w-full py-2.5 rounded-xl cursor-pointer font-semibold text-sm transition-colors"
                style={{ background: "var(--teal-surface)", color: "var(--teal-text)" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#48C4C6", e.currentTarget.style.color = "#fff")}
                onMouseOut={(e) => (e.currentTarget.style.background = "var(--teal-surface)", e.currentTarget.style.color = "var(--teal-text)")}>
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}