"use client";

/**
 * OnboardingWizard — Unified DFY Onboarding Flow
 * ───────────────────────────────────────────────────────────────
 * Order: Clinic → Contact → CRM → Plan → Receptionist → Documents
 *        (sign) → Payment (embedded) → Account (password) → done.
 *
 * This replaces the old two-stage flow (Google Sites doc-signing hub
 * → external payment redirect → separate manual account creation)
 * with everything happening on-domain, in one continuous wizard.
 *
 * KEY DESIGN DECISION — why the clinic record is created mid-flow,
 * not at the very end:
 * The user-visible step order is "sign documents → pay → sign up",
 * but Dodo's checkout session needs a real clinic_id to attach as
 * metadata (so the webhook that confirms payment can find the right
 * clinic). So /api/onboarding/start (creating the clinic row +
 * signed_agreements) fires right after the Documents step, BEFORE
 * payment — invisibly to the user, who just sees "Continue" advance
 * them to Payment like any other step. The auth LOGIN (email +
 * password) is still created last, in /api/onboarding/finish, which
 * is what "Account" step / the user's mental model of "signing up"
 * actually refers to. See api/onboarding/start/route.ts for the full
 * reasoning and the trade-off this implies (abandoned-mid-flow
 * orphan clinic rows).
 */
import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Building2, Globe, Phone, Mail, Database,
  Bot, ArrowRight, ArrowLeft, AlertCircle, Loader2,
} from "lucide-react";
import LogoMark from "@/components/LogoMark";
import PlanSelector from "./PlanSelector";
import DocumentSigner from "./DocumentSigner";
import EmbeddedCheckout from "./EmbeddedCheckout";
import AccountStep from "./AccountStep";
import type { CrmProvider, PlanTier } from "@/types/database";

/* ─── Step config ───────────────────────────────────────────────── */
const STEPS = ["Clinic", "Contact", "CRM", "Plan", "Receptionist", "Documents", "Payment", "Account"] as const;
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
  planTier: PlanTier | "";
  receptionistName: string;
  signerName: string;
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

