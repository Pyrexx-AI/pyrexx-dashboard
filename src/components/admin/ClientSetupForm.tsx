"use client";

import { useState, useTransition } from "react";
import {
  Building2, Globe, Phone, Mail, Bot, Database,
  CheckCircle2, Clock, AlertTriangle, Save, Loader2,
  ShieldAlert, RefreshCw, Zap, PhoneForwarded, Trash2
} from "lucide-react";
import {
  updateAgentConnection,
  updateCrmCredentials,
  updateClinicStatus,
  updateEscalationNumber,
  retryProvisioning,
  disconnectAgent
} from "@/app/admin/actions";
import type { Database as DB, ClinicStatus } from "@/types/database";

type Clinic = DB["public"]["Tables"]["clinics"]["Row"];
type IntegrationCredential = DB["public"]["Tables"]["integration_credentials"]["Row"];

const CRM_LABELS: Record<string, string> = {
  jane: "Jane App", cliniko: "Cliniko", mindbody: "Mindbody", vagaro: "Vagaro",
  acuity: "Acuity Scheduling", square_appointments: "Square Appointments",
  hubspot: "HubSpot", other: "Other", none: "None",
};

const STATUS_FLOW: { value: ClinicStatus; label: string; icon: React.ElementType; bg: string; color: string }[] = [
  { value: "onboarding",    label: "New Signup",    icon: Clock,         bg: "var(--info-surface)",    color: "var(--info-text)" },
  { value: "pending_setup", label: "Pending Setup", icon: AlertTriangle, bg: "var(--warning-surface)", color: "var(--warning-text)" },
  { value: "active",        label: "Active",        icon: CheckCircle2,  bg: "var(--success-surface)", color: "var(--success-text)" },
  { value: "suspended",     label: "Suspended",     icon: ShieldAlert,   bg: "var(--error-surface)",   color: "var(--error-text)" },
];

const PROVISIONING_LABELS: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  pending:       { label: "Not started",    bg: "var(--bg-sunken)",        color: "var(--text-muted)",    icon: Clock },
  provisioning:  { label: "In progress…",   bg: "var(--info-surface)",     color: "var(--info-text)",     icon: Loader2 },
  provisioned:   { label: "Live",           bg: "var(--success-surface)",  color: "var(--success-text)",  icon: CheckCircle2 },
  failed:        { label: "Failed",         bg: "var(--error-surface)",    color: "var(--error-text)",    icon: AlertTriangle },
};

const PLAN_LABELS: Record<string, string> = {
  overflow: "Overflow ($1,000/mo)",
  full_time: "Full Time ($1,500/mo)",
  usage_based: "Usage Based (coming soon)",
};

