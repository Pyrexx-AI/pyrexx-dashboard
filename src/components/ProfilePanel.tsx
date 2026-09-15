"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2, Bot, Users, CreditCard, Bell,
  Calendar, MapPin, Phone, Globe, Clock,
  Database, CheckCircle2, Pencil, UserPlus, LogOut, Download, Loader2, Shield,
  AlertCircle, Mail, X
} from "lucide-react";
import Switch from "./ui/Switch";
import { createClient } from "@/lib/supabase/client";
import { getPlan } from "@/lib/plans";
import type { Database as DB } from "@/types/database";

type Clinic = DB["public"]["Tables"]["clinics"]["Row"];
type Profile = DB["public"]["Tables"]["profiles"]["Row"];

const containerV: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, ease: "easeOut" } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 28 } },
};

function Section({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  action,
  children,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section variants={itemV} className="card p-4 md:p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
            <Icon size={14} style={{ color: iconColor }} aria-hidden="true" />
          </div>
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer rounded-lg px-2 py-1 transition-colors"
      style={{ color: "var(--teal-text)", background: "var(--teal-surface)" }}
    >
      <Pencil size={11} aria-hidden="true" /> Edit
    </button>
  );
}

/**
 * Shared modal shell for the three dialogs below (Edit Clinic
 * Profile, Edit AI Receptionist, Invite Team Member) — these back
 * buttons that previously rendered with no onClick at all.
 */
function SimpleModal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative card w-full max-w-sm p-0 overflow-hidden"
          >
            <div className="px-5 py-4 flex justify-between items-center border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{title}</h2>
              <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" style={{ color: "var(--text-muted)" }}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const modalInputClass = "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors";
