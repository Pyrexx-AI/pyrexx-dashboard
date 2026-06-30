"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Clock, CheckCircle2, AlertCircle, CalendarClock } from "lucide-react";
import type { Meeting } from "./MeetingModal";

interface ListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  meetings: Meeting[];
  onSelectMeeting: (m: Meeting) => void;
  variant?: "recent" | "booked" | "upcoming";
}

function statusConfig(status: string) {
  switch (status) {
    case "Completed":
      return {
        bg: "var(--success-surface)",
        color: "var(--success-text)",
        Icon: CheckCircle2,
      };
    case "Scheduled":
      return {
        bg: "var(--purple-surface)",
        color: "var(--purple-text)",
        Icon: CalendarClock,
      };
    case "Confirmed":
      return {
        bg: "var(--teal-surface)",
        color: "var(--teal-text)",
        Icon: CheckCircle2,
      };
    default:
      return {
        bg: "var(--warning-surface)",
        color: "var(--warning-text)",
        Icon: AlertCircle,
      };
  }
}

export default function ListModal({
  isOpen,
  onClose,
  title,
  subtitle,
  meetings,
  onSelectMeeting,
  variant = "recent",
}: ListModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = `list-modal-title-${title.replace(/\s+/g, "-").toLowerCase()}`;

  /* Focus trap */
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => closeRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const accentColor =
    variant === "upcoming" ? "var(--purple)" :
    variant === "booked"   ? "var(--teal)"   : "var(--teal)";

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(10,5,20,0.55)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel — sheet on mobile, centered card on sm+ */}
          <motion.div
            ref={panelRef}
            className="relative w-full sm:max-w-lg flex flex-col"
            style={{
              background: "var(--bg-card)",
              borderRadius: "1.5rem 1.5rem 0 0",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-xl)",
              maxHeight: "62vh",
            }}
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 48, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
          >
            {/* sm+: full rounded card */}
            <style>{`
              @media (min-width: 640px) {
                [data-list-panel] {
                  border-radius: 1.5rem !important;
                  max-height: 60vh !important;
                }
              }
            `}</style>
            <div data-list-panel style={{ display: "contents" }}>

              {/* Drag handle (mobile only) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden="true">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--border-medium)" }} />
              </div>

              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <div>
                  <h2
                    id={titleId}
                    className="text-base font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Close list"
                  className="flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors"
                  style={{ background: "var(--bg-sunken)", color: "var(--text-secondary)" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "var(--border-subtle)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </div>

              {/* Scrollable list body */}
              <div
                className="flex-1 overflow-y-auto custom-scroll px-3 py-2"
                role="list"
              >
                {meetings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                      No items yet
                    </p>
                  </div>
                ) : (
                  meetings.map((meeting, idx) => {
                    const { bg, color, Icon } = statusConfig(meeting.status);
                    return (
                      <motion.button
                        key={meeting.id}
                        type="button"
                        role="listitem"
                        onClick={() => { onSelectMeeting(meeting); onClose(); }}
                        aria-label={`View details for ${meeting.name}, ${meeting.type}`}
                        className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer group"
                        style={{ borderBottom: idx < meetings.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                        whileHover={{ backgroundColor: "var(--bg-sunken)" }}
                        transition={{ duration: 0.15 }}
                      >
                        {/* Status icon */}
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: bg }}
                        >
                          <Icon size={14} style={{ color }} aria-hidden="true" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-sm font-semibold truncate"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {meeting.name}
                            </span>
                            <span
                              className="badge flex-shrink-0 text-[10px]"
                              style={{ background: bg, color }}
                            >
                              {meeting.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                              {meeting.type}
                            </span>
                            <span style={{ color: "var(--border-medium)" }} aria-hidden="true">·</span>
                            <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                              {meeting.time}
                            </span>
                          </div>
                          {meeting.bookedAt && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock size={10} style={{ color: accentColor }} aria-hidden="true" />
                              <span className="text-[10px] font-medium" style={{ color: accentColor }}>
                                Booked {meeting.bookedAt}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Chevron */}
                        <ChevronRight
                          size={14}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "var(--text-muted)" }}
                          aria-hidden="true"
                        />
                      </motion.button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div
                className="px-5 py-3"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                  {meetings.length} {meetings.length === 1 ? "record" : "records"} total
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}