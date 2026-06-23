// src/components/onboarding/AccountStep.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

interface AccountStepProps {
  clinicId: string;
  contactEmail?: string;
  /** Called after a successful account creation, before the auto-redirect timer. */
  onSuccess?: () => void;
}

export default function AccountStep({ clinicId, contactEmail, onSuccess }: AccountStepProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [dbFixRequired, setDbFixRequired] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, password }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.requiresDbFix) {
          setDbFixRequired(true);
          setSubmitting(false);
          return;
        }
        setError(json.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setDone(true);
      setSubmitting(false);
      onSuccess?.();
      setTimeout(() => router.push("/login"), 2200);
    } catch {
      setError("Network error — please check your connection and try again.");
      setSubmitting(false);
    }
  }

  /* ─── The Database Fix View ────────────────────────────────────────────── */
  if (dbFixRequired) {
    const sqlSnippet = `-- Fix failing auth.users trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, clinic_id, role, full_name)
    values (
      new.id,
      nullif(new.raw_user_meta_data->>'clinic_id', '')::uuid,
      coalesce(new.raw_user_meta_data->>'role', 'owner'),
      new.raw_user_meta_data->>'full_name'
    );
  exception when others then
    raise log 'Profile creation failed: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();`;

    return (
      <div className="flex flex-col gap-4 py-2">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle size={22} className="flex-shrink-0" />
          <h2 className="text-base font-bold leading-tight">Database Configuration Needed</h2>
        </div>
        
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Your Supabase instance is blocking user creation due to a failing background database trigger. 
          To fix this permanently, run the following SQL snippet in your Supabase SQL Editor:
        </p>

        <div className="relative">
          <pre className="p-4 rounded-xl text-[10px] overflow-x-auto custom-scroll" style={{ background: "#1E1E1E", color: "#48C4C6" }}>
            <code>{sqlSnippet}</code>
          </pre>
        </div>

        <button
          onClick={(e) => { setDbFixRequired(false); handleSubmit(e); }}
          className="w-full flex items-center justify-center gap-2 py-3 mt-1 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
          style={{ background: "var(--teal)", color: "#fff" }}
        >
          I've run the SQL, try signing up again
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--success-surface)" }}>
          <CheckCircle2 size={28} style={{ color: "var(--success-text)" }} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>You're all set!</h2>
          <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Your account is ready. Our team is now setting up your AI Receptionist
            — we'll email you as soon as it's connected, usually within 1 business day.
          </p>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Create your login</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {contactEmail ? `You'll use ${contactEmail} to sign in.` : "Almost done — set a password for your dashboard."}
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Password</label>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
            style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          />
        </div>
        <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>At least 8 characters.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: "var(--error-surface)", color: "var(--error-text)" }} role="alert">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || password.length < 8}
        className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: "var(--teal)", color: "#fff" }}
      >
        {submitting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
        {submitting ? "Creating account…" : "Create Account"}
      </button>
    </form>
  );
}