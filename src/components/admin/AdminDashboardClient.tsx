"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, CheckCircle2, AlertTriangle, Plus, DollarSign, Activity, 
  Users, Loader2, Search, Bot, Database as DbIcon, X, Eye, FileText 
} from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  
  const [form, setForm] = useState({
    name: "", contact_email: "", phone_number: "", receptionist_name: "Aria", plan_tier: "overflow" as PlanTier, crm_provider: "none" as CrmProvider
  });

  const filteredClinics = useMemo(() => {
    if (!searchQuery.trim()) return clinics;
    const lowerQ = searchQuery.toLowerCase();
    return clinics.filter(c => 
      c.name.toLowerCase().includes(lowerQ) || 
      c.contact_email.toLowerCase().includes(lowerQ) ||
      c.phone_number.includes(lowerQ)
    );
  }, [clinics, searchQuery]);

  const needsAttention = filteredClinics.filter(c => c.status === "onboarding" || c.status === "pending_setup");
  const others = filteredClinics.filter(c => c.status === "active" || c.status === "suspended");

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await createManualClient(form);
    setLoading(false);
    if (res.success) {
      setIsModalOpen(false);
      setForm({ name: "", contact_email: "", phone_number: "", receptionist_name: "Aria", plan_tier: "overflow", crm_provider: "none" });
    } else {
      alert(res.error);
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Metrics Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "Monthly Recurring", val: metrics.mrr, icon: DollarSign, color: "var(--teal)" },
          { title: "Total Clients", val: metrics.total, icon: Users, color: "var(--purple)" },
          { title: "Active Agents", val: metrics.active, icon: Activity, color: "var(--success-text)" },
          { title: "Needs Setup", val: metrics.needsSetup, icon: AlertTriangle, color: "var(--warning-text)" },
        ].map((m, i) => (
          <div key={i} className="card p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{m.title}</span>
              <m.icon size={16} style={{ color: m.color }} />
            </div>
            <span className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>{m.val}</span>
          </div>
        ))}
      </div>

      {/* Toolbar & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Client Directory</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Manage deployments, inspect client dashboards, and configure legal agreements.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link href="/admin/legal" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors" style={{ background: "var(--purple-surface)", color: "var(--purple-text)" }}>
            <FileText size={16} /> Legal Docs CMS
          </Link>
          <div className="relative flex-1 md:w-56">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input 
              type="text" 
              placeholder="Search clients..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex-shrink-0" style={{ background: "var(--teal)", color: "#fff" }}>
            <Plus size={16} /> <span className="hidden sm:inline">Add Client</span>
          </button>
        </div>
      </div>

      {/* Action Required Queue */}
      {needsAttention.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "var(--warning-text)" }}>
            <AlertTriangle size={14} /> Action Required
          </h3>
          <div className="flex flex-col gap-2">
            {needsAttention.map((c) => <ClinicRow key={c.id} clinic={c} highlighted />)}
          </div>
        </section>
      )}

      {/* Active Clients List */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>All Clients</h3>
        <div className="flex flex-col gap-2">
          {others.length > 0 ? (
            others.map((c) => <ClinicRow key={c.id} clinic={c} />)
          ) : (
            <div className="card p-8 flex flex-col items-center justify-center text-center">
              <Users size={32} style={{ color: "var(--text-placeholder)" }} className="mb-3" />
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>No active clients found.</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{searchQuery ? "Try a different search term." : "Add a client to get started."}</p>
            </div>
          )}
        </div>
      </section>

      {/* Manual Client Setup Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 dark:bg-[#0A0514]/70 backdrop-blur-sm"
              onClick={() => !loading && setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative card w-full max-w-lg p-0 overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 flex justify-between items-center border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Manual Client Setup</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" style={{ color: "var(--text-muted)" }}>
                  <X size={18} />
                </button>
              </div>
              
              <form onSubmit={handleAddClient} className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Clinic Name</label>
                    <input required placeholder="Radiance MedSpa" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Phone Number</label>
                    <input required placeholder="+1 (555) 123-4567" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} onChange={e => setForm({...form, phone_number: e.target.value})} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Contact Email</label>
                  <input required type="email" placeholder="owner@clinic.com" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} onChange={e => setForm({...form, contact_email: e.target.value})} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Plan Tier</label>
                    <select className="w-full px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer appearance-none" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} value={form.plan_tier} onChange={e => setForm({...form, plan_tier: e.target.value as PlanTier})}>
                      <option value="overflow">Overflow ($1,000/mo)</option>
                      <option value="full_time">Full Time ($1,500/mo)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>AI Name</label>
                    <input required placeholder="Aria" value={form.receptionist_name} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} onChange={e => setForm({...form, receptionist_name: e.target.value})} />
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-6 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors" style={{ background: "var(--bg-sunken)", color: "var(--text-secondary)" }}>Cancel</button>
                  <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60" style={{ background: "var(--teal)", color: "#fff" }}>
                    {loading && <Loader2 size={15} className="animate-spin" />} Create & Bypass Billing
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClinicRow({ clinic, highlighted = false }: { clinic: Clinic; highlighted?: boolean }) {
  const status = STATUS_CONFIG[clinic.status];
  const StatusIcon = status.icon;
  const hasAgent = !!clinic.agent_id;
  const hasCrm = clinic.crm_provider !== "none";

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-all" style={highlighted ? { borderColor: "var(--warning-text)", borderWidth: "1.5px" } : {}}>
      
      <Link href={`/admin/clients/${clinic.id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: "var(--teal-surface)", color: "var(--teal-text)" }}>
          {clinic.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold truncate group-hover:text-teal-500 transition-colors" style={{ color: "var(--text-primary)" }}>{clinic.name}</p>
            <span className="badge text-[10px]" style={{ background: status.bg, color: status.color }}><StatusIcon size={9} /> {status.label}</span>
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{clinic.contact_email} · {clinic.phone_number}</p>
        </div>
      </Link>

      <div className="flex items-center gap-3 pl-12 sm:pl-0 flex-shrink-0">
        <div className="flex gap-1.5 hidden md:flex">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold" style={{ background: hasAgent ? "var(--success-surface)" : "var(--bg-sunken)", color: hasAgent ? "var(--success-text)" : "var(--text-muted)" }}>
            <Bot size={12} /> {hasAgent ? "Agent Live" : "No Agent"}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold" style={{ background: hasCrm ? "var(--purple-surface)" : "var(--bg-sunken)", color: hasCrm ? "var(--purple-text)" : "var(--text-muted)" }}>
            <DbIcon size={12} /> {hasCrm ? "CRM Linked" : "No CRM"}
          </div>
        </div>

        {/* ADMIN INSPECT DASHBOARD BUTTON */}
        <Link 
          href={`/?previewClinicId=${clinic.id}`} 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
          style={{ background: "var(--info-surface)", color: "var(--info-text)" }}
          title="Inspect this clinic's live client dashboard"
        >
          <Eye size={13} /> Inspect Dashboard
        </Link>
      </div>
    </div>
  );
}