const inputClass = "w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none transition-colors";
const inputStyle = { background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" } as const;

function Field({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <div className="relative">
        <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

function Section({ icon: Icon, iconBg, iconColor, title, children }: {
  icon: React.ElementType; iconBg: string; iconColor: string; title: string; children: React.ReactNode;
}) {
  return (
    <section className="card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={14} style={{ color: iconColor }} aria-hidden="true" />
        </div>
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function ClientSetupForm({
  clinic, crmCredential,
}: {
  clinic: Clinic;
  crmCredential: IntegrationCredential | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [agentId, setAgentId] = useState(clinic.agent_id ?? "");
  const [agentPhone, setAgentPhone] = useState(clinic.agent_phone_number ?? "");
  const [escalation, setEscalation] = useState(clinic.escalation_phone_number ?? "");

  const existingCreds = (crmCredential?.credentials ?? {}) as { api_key?: string; account_identifier?: string; notes?: string };
  const [apiKey, setApiKey] = useState(existingCreds.api_key ?? "");
  const [accountId, setAccountId] = useState(existingCreds.account_identifier ?? "");
  const [notes, setNotes] = useState(existingCreds.notes ?? "");

  function flash(msg: string, isError = false) {
    if (isError) { setErrorMsg(msg); setTimeout(() => setErrorMsg(null), 4000); }
    else { setSavedMsg(msg); setTimeout(() => setSavedMsg(null), 2500); }
  }

  function handleAgentSave() {
    startTransition(async () => {
      const res = await updateAgentConnection(clinic.id, { agentId, agentPhoneNumber: agentPhone });
      if ("error" in res) flash(res.error || "Save failed", true);
      else flash("Agent connection saved");
    });
  }

  function handleAgentDisconnect() {
    if (!confirm("Are you sure you want to disconnect this agent? Live calls to the shadow number will fail immediately.")) return;
    startTransition(async () => {
      const res = await disconnectAgent(clinic.id);
      if ("error" in res) flash(res.error || "Failed to disconnect", true);
      else { 
        flash("Agent disconnected successfully"); 
        setAgentId(""); 
        setAgentPhone(""); 
      }
    });
  }

  function handleEscalationSave() {
    startTransition(async () => {
      const res = await updateEscalationNumber(clinic.id, escalation);
      if ("error" in res) flash(res.error || "Save failed", true);
      else flash("Escalation number saved");
    });
  }

  function handleCrmSave() {
    startTransition(async () => {
      const res = await updateCrmCredentials(clinic.id, { apiKey, accountIdentifier: accountId, notes });
      if ("error" in res) flash(res.error || "Save failed", true);
      else flash("CRM credentials saved");
    });
  }

  function handleStatusChange(status: ClinicStatus) {
    startTransition(async () => {
      const res = await updateClinicStatus(clinic.id, status);
      if ("error" in res) flash(res.error || "Status update failed", true);
      else flash(`Status → ${status.replace("_", " ")}`);
    });
  }

  function handleRetryProvisioning() {
    startTransition(async () => {
      const res = await retryProvisioning(clinic.id);
      if ("error" in res) flash(res.error || "Provisioning failed", true);
      else flash("Agent provisioned successfully");
    });
  }

  const provisioningInfo = PROVISIONING_LABELS[clinic.agent_provisioning_status] ?? PROVISIONING_LABELS.pending;
  const ProvisionIcon = provisioningInfo.icon;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-extrabold flex-shrink-0"
            style={{ background: "var(--teal-surface)", color: "var(--teal-text)" }}>
            {clinic.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{clinic.name}</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {PLAN_LABELS[clinic.plan_tier] ?? "Unknown plan"} · created {new Date(clinic.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {savedMsg && (
            <span className="badge text-[10px]" style={{ background: "var(--success-surface)", color: "var(--success-text)" }}>
              <CheckCircle2 size={10} aria-hidden="true" /> {savedMsg}
            </span>
          )}
          {errorMsg && (
            <span className="badge text-[10px]" style={{ background: "var(--error-surface)", color: "var(--error-text)" }}>
              <AlertTriangle size={10} aria-hidden="true" /> {errorMsg}
            </span>
          )}
        </div>
      </div>

      {/* Status pipeline */}
      <Section icon={Clock} iconBg="var(--purple-surface)" iconColor="var(--purple)" title="Account Status">
        <div className="flex flex-wrap gap-2">
          {STATUS_FLOW.map((s) => {
            const isCurrent = clinic.status === s.value;
            const Icon = s.icon;
            return (
              <button key={s.value} type="button" disabled={isPending}
                onClick={() => handleStatusChange(s.value)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                style={isCurrent
                  ? { background: s.bg, color: s.color, boxShadow: `0 0 0 1.5px ${s.color}` }
                  : { background: "var(--bg-sunken)", color: "var(--text-muted)" }}>
                <Icon size={12} aria-hidden="true" /> {s.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Submitted info */}
      <Section icon={Building2} iconBg="var(--teal-surface)" iconColor="var(--teal)" title="Submitted Details">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {[
            { icon: Globe,  label: clinic.website || "No website provided" },
            { icon: Phone,  label: clinic.phone_number },
            { icon: Mail,   label: clinic.contact_email },
            { icon: Bot,    label: `Receptionist: ${clinic.receptionist_name}` },
            { icon: Database, label: `CRM: ${CRM_LABELS[clinic.crm_provider]}${clinic.crm_provider === "other" && clinic.crm_other_name ? ` (${clinic.crm_other_name})` : ""}` },
          ].map(({ icon: Icon, label }, i) => (
            <div key={i} className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
              <Icon size={13} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
              <span className="truncate">{label}</span>
            </div>
          ))}
        </dl>
      </Section>

      {/* AI Receptionist Agent provisioning */}
      <Section icon={Bot} iconBg="var(--purple-surface)" iconColor="var(--purple)" title="AI Receptionist Agent">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Auto-provisioning status</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: provisioningInfo.bg, color: provisioningInfo.color }}>
            <ProvisionIcon size={11} className={clinic.agent_provisioning_status === "provisioning" ? "animate-spin" : ""} aria-hidden="true" />
            {provisioningInfo.label}
          </div>
        </div>

        {clinic.agent_provisioning_error && (
          <div className="rounded-xl px-3 py-2 text-[11px]" style={{ background: "var(--error-surface)", color: "var(--error-text)" }}>
            <strong>Error:</strong> {clinic.agent_provisioning_error}
          </div>
        )}

        {clinic.agent_provisioning_status === "failed" && (
          <button type="button" onClick={handleRetryProvisioning} disabled={isPending}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors disabled:opacity-60 w-fit"
            style={{ background: "var(--purple-surface)", color: "var(--purple-text)" }}>
            {isPending ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={13} aria-hidden="true" />}
            Retry Provisioning
          </button>
        )}

        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Override, verify, or disconnect the auto-provisioned agent details:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Agent ID" icon={Bot}>
            <input className={inputClass} style={inputStyle} value={agentId}
              onChange={(e) => setAgentId(e.target.value)} placeholder="agent_xxxxxxxxxxxx" />
          </Field>
          <Field label="Shadow Phone Number" icon={Phone}>
            <input className={inputClass} style={inputStyle} value={agentPhone}
              onChange={(e) => setAgentPhone(e.target.value)} placeholder="+1 (555) 010-0000" />
          </Field>
        </div>

        <div className="rounded-xl p-3 text-[11px]" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
          Clinic ID (for agent metadata): <code className="font-mono" style={{ color: "var(--text-secondary)" }}>{clinic.id}</code>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          <button type="button" onClick={handleAgentSave} disabled={isPending}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60"
            style={{ background: "var(--teal)", color: "#fff" }}>
            {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
            Save Details
          </button>

          {clinic.agent_id && (
            <button type="button" onClick={handleAgentDisconnect} disabled={isPending}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60"
              style={{ background: "var(--error-surface)", color: "var(--error-text)" }}>
              {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}
              Disconnect Agent
            </button>
          )}
        </div>
      </Section>

      {/* Escalation / transfer target */}
      <Section icon={PhoneForwarded} iconBg="var(--warning-surface)" iconColor="var(--warning-text)" title="Escalation Phone Number">
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          The back-line or staff cell the AI hands urgent calls off to — <strong>not</strong> the clinic's main line.
          Using the main line risks a forwarding loop under the CCF shadow-number setup. Set this before the agent goes live.
        </p>
        <Field label="Escalation Number" icon={PhoneForwarded}>
          <input className={inputClass} style={inputStyle} value={escalation}
            onChange={(e) => setEscalation(e.target.value)} placeholder="+1 (305) 555-9999" type="tel" />
        </Field>
        <button type="button" onClick={handleEscalationSave} disabled={isPending}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60 w-fit"
          style={{ background: "var(--teal)", color: "#fff" }}>
          {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
          Save Escalation Number
        </button>
      </Section>

      {/* CRM credentials */}
      <Section icon={Database} iconBg="var(--info-surface)" iconColor="var(--info-text)"
        title={`${CRM_LABELS[clinic.crm_provider]} Credentials`}>
        <p className="text-[11px] -mt-1 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
          <ShieldAlert size={12} aria-hidden="true" /> Stored admin-only — never visible to the clinic's dashboard.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="API Key / Token" icon={Database}>
            <input className={inputClass} style={inputStyle} value={apiKey}
              onChange={(e) => setApiKey(e.target.value)} placeholder="••••••••••••" type="password" />
          </Field>
          <Field label="Account / Location ID" icon={Building2}>
            <input className={inputClass} style={inputStyle} value={accountId}
              onChange={(e) => setAccountId(e.target.value)} placeholder="acct_xxxxx" />
          </Field>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Setup Notes</label>
          <textarea className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors resize-none"
            style={inputStyle} rows={2} value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any quirks about this clinic's CRM setup…" />
        </div>
        <button type="button" onClick={handleCrmSave} disabled={isPending}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60 w-fit"
          style={{ background: "var(--teal)", color: "#fff" }}>
          {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
          Save CRM Credentials
        </button>
      </Section>

      {/* Agent setup instructions */}
      <Section icon={Zap} iconBg="var(--success-surface)" iconColor="var(--success-text)" title="CCF Setup — Client Instructions">
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Send these instructions to the clinic after the agent is provisioned. They point their existing number at the shadow number using Conditional Call Forwarding — no carrier porting required.
        </p>
        {clinic.agent_phone_number ? (
          <div className="rounded-xl p-3 space-y-1.5 text-[11px]" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Your AI Receptionist shadow number: <code>{clinic.agent_phone_number}</code></p>
            <p><strong>Option A (overflow/after-hours):</strong> Ask your phone provider to set a Conditional Call Forward rule — if busy or no answer after 3 rings → forward to {clinic.agent_phone_number}.</p>
            <p><strong>Option B (IVR branch):</strong> Add a press-option in your auto-attendant that routes to {clinic.agent_phone_number}.</p>
            <p><strong>Option C (full-time, all calls):</strong> Dial <code>*72{clinic.agent_phone_number}</code> from your desk phone to forward all inbound calls immediately.</p>
          </div>
        ) : (
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Agent phone number not yet assigned — provision the agent first.</p>
        )}
      </Section>
    </div>
  );
}