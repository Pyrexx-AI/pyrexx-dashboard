"use client";

import { useState, useRef, useCallback } from "react";
import { CheckCircle2, FileText, ChevronDown, AlertTriangle } from "lucide-react";
import { LEGAL_DOCUMENTS, type LegalDocument } from "@/lib/legal-docs";

interface DocumentSignerProps {
  signerName: string;
  onSignerNameChange: (name: string) => void;
  allSigned: boolean;
  onAllSignedChange: (signed: boolean) => void;
}

function renderMarkdown(md: string): string {
  return md
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) return `<h2 class="text-base font-bold mb-2">${line.slice(2)}</h2>`;
      if (line.trim() === "") return "<br/>";
      const bolded = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      return `<p class="text-xs leading-relaxed mb-2">${bolded}</p>`;
    })
    .join("");
}

function DocumentCard({ doc, onAcknowledged }: { doc: LegalDocument; onAcknowledged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [reachedBottom, setReachedBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 12;
    if (atBottom && !reachedBottom) {
      setReachedBottom(true);
      onAcknowledged();
    }
  }, [reachedBottom, onAcknowledged]);

  const handleManualAcknowledge = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion toggle
    if (!reachedBottom) {
      setReachedBottom(true);
      onAcknowledged();
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 cursor-pointer"
        style={{ background: "var(--bg-sunken)" }}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Manually clickable acknowledge button */}
          <button 
            type="button"
            onClick={handleManualAcknowledge}
            title="Click to acknowledge"
            className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors"
            style={{ 
              background: reachedBottom ? "var(--success-surface)" : "var(--bg-card)",
              border: reachedBottom ? "none" : "1px solid var(--border-subtle)" 
            }}
          >
            {reachedBottom
              ? <CheckCircle2 size={14} style={{ color: "var(--success-text)" }} aria-hidden="true" />
              : <FileText size={14} style={{ color: "var(--text-muted)" }} aria-hidden="true" />}
          </button>
          
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{doc.title}</span>
        </div>
        <ChevronDown size={15} style={{ color: "var(--text-muted)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} aria-hidden="true" />
      </button>

      {expanded && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="px-4 py-3 overflow-y-auto custom-scroll"
          style={{ maxHeight: 220, background: "var(--bg-card)" }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }}
        />
      )}

      {!reachedBottom && (
        <p className="text-[10px] px-4 py-2" style={{ color: "var(--text-muted)", background: "var(--bg-card)" }}>
          {expanded ? "Scroll to the bottom or tap the document icon to acknowledge." : "Tap to review or tap the document icon to acknowledge directly."}
        </p>
      )}
    </div>
  );
}

export default function DocumentSigner({
  signerName, onSignerNameChange, allSigned, onAllSignedChange,
}: DocumentSignerProps) {
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  const markRead = (type: string) => {
    setReadSet((prev) => {
      const next = new Set(prev).add(type);
      const allRead = next.size === LEGAL_DOCUMENTS.length;
      onAllSignedChange(allRead && signerName.trim().length > 1);
      return next;
    });
  };

  function handleNameChange(name: string) {
    onSignerNameChange(name);
    const allRead = readSet.size === LEGAL_DOCUMENTS.length;
    onAllSignedChange(allRead && name.trim().length > 1);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[11px]" style={{ background: "var(--warning-surface)", color: "var(--warning-text)" }}>
        <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>Review each document below — you must acknowledge all of them before you can continue.</span>
      </div>

      {LEGAL_DOCUMENTS.map((doc) => (
        <DocumentCard key={doc.type} doc={doc} onAcknowledged={() => markRead(doc.type)} />
      ))}

      <div className="pt-1">
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
          Type your full legal name to sign
        </label>
        <input
          type="text"
          value={signerName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Jane A. Doe"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
          style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
        />
        <p className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>
          By typing your name above, you're electronically signing all {LEGAL_DOCUMENTS.length} documents reviewed above, dated to today.
        </p>
      </div>

      {allSigned && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: "var(--success-surface)", color: "var(--success-text)" }}>
          <CheckCircle2 size={13} aria-hidden="true" /> All documents reviewed and signed
        </div>
      )}
    </div>
  );
}