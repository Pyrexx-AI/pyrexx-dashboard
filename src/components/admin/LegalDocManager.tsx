"use client";

import React, { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Save, FileCode, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const DOC_TYPES = [
  { type: "msa", label: "Master Service Agreement (MSA)" },
  { type: "sow", label: "Statement of Work (SOW)" },
  { type: "baa", label: "Business Associate Agreement (BAA)" },
  { type: "dpa", label: "Data Processing Agreement (DPA)" },
  { type: "privacy_policy", label: "Privacy Policy" },
  { type: "terms_of_service", label: "Terms of Service" },
];

export default function LegalDocManager() {
  const [selectedType, setSelectedType] = useState("baa");
  const [title, setTitle] = useState("Business Associate Agreement");
  const [version, setVersion] = useState("v1.1.0");
  const [markdown, setMarkdown] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTypeChange = (typeStr: string) => {
    setSelectedType(typeStr);
    const found = DOC_TYPES.find((d) => d.type === typeStr);
    if (found) setTitle(found.label);
  };

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const formData = new FormData();
      formData.append("documentType", selectedType);
      formData.append("title", title);
      formData.append("version", version);
      if (file) formData.append("file", file);
      if (markdown) formData.append("manualMarkdown", markdown);

      const res = await fetch("/api/admin/legal/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to update legal document");
      }

      setSuccessMsg(`Successfully updated ${title} (${version})!`);
      setFile(null);
      setMarkdown("");
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during document upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border-subtle)" }}>
        <div>
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
            Legal Documents Manager
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Upload PDF, DOCX, or TXT files to update onboarding agreements dynamically.
          </p>
        </div>
        <span className="badge text-[10px]" style={{ background: "var(--teal-surface)", color: "var(--teal-text)" }}>
          <Sparkles size={10} /> Dynamic CMS Engine
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Document Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
              style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {DOC_TYPES.map((d) => (
                <option key={d.type} value={d.type}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Version Tag
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              required
              placeholder="v1.1.0"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
        </div>

        {/* Drag & Drop File Upload Area (PDF, DOCX, TXT) */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Upload File (PDF, DOCX, TXT, MD)
          </label>
          <div
            className="border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center transition-colors cursor-pointer"
            style={{ background: "var(--bg-sunken)", borderColor: file ? "var(--teal)" : "var(--border-subtle)" }}
          >
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileDrop}
              className="hidden"
              id="legal-file-upload"
            />
            <label htmlFor="legal-file-upload" className="cursor-pointer flex flex-col items-center">
              <Upload size={24} style={{ color: file ? "var(--teal)" : "var(--text-muted)" }} className="mb-2" />
              {file ? (
                <div>
                  <p className="text-xs font-bold" style={{ color: "var(--teal-text)" }}>{file.name}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                    Click to browse or drop a PDF, Word (.docx), or Text document
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Automatic formatting extraction enabled
                  </p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Optional Direct Markdown Editor */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Or Paste / Edit Markdown Content Directly
          </label>
          <textarea
            rows={5}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="# Document Title&#10;&#10;Paste markdown clauses here..."
            className="w-full p-3 rounded-xl text-xs font-mono outline-none resize-none"
            style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          />
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: "var(--success-surface)", color: "var(--success-text)" }}>
            <CheckCircle2 size={14} /> <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: "var(--error-surface)", color: "var(--error-text)" }}>
            <AlertCircle size={14} /> <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || (!file && !markdown)}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50 w-fit"
          style={{ background: "var(--teal)", color: "#fff" }}
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {uploading ? "Publishing Document..." : "Publish Agreement Version"}
        </button>
      </form>
    </div>
  );
}