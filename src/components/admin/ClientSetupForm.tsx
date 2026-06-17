"use client";

import { useState, useTransition } from "react";
import {
  Building2, Globe, Phone, Mail, Bot, Database,
  CheckCircle2, Clock, AlertTriangle, Save, Loader2, ShieldAlert,
} from "lucide-react";
import {
  updateAgentConnection, updateCrmCredentials, updateClinicStatus,
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
  { value: "active",        label: "Active",        icon: CheckCircle2, bg: "var(--success-surface)", color: "var(--success-text)" },
  { value: "suspended",     label: "Suspended",     icon: ShieldAlert,  bg: "var(--error-surface)",   color: "var(--error-text)" },
];

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

  const [agentId, setAgentId] = useState(clinic.agent_id ?? "");
  const [agentPhone, setAgentPhone] = useState(clinic.agent_phone_number ?? "");

  const existingCreds = (crmCredential?.credentials ?? {}) as { api_key?: string; account_identifier?: string; notes?: string };
  const [apiKey, setApiKey] = useState(existingCreds.api_key ?? "");
  const [accountId, setAccountId] = useState(existingCreds.account_identifier ?? "");
  const [notes, setNotes] = useState(existingCreds.notes ?? "");

  function flash(msg: string) {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2500);
  }

  function handleAgentSave() {
    startTransition(async () => {
      const res = await updateAgentConnection(clinic.id, { agentId, agentPhoneNumber: agentPhone });
      if (res.success) flash("AI Receptionist Agent connected");
    });
  }

  function handleCrmSave() {
    startTransition(async () => {
      const res = await updateCrmCredentials(clinic.id, { apiKey, accountIdentifier: accountId, notes });
      if (res.success) flash("CRM credentials saved");
    });
  }

  function handleStatusChange(status: ClinicStatus) {
    startTransition(async () => {
      const res = await updateClinicStatus(clinic.id, status);
      if (res.success) flash(`Status updated to ${status.replace("_", " ")}`);
    });
  }

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
              Created {new Date(clinic.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        {savedMsg && (
          <span className="badge text-xs" style={{ background: "var(--success-surface)", color: "var(--success-text)" }}>
            <CheckCircle2 size={11} aria-hidden="true" /> {savedMsg}
          </span>
        )}
      </div>

      {/* Status pipeline */}
      <Section icon={Clock} iconBg="var(--purple-surface)" iconColor="var(--purple)" title="Account Status">
        <div className="flex flex-wrap gap-2">
          {STATUS_FLOW.map((s) => {
            const isCurrent = clinic.status === s.value;
            const Icon = s.icon;
            return (
              <button
                key={s.value}
                type="button"
                disabled={isPending}
                onClick={() => handleStatusChange(s.value)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                style={isCurrent
                  ? { background: s.bg, color: s.color, boxShadow: `0 0 0 1.5px ${s.color}` }
                  : { background: "var(--bg-sunken)", color: "var(--text-muted)" }}
              >
                <Icon size={12} aria-hidden="true" /> {s.label}
              </button>
            );
          })}
        </div>
        {clinic.status === "active" && !clinic.agent_id && (
          <p className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--warning-text)" }}>
            <AlertTriangle size={12} aria-hidden="true" />
            This clinic is active but has no AI Receptionist Agent connected yet.
          </p>
        )}
      </Section>

      {/* Clinic-submitted info (read-only reference) */}
      <Section icon={Building2} iconBg="var(--teal-surface)" iconColor="var(--teal)" title="Submitted Details">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <Globe size={13} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
            <span>{clinic.website || "No website provided"}</span>
          </div>
          <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <Phone size={13} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
            <span>{clinic.phone_number}</span>
          </div>
          <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <Mail size={13} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
            <span>{clinic.contact_email}</span>
          </div>
          <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <Bot size={13} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
            <span>Receptionist name: <strong style={{ color: "var(--text-primary)" }}>{clinic.receptionist_name}</strong></span>
          </div>
          <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <Database size={13} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
            <span>
              CRM: {CRM_LABELS[clinic.crm_provider]}
              {clinic.crm_provider === "other" && clinic.crm_other_name ? ` (${clinic.crm_other_name})` : ""}
            </span>
          </div>
        </dl>
      </Section>

      {/* Connect AI Receptionist Agent */}
      <Section icon={Bot} iconBg="var(--purple-surface)" iconColor="var(--purple)" title="Connect AI Receptionist Agent">
        <p className="text-[11px] -mt-1" style={{ color: "var(--text-muted)" }}>
          Create the agent on the voice-agent platform, set its phone number to{" "}
          <strong style={{ color: "var(--text-secondary)" }}>{clinic.phone_number}</strong>, name it{" "}
          <strong style={{ color: "var(--text-secondary)" }}>{clinic.receptionist_name}</strong>, and set its
          metadata <code>clinic_id</code> to this clinic's ID below before saving.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Agent ID" icon={Bot}>
            <input className={inputClass} style={inputStyle} value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agent_xxxxxxxxxxxx" />
          </Field>
          <Field label="Connected Phone Number" icon={Phone}>
            <input className={inputClass} style={inputStyle} value={agentPhone} onChange={(e) => setAgentPhone(e.target.value)} placeholder="+1 (305) 555-0182" />
          </Field>
        </div>
        <div className="rounded-xl p-3 text-[11px]" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
          Clinic ID (for agent metadata): <code className="font-mono" style={{ color: "var(--text-secondary)" }}>{clinic.id}</code>
        </div>
        <button type="button" onClick={handleAgentSave} disabled={isPending}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60 w-fit"
          style={{ background: "var(--teal)", color: "#fff" }}>
          {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
          Save Agent Connection
        </button>
      </Section>

      {/* CRM credentials */}
      <Section icon={Database} iconBg="var(--info-surface)" iconColor="var(--info-text)" title={`${CRM_LABELS[clinic.crm_provider]} Credentials`}>
        <p className="text-[11px] -mt-1 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
          <ShieldAlert size={12} aria-hidden="true" /> Stored admin-only — never visible to the clinic's dashboard.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="API Key / Token" icon={Database}>
            <input className={inputClass} style={inputStyle} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••••••••" type="password" />
          </Field>
          <Field label="Account / Location ID" icon={Building2}>
            <input className={inputClass} style={inputStyle} value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="acct_xxxxx" />
          </Field>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Setup Notes</label>
          <textarea
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors resize-none"
            style={inputStyle}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any quirks about this clinic's CRM setup…"
          />
        </div>
        <button type="button" onClick={handleCrmSave} disabled={isPending}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60 w-fit"
          style={{ background: "var(--teal)", color: "#fff" }}>
          {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
          Save CRM Credentials
        </button>
      </Section>
    </div>
  );
}