const inputClass = "w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none transition-colors";
const inputStyle = { background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" } as const;

export default function OnboardingWizard() {
  const [step, setStep] = useState<Step>(0);
  const [error, setError] = useState<string | null>(null);
  const [creatingClinic, setCreatingClinic] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  // Populated once /api/onboarding/start succeeds (after Documents step).
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    clinicName: "", website: "", phoneNumber: "", contactEmail: "",
    crmProvider: "", crmOtherName: "", planTier: "", receptionistName: "", signerName: "",
  });
  const [docsSigned, setDocsSigned] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function stepValid(): boolean {
    switch (step) {
      case 0: return form.clinicName.trim().length > 0;
      case 1: return form.phoneNumber.trim().length > 0 && form.contactEmail.trim().length > 0;
      case 2: return form.crmProvider !== "" && (form.crmProvider !== "other" || form.crmOtherName.trim().length > 0);
      case 3: return form.planTier !== "";
      case 4: return form.receptionistName.trim().length > 0;
      case 5: return docsSigned;
      case 6: return true; // Payment step advances via the embedded checkout's onClosed event, not Continue
      default: return false;
    }
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0) as Step);
  }

  /**
   * Advancing past the Documents step (5 → 6) is when
   * /api/onboarding/start actually runs — see file-level doc comment
   * for why this happens here rather than at the very end.
   */
  async function next() {
    if (!stepValid()) return;
    setError(null);

    if (step === 5) {
      setCreatingClinic(true);
      try {
        const res = await fetch("/api/onboarding/start", {
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
            planTier: form.planTier,
            signedDocuments: [
              // One signature event per document type, all sharing
              // the same typed name (see DocumentSigner.tsx).
              ...["msa", "sow", "baa", "dpa", "privacy_policy", "terms_of_service"].map((documentType) => ({
                documentType,
                documentVersion: "PLACEHOLDER-v0", // mirrors lib/legal-docs/index.ts — update together
                signerName: form.signerName,
              })),
            ],
          }),
        });
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || "Could not save your information. Please try again.");
          setCreatingClinic(false);
          return;
        }

        setClinicId(json.clinicId);
        setCreatingClinic(false);
        setStep(6);

        // Immediately kick off checkout session creation so the
        // payment step doesn't show its own extra loading state on
        // top of this one.
        setLoadingCheckout(true);
        const checkoutRes = await fetch("/api/onboarding/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clinicId: json.clinicId }),
        });
        const checkoutJson = await checkoutRes.json();
        setLoadingCheckout(false);

        if (!checkoutRes.ok) {
          setError(checkoutJson.error || "Could not start payment. Please try again.");
          return;
        }
        setCheckoutUrl(checkoutJson.checkoutUrl);
      } catch {
        setError("Network error — please check your connection and try again.");
        setCreatingClinic(false);
        setLoadingCheckout(false);
      }
      return;
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1) as Step);
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
        <div className="flex items-center gap-1" role="group" aria-label="Onboarding progress">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col gap-1.5 items-center">
              <div className="h-1.5 w-full rounded-full transition-colors"
                style={{ background: i <= step ? "var(--teal)" : "var(--bg-sunken)" }} aria-hidden="true" />
              <span className="text-[9px] font-medium hidden sm:block text-center leading-tight"
                style={{ color: i === step ? "var(--teal-text)" : "var(--text-muted)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="card p-6 md:p-7 overflow-hidden">
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
                    <input className={inputClass} style={inputStyle} value={form.clinicName}
                      onChange={(e) => update("clinicName", e.target.value)} placeholder="Radiance MedSpa & Wellness" required />
                  </Field>
                  <Field label="Website" icon={Globe} hint="Optional — helps us match your brand voice.">
                    <input className={inputClass} style={inputStyle} value={form.website}
                      onChange={(e) => update("website", e.target.value)} placeholder="radiancemedspa.com" type="url" />
                  </Field>
                </>
              )}

              {/* ── Step 1: Contact ────────────────────────────── */}
              {step === 1 && (
                <>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>How do we reach you?</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>The phone number is what your AI Receptionist will answer.</p>
                  </div>
                  <Field label="Clinic Phone Number" icon={Phone} hint="The number your AI Receptionist will be connected to.">
                    <input className={inputClass} style={inputStyle} value={form.phoneNumber}
                      onChange={(e) => update("phoneNumber", e.target.value)} placeholder="+1 (305) 555-0182" type="tel" required />
                  </Field>
                  <Field label="Contact Email" icon={Mail} hint="Where we'll send setup updates and your dashboard invite.">
                    <input className={inputClass} style={inputStyle} value={form.contactEmail}
                      onChange={(e) => update("contactEmail", e.target.value)} placeholder="you@clinic.com" type="email" required />
                  </Field>
                </>
              )}

              {/* ── Step 2: CRM ────────────────────────────────── */}
              {step === 2 && (
                <>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>What do you use for bookings?</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>We'll connect your AI Receptionist to it during setup.</p>
                  </div>
                  <Field label="CRM / Booking Software" icon={Database}>
                    <select className={`${inputClass} appearance-none cursor-pointer`} style={inputStyle}
                      value={form.crmProvider} onChange={(e) => update("crmProvider", e.target.value as CrmProvider)} required>
                      <option value="" disabled>Select one…</option>
                      {CRM_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </Field>
                  {form.crmProvider === "other" && (
                    <Field label="Which one?" icon={Database}>
                      <input className={inputClass} style={inputStyle} value={form.crmOtherName}
                        onChange={(e) => update("crmOtherName", e.target.value)} placeholder="e.g. Zenoti" required />
                    </Field>
                  )}
                </>
              )}

              {/* ── Step 3: Plan ───────────────────────────────── */}
              {step === 3 && (
                <>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Choose your plan</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>You can change tiers later from your dashboard.</p>
                  </div>
                  <PlanSelector selected={form.planTier} onSelect={(tier) => update("planTier", tier)} />
                </>
              )}

              {/* ── Step 4: Receptionist ────────────────────────── */}
              {step === 4 && (
                <>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Name your AI Receptionist</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      This is how it introduces itself on every call — e.g. "Thank you for calling {form.clinicName || "your clinic"}, this is ___."
                    </p>
                  </div>
                  <Field label="Receptionist Name" icon={Bot}>
                    <input className={inputClass} style={inputStyle} value={form.receptionistName}
                      onChange={(e) => update("receptionistName", e.target.value)} placeholder="Aria" required />
                  </Field>
                </>
              )}

              {/* ── Step 5: Documents ───────────────────────────── */}
              {step === 5 && (
                <>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Review & sign</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Last step before payment.</p>
                  </div>
                  <DocumentSigner
                    signerName={form.signerName}
                    onSignerNameChange={(name) => update("signerName", name)}
                    allSigned={docsSigned}
                    onAllSignedChange={setDocsSigned}
                  />
                </>
              )}

              {/* ── Step 6: Payment ─────────────────────────────── */}
              {step === 6 && (
                <>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Payment</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Secure checkout — your card is processed by Dodo Payments.</p>
                  </div>
                  {loadingCheckout || !checkoutUrl ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-16">
                      <Loader2 size={22} className="animate-spin" style={{ color: "var(--teal)" }} aria-hidden="true" />
                      <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Preparing secure checkout…</p>
                    </div>
                  ) : (
                    <EmbeddedCheckout
                      checkoutUrl={checkoutUrl}
                      onClosed={() => setStep(7)}
                    />
                  )}
                </>
              )}

              {/* ── Step 7: Account ─────────────────────────────── */}
              {step === 7 && clinicId && (
                <AccountStep clinicId={clinicId} contactEmail={form.contactEmail} />
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

          {/* Nav buttons — hidden on Payment (advances via the embed's own close event) and Account (has its own submit) */}
          {step < 6 && (
            <div className="flex items-center gap-3 mt-6">
              {step > 0 && (
                <button type="button" onClick={back}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                  style={{ background: "var(--bg-sunken)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                  <ArrowLeft size={14} aria-hidden="true" /> Back
                </button>
              )}
              <div className="flex-1" />
              <button type="button" onClick={next} disabled={!stepValid() || creatingClinic}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--teal)", color: "#fff" }}>
                {creatingClinic && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                {creatingClinic ? "Saving…" : "Continue"} {!creatingClinic && <ArrowRight size={14} aria-hidden="true" />}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <a href="/login" className="font-semibold" style={{ color: "var(--teal-text)" }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}