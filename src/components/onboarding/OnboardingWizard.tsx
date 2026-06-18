"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Building2, Globe, Phone, Mail, Lock, Database, Eye, EyeOff,
  Bot, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import LogoMark from "@/components/LogoMark";
import type { CrmProvider } from "@/types/database";

/* ─── Step config ───────────────────────────────────────────────── */
const STEPS = ["Clinic", "Contact", "CRM", "Receptionist", "Account"] as const;
type Step = number;

const CRM_OPTIONS: { value: CrmProvider; label: string }[] = [
  { value: "jane",                label: "Jane App" },
  { value: "cliniko",             label: "Cliniko" },
  { value: "mindbody",            label: "Mindbody" },
  { value: "vagaro",               label: "Vagaro" },
  { value: "acuity",               label: "Acuity Scheduling" },
  { value: "square_appointments",  label: "Square Appointments" },
  { value: "hubspot",              label: "HubSpot" },
  { value: "other",                label: "Other" },
  { value: "none",                 label: "I don't use one yet" },
];

interface FormState {
  clinicName: string;
  website: string;
  phoneNumber: string;
  contactEmail: string;
  crmProvider: CrmProvider | "";
  crmOtherName: string;
  receptionistName: string;
  password: string;
}

const slideVariants: Variants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.2, ease: "easeIn" } },
};

