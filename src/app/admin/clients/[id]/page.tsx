import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Building2, Clock, CheckCircle2, AlertTriangle,
  ArrowRight, Bot, Database,
} from "lucide-react";
import type { Database as DB, ClinicStatus } from "@/types/database";

type Clinic = DB["public"]["Tables"]["clinics"]["Row"];

const STATUS_CONFIG: Record<ClinicStatus, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  onboarding:    { label: "New Signup",    bg: "var(--info-surface)",    color: "var(--info-text)",    icon: Clock },
  pending_setup: { label: "Pending Setup", bg: "var(--warning-surface)", color: "var(--warning-text)", icon: AlertTriangle },
  active:        { label: "Active",        bg: "var(--success-surface)", color: "var(--success-text)", icon: CheckCircle2 },
  suspended:     { label: "Suspended",     bg: "var(--error-surface)",   color: "var(--error-text)",   icon: AlertTriangle },
};

const CRM_LABELS: Record<string, string> = {
  jane: "Jane App", cliniko: "Cliniko", mindbody: "Mindbody", vagaro: "Vagaro",
  acuity: "Acuity", square_appointments: "Square Appointments", hubspot: "HubSpot",
  other: "Other", none: "None",
};

export const metadata = { title: "Clients | Pyrexx Admin" };

export default async function AdminClientsPage() {
  const supabase = await createClient();
  const { data: clinics } = await supabase
    .from("clinics")
    .select("*")
    .order("created_at", { ascending: false });

  const all = (clinics ?? []) as Clinic[];
  const needsAttention = all.filter((c) => c.status === "onboarding" || c.status === "pending_setup");
  const others = all.filter((c) => c.status === "active" || c.status === "suspended");

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Clients</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {all.length} total · {needsAttention.length} need setup
        </p>
      </div>

      {/* Setup queue — highlighted */}
      {needsAttention.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--warning-text)" }}>
            Needs Setup
          </h3>
          <div className="flex flex-col gap-2">
            {needsAttention.map((clinic) => (
              <ClinicRow key={clinic.id} clinic={clinic} highlighted />
            ))}
          </div>
        </section>
      )}

      {/* All other clients */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
          All Clients
        </h3>
        {others.length === 0 && needsAttention.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No clients yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {others.map((clinic) => (
              <ClinicRow key={clinic.id} clinic={clinic} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ClinicRow({ clinic, highlighted = false }: { clinic: Clinic; highlighted?: boolean }) {
  const status = STATUS_CONFIG[clinic.status];
  const StatusIcon = status.icon;
  const hasAgent = !!clinic.agent_id;
  const hasCrm = clinic.crm_provider !== "none";

  return (
    <Link
      href={`/admin/clients/${clinic.id}`}
      className="card card-hover flex items-center gap-3 p-4 cursor-pointer"
      style={highlighted ? { borderColor: "var(--warning-text)", borderWidth: 1 } : undefined}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--teal-surface)" }}>
        <Building2 size={16} style={{ color: "var(--teal)" }} aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{clinic.name}</p>
          <span className="badge text-[10px] flex-shrink-0" style={{ background: status.bg, color: status.color }}>
            <StatusIcon size={9} aria-hidden="true" /> {status.label}
          </span>
        </div>
        <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
          {clinic.contact_email} · {clinic.phone_number}
        </p>
      </div>

      {/* Setup indicators */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full"
          style={{ background: hasAgent ? "var(--success-surface)" : "var(--bg-sunken)", color: hasAgent ? "var(--success-text)" : "var(--text-muted)" }}>
          <Bot size={10} aria-hidden="true" /> Agent {hasAgent ? "✓" : "—"}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full"
          style={{ background: hasCrm ? "var(--success-surface)" : "var(--bg-sunken)", color: hasCrm ? "var(--success-text)" : "var(--text-muted)" }}>
          <Database size={10} aria-hidden="true" /> {hasCrm ? CRM_LABELS[clinic.crm_provider] : "No CRM"}
        </span>
      </div>

      <ArrowRight size={14} className="flex-shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
    </Link>
  );
}