"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Clock, CheckCircle2, AlertTriangle, Plus, DollarSign, Activity, Users, Loader2 } from "lucide-react";
import { createManualClient } from "@/app/admin/actions";
import type { Database, ClinicStatus, PlanTier, CrmProvider } from "@/types/database";

type Clinic = Database["public"]["Tables"]["clinics"]["Row"];

const STATUS_CONFIG: Record<ClinicStatus, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  onboarding:    { label: "New Signup",    bg: "var(--info-surface)",    color: "var(--info-text)",    icon: Clock },
  pending_setup: { label: "Pending Setup", bg: "var(--warning-surface)", color: "var(--warning-text)", icon: AlertTriangle },
  active:        { label: "Active",        bg: "var(--success-surface)", color: "var(--success-text)", icon: CheckCircle2 },
  suspended:     { label: "Suspended",     bg: "var(--error-surface)",   color: "var(--error-text)",   icon: AlertTriangle },
};

export default function AdminDashboardClient({ clinics, metrics }: { clinics: Clinic[], metrics: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", contact_email: "", phone_number: "", receptionist_name: "Aria", plan_tier: "overflow" as PlanTier, crm_provider: "none" as CrmProvider
  });

  const needsAttention = clinics.filter(c => c.status === "onboarding" || c.status === "pending_setup");
  const others = clinics.filter(c => c.status === "active" || c.status === "suspended");

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await createManualClient(form);
    setLoading(false);
    if (res.success) setIsModalOpen(false);
    else alert(res.error);
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { title: "Monthly Recurring", val: metrics.mrr, icon: DollarSign, color: "var(--teal)" },
          { title: "Total Clients", val: metrics.total, icon: Users, color: "var(--purple)" },
          { title: "Active Agents", val: metrics.active, icon: Activity, color: "var(--success-text)" },
          { title: "Needs Setup", val: metrics.needsSetup, icon: AlertTriangle, color: "var(--warning-text)" },
        ].map((m, i) => (
          <div key={i} className="card p-5 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{m.title}</span>
              <m.icon size={14} style={{ color: m.color }} />
            </div>
            <span className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>{m.val}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Client Directory</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Manage deployments and integrations.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors" style={{ background: "var(--teal)", color: "#fff" }}>
          <Plus size={16} /> Add Client
        </button>
      </div>

      {needsAttention.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--warning-text)" }}>Needs Setup</h3>
          <div className="flex flex-col gap-2">
            {needsAttention.map((c) => <ClinicRow key={c.id} clinic={c} highlighted />)}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>All Clients</h3>
        <div className="flex flex-col gap-2">
          {others.map((c) => <ClinicRow key={c.id} clinic={c} />)}
          {others.length === 0 && <p className="text-sm text-slate-500 py-4">No active clients yet.</p>}
        </div>
      </section>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>Manual Client Setup</h2>
            <form onSubmit={handleAddClient} className="flex flex-col gap-4">
              <input required placeholder="Clinic Name" className="w-full px-3 py-2.5 rounded-xl text-sm" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)" }} onChange={e => setForm({...form, name: e.target.value})} />
              <input required type="email" placeholder="Contact Email" className="w-full px-3 py-2.5 rounded-xl text-sm" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)" }} onChange={e => setForm({...form, contact_email: e.target.value})} />
              <input required placeholder="Phone Number" className="w-full px-3 py-2.5 rounded-xl text-sm" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)" }} onChange={e => setForm({...form, phone_number: e.target.value})} />
              <div className="flex gap-2 justify-end mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "var(--bg-sunken)" }}>Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2" style={{ background: "var(--teal)", color: "#fff" }}>
                  {loading && <Loader2 size={14} className="animate-spin" />} Create & Bypass Billing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ClinicRow({ clinic, highlighted = false }: { clinic: Clinic; highlighted?: boolean }) {
  const status = STATUS_CONFIG[clinic.status];
  const StatusIcon = status.icon;
  return (
    <Link href={`/admin/clients/${clinic.id}`} className="card card-hover flex items-center gap-3 p-4" style={highlighted ? { borderColor: "var(--warning-text)" } : {}}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--teal-surface)" }}>
        <Building2 size={16} style={{ color: "var(--teal)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{clinic.name}</p>
          <span className="badge text-[10px]" style={{ background: status.bg, color: status.color }}><StatusIcon size={9} /> {status.label}</span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{clinic.contact_email} · {clinic.phone_number}</p>
      </div>
    </Link>
  );
}