/* ─── Field wrapper ─────────────────────────────────────────────── */
function Field({ label, icon: Icon, children, hint }: {
  label: string; icon: React.ElementType; children: React.ReactNode; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      <div className="relative">
        <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
        {children}
      </div>
      {hint && <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}

const inputClass = "w-full pl-9 py-2.5 rounded-xl text-sm outline-none transition-colors";
const inputStyle = { background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" } as const;

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [dbFixRequired, setDbFixRequired] = useState(false);
  
  // Password visibility toggle state
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState<FormState>({
    clinicName: "",
    website: "",
    phoneNumber: "",
    contactEmail: "",
    crmProvider: "",
    crmOtherName: "",
    receptionistName: "",
    password: "",
  });

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  /* ─── Per-step validation ────────────────────────────────────── */
  function stepValid(): boolean {
    switch (step) {
      case 0: return form.clinicName.trim().length > 0; // website optional
      case 1: return form.phoneNumber.trim().length > 0 && form.contactEmail.trim().length > 0;
      case 2: return form.crmProvider !== "" && (form.crmProvider !== "other" || form.crmOtherName.trim().length > 0);
      case 3: return form.receptionistName.trim().length > 0;
      case 4: return form.password.length >= 8;
      default: return false;
    }
  }

  function next() {
    if (!stepValid()) return;
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  /* ─── Final submit ────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stepValid()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicName: form.clinicName,
          website: form.website || null,
          phoneNumber: form.phoneNumber,
          contactEmail: form.contactEmail,
          crmProvider: form.crmProvider,
          crmOtherName: form.crmProvider === "other" ? form.crmOtherName : null,
          receptionistName: form.receptionistName,
          password: form.password,
        }),
      });

      let json;
      try {
        json = await res.json();
      } catch (parseError) {
        throw new Error("Received an invalid response from the server. Please try again.");
      }

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

      setTimeout(() => {
        router.push("/login");
      }, 2200);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "A network error occurred.");
      setSubmitting(false);
    }
  }

  /* ─── The Fix View ────────────────────────────────────────────── */
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
    -- Suppress crashes so the user account is safely created
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
      <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "var(--bg-base)" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card w-full max-w-2xl p-6 md:p-8 flex flex-col gap-5"
        >
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle size={28} />
            <h2 className="text-xl font-bold">Database Trigger Hex Detected</h2>
          </div>
          
          <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            <p>
              Your Supabase instance is blocking user creation because a background database trigger (<code>handle_new_user</code>) is failing internally. This is a very common issue caused by mismatched schemas or missing <code>SECURITY DEFINER</code> policies.
            </p>
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
              To break this hex once and for all, paste and run this exact SQL in your Supabase SQL Editor:
            </p>
          </div>

          <div className="relative">
            <pre className="p-4 rounded-xl text-xs overflow-x-auto custom-scroll" style={{ background: "#1E1E1E", color: "#48C4C6" }}>
              <code>{sqlSnippet}</code>
            </pre>
          </div>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            This snippet wraps the trigger in a safe error-handler so user creation never hangs again. Our API route will automatically handle creating the profile safely once you proceed.
          </p>

          <button
            onClick={(e) => { setDbFixRequired(false); handleSubmit(e); }}
            className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
            style={{ background: "var(--teal)", color: "#fff" }}
          >
            I've run the SQL, try signing up again
          </button>
        </motion.div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-base)" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card w-full max-w-sm p-8 flex flex-col items-center text-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--success-surface)" }}>
            <CheckCircle2 size={28} style={{ color: "var(--success-text)" }} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>You're all set!</h2>
            <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Our team is setting up <strong>{form.receptionistName}</strong> for{" "}
              {form.clinicName}. We'll email you at {form.contactEmail} as soon as
              it's ready — usually within 1 business day.
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Redirecting to sign in…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-md flex flex-col gap-5">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2.5">
          <LogoMark size={44} />
          <div className="text-center">
            <h1 className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: "var(--teal)" }}>Pyrexx</span> AI
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Let's get your AI Receptionist set up
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1.5" role="group" aria-label="Onboarding progress">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col gap-1.5 items-center">
              <div
                className="h-1.5 w-full rounded-full transition-colors"
                style={{ background: i <= step ? "var(--teal)" : "var(--bg-sunken)" }}
                aria-hidden="true"
              />
              <span className="text-[10px] font-medium hidden sm:block" style={{ color: i === step ? "var(--teal-text)" : "var(--text-muted)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="card p-6 md:p-7 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} variants={slideVariants} initial="enter" animate="center" exit="exit" className="flex flex-col gap-4">

              {/* ── Step 0: Clinic ─────────────────────────────── */}
              {step === 0 && (
                <>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Tell us about your clinic</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>This appears on your dashboard and reports.</p>
                  </div>
                  <Field label="Clinic Name" icon={Building2}>
                    <input className={`${inputClass} pr-3`} style={inputStyle} value={form.clinicName}
                      onChange={(e) => update("clinicName", e.target.value)}
                      placeholder="Radiance MedSpa & Wellness" required />
                  </Field>
                  <Field label="Website" icon={Globe} hint="Optional — helps us match your brand voice.">
                    <input className={`${inputClass} pr-3`} style={inputStyle} value={form.website}
                      onChange={(e) => update("website", e.target.value)}
                      placeholder="radiancemedspa.com" type="url" />
                  </Field>
                </>
              )}

              {/* ── Step 1: Contact ────────────────────────────── */}
              {step === 1 && (
                <>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>How do we reach you?</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      The phone number is what your AI Receptionist will answer.
                    </p>
                  </div>
                  <Field label="Clinic Phone Number" icon={Phone} hint="The number your AI Receptionist will be connected to.">
                    <input className={`${inputClass} pr-3`} style={inputStyle} value={form.phoneNumber}
                      onChange={(e) => update("phoneNumber", e.target.value)}
                      placeholder="+1 (305) 555-0182" type="tel" required />
                  </Field>
                  <Field label="Contact Email" icon={Mail} hint="Where we'll send setup updates and your dashboard invite.">
                    <input className={`${inputClass} pr-3`} style={inputStyle} value={form.contactEmail}
                      onChange={(e) => update("contactEmail", e.target.value)}
                      placeholder="you@clinic.com" type="email" required />
                  </Field>
                </>
              )}

              {/* ── Step 2: CRM ────────────────────────────────── */}
              {step === 2 && (
                <>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>What do you use for bookings?</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      We'll connect your AI Receptionist to it during setup.
                    </p>
                  </div>
                  <Field label="CRM / Booking Software" icon={Database}>
                    <select
                      className={`${inputClass} pr-3 appearance-none cursor-pointer`}
                      style={inputStyle}
                      value={form.crmProvider}
                      onChange={(e) => update("crmProvider", e.target.value as CrmProvider)}
                      required
                    >
                      <option value="" disabled>Select one…</option>
                      {CRM_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </Field>
                  {form.crmProvider === "other" && (
                    <Field label="Which one?" icon={Database}>
                      <input className={`${inputClass} pr-3`} style={inputStyle} value={form.crmOtherName}
                        onChange={(e) => update("crmOtherName", e.target.value)}
                        placeholder="e.g. Zenoti" required />
                    </Field>
                  )}
                </>
              )}

              {/* ── Step 3: Receptionist ────────────────────────── */}
              {step === 3 && (
                <>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Name your AI Receptionist</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      This is how it introduces itself on every call — e.g. "Thank you for calling {form.clinicName || "your clinic"}, this is ___."
                    </p>
                  </div>
                  <Field label="Receptionist Name" icon={Bot}>
                    <input className={`${inputClass} pr-3`} style={inputStyle} value={form.receptionistName}
                      onChange={(e) => update("receptionistName", e.target.value)}
                      placeholder="Aria" required />
                  </Field>
                </>
              )}

              {/* ── Step 4: Account ─────────────────────────────── */}
              {step === 4 && (
                <>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Create your login</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      You'll use {form.contactEmail || "this email"} to sign in to your dashboard.
                    </p>
                  </div>
                  <Field label="Password" icon={Lock} hint="At least 8 characters.">
                    <input className={inputClass} style={{ ...inputStyle, paddingRight: "2.5rem" }} value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="••••••••" type={showPassword ? "text" : "password"} minLength={8} required />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      onMouseOver={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                      onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </Field>

                  {/* Plan summary */}
                  <div className="rounded-2xl p-4" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)" }}>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Pyrexx AI Receptionist</span>
                      <span className="text-sm font-extrabold" style={{ color: "var(--teal-text)" }}>$1,000<span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>/mo</span></span>
                    </div>
                    <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      Includes full setup &amp; CRM connection, done by our team.
                      Billing details are collected after your account is created.
                    </p>
                  </div>
                </>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: "var(--error-surface)", color: "var(--error-text)" }} role="alert">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Nav buttons */}
          <div className="flex items-center gap-3 mt-6">
            {step > 0 && (
              <button type="button" onClick={back}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                style={{ background: "var(--bg-sunken)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                <ArrowLeft size={14} aria-hidden="true" /> Back
              </button>
            )}
            <div className="flex-1" />
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={next} disabled={!stepValid()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--teal)", color: "#fff" }}>
                Continue <ArrowRight size={14} aria-hidden="true" />
              </button>
            ) : (
              <button type="submit" disabled={!stepValid() || submitting}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "var(--teal)", color: "#fff" }}>
                {submitting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                {submitting ? "Setting up…" : "Create Account"}
              </button>
            )}
          </div>
        </form>

        <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <a href="/login" className="font-semibold" style={{ color: "var(--teal-text)" }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}