const modalInputStyle = { background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" } as const;

export interface ProfilePanelProps {
  clinicId?: string;
  isAdmin?: boolean;
  isInspectionMode?: boolean;
  userEmail?: string;
}

export default function ProfilePanel({
  clinicId,
  isAdmin = false,
  isInspectionMode = false,
  userEmail,
}: ProfilePanelProps) {
  const router = useRouter();
  const [prefs, setPrefs] = useState({
    dailyDigest: true,
    missedCallSms: true,
    newBookingPush: true,
    weeklyReport: false,
  });

  const [isPending, startTransition] = useTransition();
  const [billingError, setBillingError] = useState<string | null>(null);

  // Edit Clinic Profile modal
  const [editClinicOpen, setEditClinicOpen] = useState(false);
  const [editClinicForm, setEditClinicForm] = useState({ name: "", phoneNumber: "", website: "" });
  const [editClinicSaving, setEditClinicSaving] = useState(false);
  const [editClinicError, setEditClinicError] = useState<string | null>(null);

  // Edit AI Receptionist (agent name only — the only real column
  // backing that section; voice/hours/greeting shown there are
  // derived display text, not stored anywhere in the schema)
  const [editAiOpen, setEditAiOpen] = useState(false);
  const [editAiName, setEditAiName] = useState("");
  const [editAiSaving, setEditAiSaving] = useState(false);
  const [editAiError, setEditAiError] = useState<string | null>(null);

  // Invite Team Member modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const [exporting, setExporting] = useState(false);

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [team, setTeam] = useState<Profile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  // Only an owner can invite teammates (enforced server-side in
  // /api/clinic/invite-team-member too — this just keeps the button
  // itself honest about who can use it).
  const [viewerRole, setViewerRole] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicId) {
      setLoadingData(false);
      return;
    }

    async function fetchData(id: string) {
      setLoadingData(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();

      const [clinicRes, teamRes, viewerRes] = await Promise.all([
        supabase.from("clinics").select("*").eq("id", id).single(),
        supabase.from("profiles").select("*").eq("clinic_id", id),
        user ? supabase.from("profiles").select("role").eq("id", user.id).single() : Promise.resolve({ data: null }),
      ]);

      if (clinicRes.data) setClinic(clinicRes.data);
      if (teamRes.data) setTeam(teamRes.data);
      if (viewerRes.data) setViewerRole(viewerRes.data.role);

      setLoadingData(false);
    }

    fetchData(clinicId);
  }, [clinicId]);

  const togglePref = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  function handleManageBilling() {
    if (!clinicId) {
      setBillingError("Billing is not available — missing clinic context.");
      return;
    }
    setBillingError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clinicId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not open billing portal");
        window.location.href = json.checkoutUrl;
      } catch (err) {
        setBillingError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function openEditClinic() {
    setEditClinicForm({
      name: clinic?.name || "",
      phoneNumber: clinic?.phone_number || "",
      website: clinic?.website || "",
    });
    setEditClinicError(null);
    setEditClinicOpen(true);
  }

  async function handleSaveClinicProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!clinicId) return;
    setEditClinicSaving(true);
    setEditClinicError(null);
    try {
      const res = await fetch("/api/clinic/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId,
          name: editClinicForm.name,
          phoneNumber: editClinicForm.phoneNumber,
          website: editClinicForm.website,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save changes");
      setClinic(json.clinic);
      setEditClinicOpen(false);
    } catch (err) {
      setEditClinicError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setEditClinicSaving(false);
    }
  }

  function openEditAi() {
    setEditAiName(clinic?.receptionist_name || "");
    setEditAiError(null);
    setEditAiOpen(true);
  }

  async function handleSaveAiName(e: React.FormEvent) {
    e.preventDefault();
    if (!clinicId) return;
    setEditAiSaving(true);
    setEditAiError(null);
    try {
      const res = await fetch("/api/clinic/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, receptionistName: editAiName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save changes");
      setClinic(json.clinic);
      setEditAiOpen(false);
    } catch (err) {
      setEditAiError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setEditAiSaving(false);
    }
  }

  function openInvite() {
    setInviteEmail("");
    setInviteError(null);
    setInviteSuccess(false);
    setInviteOpen(true);
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!clinicId) return;
    setInviteSaving(true);
    setInviteError(null);
    try {
      const res = await fetch("/api/clinic/invite-team-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, email: inviteEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not send invite");
      setInviteSuccess(true);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setInviteSaving(false);
    }
  }

  async function handleExportData() {
    if (!clinicId) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/clinic/export-data?clinicId=${encodeURIComponent(clinicId)}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Could not export data");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `call-records-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not export data");
    } finally {
      setExporting(false);
    }
  }

  if (loadingData) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin" style={{ color: "var(--teal)" }} />
        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Loading clinic profile data...</p>
      </div>
    );
  }

  // STATE 1: Verified Admin without an active inspected clinic
  if (isAdmin && !clinicId) {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-4 py-16 text-center card p-8">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--teal-surface)" }}>
          <Shield size={24} style={{ color: "var(--teal)" }} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Executive Administrator Mode</h3>
          <p className="text-xs mt-1 max-w-md" style={{ color: "var(--text-muted)" }}>
            Your account has executive administrator privileges across Pyrexx AI. Manage client clinics, view MRR, and configure integrations in the Command Center.
          </p>
        </div>
        <div className="flex gap-3 mt-2">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md"
            style={{ background: "var(--teal)", color: "#fff" }}
          >
            Open Admin Command Center &rarr;
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: "var(--bg-sunken)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // STATE 2: Unlinked or Orphaned Account (Neither admin nor attached to a clinic)
  if (!clinicId) {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-4 py-16 text-center card p-8">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--warning-surface)" }}>
          <AlertCircle size={24} style={{ color: "var(--warning-text)" }} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Account Setup in Progress</h3>
          <p className="text-xs mt-1 max-w-md leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Your account is authenticated ({userEmail || "on file"}), but has not yet been linked to an active clinic workspace.
            Our setup team is currently provisioning your AI Receptionist agent.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <a
            href="mailto:hello@pyrexxai.com"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "var(--teal)", color: "#fff" }}
          >
            <Mail size={15} /> Contact Support
          </a>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: "var(--bg-sunken)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // STATE 3: Active Clinic Workspace
  const clinicInfo = {
    name: clinic?.name || "Unknown Clinic",
    address: "Location on File",
    phone: clinic?.phone_number || "—",
    website: clinic?.website || "—",
    timezone: "Eastern Time (ET)",
    initials: (clinic?.name || "C")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase(),
  };

  const aiSettings = {
    agentName: clinic?.receptionist_name || "Aria",
    voice: "Sarah — Warm & Professional (US English)",
    greeting: `Thank you for calling ${clinic?.name || "us"}, this is ${clinic?.receptionist_name || "Aria"}. How can I help you today?`,
    hours: [
      { day: "Mon – Fri", time: "8:00 AM – 7:00 PM" },
      { day: "Saturday",  time: "9:00 AM – 4:00 PM" },
      { day: "Sunday",    time: "Closed" },
    ],
  };

  const colors = ["#48C4C6", "#8952A5", "#60A5FA", "#F59E0B"];
  const mappedTeamMembers = team.map((m, i) => ({
    name: m.full_name || "Team Member",
    role: m.role.charAt(0).toUpperCase() + m.role.slice(1),
    email: m.role === "owner" ? clinic?.contact_email : "—",
    initials: (m.full_name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase(),
    color: colors[i % colors.length],
  }));

  const currentPlanDefinition = clinic?.plan_tier ? getPlan(clinic.plan_tier) : null;
  const plan = {
    name: currentPlanDefinition?.name || "AI Receptionist Plan",
    price: clinic?.plan_price_cents
      ? `$${(clinic.plan_price_cents / 100).toLocaleString()}/month`
      : currentPlanDefinition?.priceLabel || "TBD",
    renewal: "Active Monthly",
    minutesUsed: 0,
    minutesIncluded: 2500,
  };

  const isSubActive = clinic?.subscription_status === "active";
  const usagePct = Math.round((plan.minutesUsed / plan.minutesIncluded) * 100);

  const integrations = [
    {
      name: "AI Receptionist Agent",
      desc: "Powers your AI receptionist calls",
      status: clinic?.agent_id ? "connected" : "not_connected",
      icon: Bot,
    },
    {
      name: "Google Calendar",
      desc: "Syncs bookings in real time",
      status: "not_connected",
      icon: Calendar,
      // FIX: this previously rendered an active "Connect" button
      // that did nothing on click — no Google OAuth flow exists in
      // this codebase (no client ID/secret, no OAuth callback
      // route). Flagging it disables the button honestly instead of
      // pretending the integration works.
      comingSoon: true,
    },
    {
      name: `CRM (${clinic?.crm_provider && clinic.crm_provider !== "none" ? clinic.crm_provider.toUpperCase() : "None"})`,
      desc: "Sync patient records & call logs",
      status: clinic?.crm_provider && clinic.crm_provider !== "none" ? "connected" : "not_connected",
      icon: Database,
    },
  ];

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="flex flex-col gap-4">
      <motion.div variants={itemV}>
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Profile &amp; Settings</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Manage your clinic, AI receptionist, team, and integrations
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Section
            icon={Building2}
            iconBg="var(--teal-surface)"
            iconColor="var(--teal)"
            title="Clinic Profile"
            action={<EditButton label="Edit clinic profile" onClick={openEditClinic} />}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-extrabold flex-shrink-0"
                style={{ background: "var(--teal-surface)", color: "var(--teal-text)" }}
                aria-hidden="true"
              >
                {clinicInfo.initials}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold mb-2" style={{ color: "var(--text-primary)" }}>{clinicInfo.name}</h4>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                    <MapPin size={13} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
                    <span className="truncate">{clinicInfo.address}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                    <Phone size={13} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
                    <span>{clinicInfo.phone}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                    <Globe size={13} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
                    <span>{clinicInfo.website}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                    <Clock size={13} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
                    <span>{clinicInfo.timezone}</span>
                  </div>
                </dl>
              </div>
            </div>
          </Section>

          <Section
            icon={Bot}
            iconBg="var(--purple-surface)"
            iconColor="var(--purple)"
            title="AI Receptionist"
            action={<EditButton label="Edit AI receptionist settings" onClick={openEditAi} />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Agent Name</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{aiSettings.agentName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Voice</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{aiSettings.voice}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Business Hours</p>
                  <ul className="space-y-1" role="list">
                    {aiSettings.hours.map((h) => (
                      <li key={h.day} className="flex justify-between text-xs">
                        <span style={{ color: "var(--text-secondary)" }}>{h.day}</span>
                        <span className="font-medium" style={{ color: "var(--text-primary)" }}>{h.time}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Greeting Script</p>
                <div
                  className="rounded-2xl p-3 text-xs italic leading-relaxed"
                  style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
                >
                  "{aiSettings.greeting}"
                </div>
              </div>
            </div>
          </Section>

          <Section
            icon={Users}
            iconBg="var(--info-surface)"
            iconColor="var(--info-text)"
            title="Team Members"
            action={
              (isAdmin || viewerRole === "owner") && (
                <button
                  type="button"
                  aria-label="Invite team member"
                  onClick={openInvite}
                  className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer rounded-lg px-2 py-1 transition-colors"
                  style={{ color: "var(--info-text)", background: "var(--info-surface)" }}
                >
                  <UserPlus size={11} aria-hidden="true" /> Invite
                </button>
              )
            }
          >
            <ul className="space-y-3" role="list">
              {mappedTeamMembers.map((m) => (
                <li key={m.name + m.role} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: m.color }}
                    aria-hidden="true"
                  >
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{m.name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      {m.role} {m.email !== "—" && `· ${m.email}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Sidebar Column */}
        <div className="flex flex-col gap-4">
          <Section icon={CreditCard} iconBg="var(--success-surface)" iconColor="var(--success-text)" title="Subscription">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{plan.name}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{plan.price} · {plan.renewal}</p>
              </div>
              <span
                className="badge text-[10px]"
                style={{
                  background: isSubActive ? "var(--success-surface)" : "var(--warning-surface)",
                  color: isSubActive ? "var(--success-text)" : "var(--warning-text)",
                }}
              >
                {isSubActive ? <CheckCircle2 size={10} aria-hidden="true" /> : <Clock size={10} aria-hidden="true" />}
                {isSubActive ? "Active" : "Pending Setup"}
              </span>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1" style={{ color: "var(--text-secondary)" }}>
                <span>Call minutes used</span>
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {plan.minutesUsed.toLocaleString()} / {plan.minutesIncluded.toLocaleString()}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--bg-sunken)" }}
                role="progressbar"
                aria-valuenow={usagePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Call minutes used this period"
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "var(--teal)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePct}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleManageBilling}
              disabled={isPending}
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors disabled:opacity-60"
              style={{ background: "var(--bg-sunken)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
            >
              {isPending && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
              {isPending ? "Opening billing…" : "Manage Billing"}
            </button>
            {billingError && (
              <p className="text-[11px] mt-1.5" style={{ color: "var(--error-text)" }} role="alert">{billingError}</p>
            )}
          </Section>

          <Section icon={Database} iconBg="var(--teal-surface)" iconColor="var(--teal)" title="Integrations">
            <ul className="space-y-3" role="list">
              {integrations.map((i) => {
                const Icon = i.icon;
                const connected = i.status === "connected";
                return (
                  <li key={i.name} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: connected ? "var(--teal-surface)" : "var(--bg-sunken)" }}
                    >
                      <Icon size={14} style={{ color: connected ? "var(--teal)" : "var(--text-muted)" }} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{i.name}</p>
                      <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{i.desc}</p>
                    </div>
                    {connected ? (
                      <span className="badge text-[10px] flex-shrink-0" style={{ background: "var(--success-surface)", color: "var(--success-text)" }}>
                        <CheckCircle2 size={9} aria-hidden="true" /> Connected
                      </span>
                    ) : (i as any).comingSoon ? (
                      <span
                        className="badge text-[10px] flex-shrink-0"
                        style={{ background: "var(--bg-sunken)", color: "var(--text-muted)" }}
                        title="Google Calendar sync isn't built yet"
                      >
                        Coming soon
                      </span>
                    ) : (
                      /*
                       * FIX: this previously rendered an active
                       * "Connect" button with no onClick handler at
                       * all. Neither of the two integrations that
                       * land here has a real self-service connect
                       * flow: the AI Receptionist agent provisions
                       * automatically once billing goes active (see
                       * api/webhooks/dodo/route.ts), and CRM
                       * credentials are set up by Pyrexx staff from
                       * /admin/clients/[id], not by the clinic. A
                       * neutral status badge is honest about that
                       * instead of a button that did nothing.
                       */
                      <span
                        className="badge text-[10px] flex-shrink-0"
                        style={{ background: "var(--bg-sunken)", color: "var(--text-muted)" }}
                      >
                        Not connected
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section icon={Bell} iconBg="var(--warning-surface)" iconColor="var(--warning-text)" title="Notifications">
            <ul className="space-y-3" role="list">
              <li className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Daily call digest</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Email summary every morning</p>
                </div>
                <Switch checked={prefs.dailyDigest} onChange={() => togglePref("dailyDigest")} label="Daily call digest" />
              </li>
              <li className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Missed call SMS</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Text alert for escalated calls</p>
                </div>
                <Switch checked={prefs.missedCallSms} onChange={() => togglePref("missedCallSms")} label="Missed call SMS alerts" />
              </li>
              <li className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>New booking alerts</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Push notification on booking</p>
                </div>
                <Switch checked={prefs.newBookingPush} onChange={() => togglePref("newBookingPush")} label="New booking push notifications" />
              </li>
            </ul>
          </Section>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExportData}
              disabled={exporting || !clinicId}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors disabled:opacity-60"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
            >
              {exporting ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Download size={13} aria-hidden="true" />}
              {exporting ? "Exporting…" : "Export Data"}
            </button>
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
              onClick={handleSignOut}
            >
              <LogOut size={13} aria-hidden="true" /> Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Edit Clinic Profile */}
      <SimpleModal open={editClinicOpen} title="Edit Clinic Profile" onClose={() => setEditClinicOpen(false)}>
        <form onSubmit={handleSaveClinicProfile} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Clinic Name</label>
            <input
              required
              value={editClinicForm.name}
              onChange={(e) => setEditClinicForm((f) => ({ ...f, name: e.target.value }))}
              className={modalInputClass} style={modalInputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Phone Number</label>
            <input
              required
              value={editClinicForm.phoneNumber}
              onChange={(e) => setEditClinicForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              className={modalInputClass} style={modalInputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Website (optional)</label>
            <input
              value={editClinicForm.website}
              onChange={(e) => setEditClinicForm((f) => ({ ...f, website: e.target.value }))}
              placeholder="https://"
              className={modalInputClass} style={modalInputStyle}
            />
          </div>
          {editClinicError && <p className="text-[11px]" style={{ color: "var(--error-text)" }} role="alert">{editClinicError}</p>}
          <div className="flex gap-2 justify-end mt-2 pt-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <button type="button" onClick={() => setEditClinicOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors" style={{ background: "var(--bg-sunken)", color: "var(--text-secondary)" }}>Cancel</button>
            <button type="submit" disabled={editClinicSaving} className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60" style={{ background: "var(--teal)", color: "#fff" }}>
              {editClinicSaving && <Loader2 size={12} className="animate-spin" aria-hidden="true" />} Save Changes
            </button>
          </div>
        </form>
      </SimpleModal>

      {/* Edit AI Receptionist Name */}
      <SimpleModal open={editAiOpen} title="Edit AI Receptionist" onClose={() => setEditAiOpen(false)}>
        <form onSubmit={handleSaveAiName} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Agent Name</label>
            <input
              required
              value={editAiName}
              onChange={(e) => setEditAiName(e.target.value)}
              className={modalInputClass} style={modalInputStyle}
            />
            <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
              This is the name your AI receptionist uses when answering calls. Voice, hours, and greeting script are configured by Pyrexx during setup — reach out to change those.
            </p>
          </div>
          {editAiError && <p className="text-[11px]" style={{ color: "var(--error-text)" }} role="alert">{editAiError}</p>}
          <div className="flex gap-2 justify-end mt-2 pt-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <button type="button" onClick={() => setEditAiOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors" style={{ background: "var(--bg-sunken)", color: "var(--text-secondary)" }}>Cancel</button>
            <button type="submit" disabled={editAiSaving} className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60" style={{ background: "var(--teal)", color: "#fff" }}>
              {editAiSaving && <Loader2 size={12} className="animate-spin" aria-hidden="true" />} Save Changes
            </button>
          </div>
        </form>
      </SimpleModal>

      {/* Invite Team Member */}
      <SimpleModal open={inviteOpen} title="Invite Team Member" onClose={() => setInviteOpen(false)}>
        {inviteSuccess ? (
          <div className="flex flex-col items-center text-center gap-2 py-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--success-surface)" }}>
              <CheckCircle2 size={18} style={{ color: "var(--success-text)" }} aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Invite sent to {inviteEmail}</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>They'll get an email with a link to set up their password.</p>
            <button type="button" onClick={() => setInviteOpen(false)} className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors" style={{ background: "var(--teal)", color: "#fff" }}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
                <input
                  required
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@clinic.com"
                  className={`${modalInputClass} pl-9`} style={modalInputStyle}
                />
              </div>
              <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                They'll be added as a staff member on your clinic's dashboard.
              </p>
            </div>
            {inviteError && <p className="text-[11px]" style={{ color: "var(--error-text)" }} role="alert">{inviteError}</p>}
            <div className="flex gap-2 justify-end mt-2 pt-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <button type="button" onClick={() => setInviteOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors" style={{ background: "var(--bg-sunken)", color: "var(--text-secondary)" }}>Cancel</button>
              <button type="submit" disabled={inviteSaving} className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60" style={{ background: "var(--teal)", color: "#fff" }}>
                {inviteSaving && <Loader2 size={12} className="animate-spin" aria-hidden="true" />} Send Invite
              </button>
            </div>
          </form>
        )}
      </SimpleModal>
    </motion.div>
  );
}