"use client";

import { useState, useTransition } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Building2, Bot, Users, CreditCard, Bell,
  Calendar, MapPin, Phone, Globe, Clock,
  Database, CheckCircle2, Pencil, UserPlus, LogOut, Download, Loader2,
} from "lucide-react";
import Switch from "./ui/Switch";

/* ─── Variants ──────────────────────────────────────────────────── */
const containerV: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, ease: "easeOut" } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
};

/* ─── Data ──────────────────────────────────────────────────────── */
const clinicInfo = {
  name: "Radiance MedSpa & Wellness",
  address: "1240 Ocean Drive, Miami, FL 33139",
  phone: "+1 (305) 555-0182",
  website: "radiancemedspa.com",
  timezone: "Eastern Time (ET)",
};

const aiSettings = {
  agentName: "Aria",
  voice: "Sarah — Warm & Professional (US English)",
  greeting:
    "Thank you for calling Radiance MedSpa, this is Aria. How can I help you today?",
  hours: [
    { day: "Mon – Fri", time: "8:00 AM – 7:00 PM" },
    { day: "Saturday",  time: "9:00 AM – 4:00 PM" },
    { day: "Sunday",    time: "Closed" },
  ],
};

const teamMembers = [
  { name: "Dr. Lisa Monroe", role: "Owner / Lead Physician", email: "lisa@radiancemedspa.com",   initials: "LM", color: "#48C4C6" },
  { name: "Carlos Mendes",   role: "Front Desk Manager",     email: "carlos@radiancemedspa.com", initials: "CM", color: "#8952A5" },
  { name: "Priya Anand",     role: "Esthetician",            email: "priya@radiancemedspa.com",  initials: "PA", color: "#60A5FA" },
];

const plan = {
  name: "AI Receptionist Plan",
  price: "$1,000/month",
  renewal: "July 14, 2026",
  minutesUsed: 1847,
  minutesIncluded: 2500,
};

interface Integration {
  name: string;
  desc: string;
  status: "connected" | "not_connected";
  icon: React.ElementType;
}
const integrations: Integration[] = [
  { name: "AI Receptionist Agent", desc: "Powers your AI receptionist calls", status: "connected",     icon: Bot },
  { name: "Google Calendar",        desc: "Syncs bookings in real time",       status: "connected",     icon: Calendar },
  { name: "CRM (HubSpot)",           desc: "Sync patient records & call logs",  status: "not_connected", icon: Database },
];

/* ─── Section wrapper ───────────────────────────────────────────── */
function Section({ icon: Icon, iconBg, iconColor, title, action, children }: {
  icon: React.ElementType; iconBg: string; iconColor: string; title: string;
  action?: React.ReactNode; children: React.ReactNode;
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

/* ─── Small "edit" button used in section headers ───────────────── */
function EditButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer rounded-lg px-2 py-1 transition-colors"
      style={{ color: "var(--teal-text)", background: "var(--teal-surface)" }}
    >
      <Pencil size={11} aria-hidden="true" /> Edit
    </button>
  );
}

/* ─── Main Panel ────────────────────────────────────────────────── */
export default function ProfilePanel({ clinicId }: { clinicId?: string }) {
  const [prefs, setPrefs] = useState({
    dailyDigest: true,
    missedCallSms: true,
    newBookingPush: true,
    weeklyReport: false,
  });
  const [isPending, startTransition] = useTransition();
  const [billingError, setBillingError] = useState<string | null>(null);

  const togglePref = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const usagePct = Math.round((plan.minutesUsed / plan.minutesIncluded) * 100);

  /**
   * Opens Dodo's hosted checkout for this clinic's $1,000/mo plan.
   * NOTE: `clinicId` must be supplied by the parent — DashboardHome
   * currently renders mock data and doesn't yet thread through the
   * authenticated session's clinic_id. Wire that up alongside the
   * broader "replace mock arrays with live data" step described in
   * AI_RECEPTIONIST_INTEGRATION.md / api/dashboard/summary.
   */
  function handleManageBilling() {
    if (!clinicId) {
      setBillingError("Billing isn't available yet — clinic context missing.");
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

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="flex flex-col gap-4">
      {/* Header */}
      <motion.div variants={itemV}>
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Profile &amp; Settings</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Manage your clinic, AI receptionist, team, and integrations
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Main column ─────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Clinic info */}
          <Section icon={Building2} iconBg="var(--teal-surface)" iconColor="var(--teal)"
            title="Clinic Profile" action={<EditButton label="Edit clinic profile" />}>
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-extrabold flex-shrink-0"
                style={{ background: "var(--teal-surface)", color: "var(--teal-text)" }}
                aria-hidden="true"
              >
                RM
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

          {/* AI Receptionist settings */}
          <Section icon={Bot} iconBg="var(--purple-surface)" iconColor="var(--purple)"
            title="AI Receptionist" action={<EditButton label="Edit AI receptionist settings" />}>
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
                <div className="rounded-2xl p-3 text-xs italic leading-relaxed"
                  style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                  "{aiSettings.greeting}"
                </div>
              </div>
            </div>
          </Section>

          {/* Team members */}
          <Section icon={Users} iconBg="var(--info-surface)" iconColor="var(--info-text)"
            title="Team Members"
            action={
              <button type="button" aria-label="Invite team member"
                className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer rounded-lg px-2 py-1 transition-colors"
                style={{ color: "var(--info-text)", background: "var(--info-surface)" }}>
                <UserPlus size={11} aria-hidden="true" /> Invite
              </button>
            }>
            <ul className="space-y-3" role="list">
              {teamMembers.map((m) => (
                <li key={m.email} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: m.color }} aria-hidden="true">
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{m.name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{m.role} · {m.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* ── Sidebar column ──────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Plan / billing */}
          <Section icon={CreditCard} iconBg="var(--success-surface)" iconColor="var(--success-text)" title="Subscription">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{plan.name}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{plan.price} · renews {plan.renewal}</p>
              </div>
              <span className="badge text-[10px]" style={{ background: "var(--success-surface)", color: "var(--success-text)" }}>
                <CheckCircle2 size={10} aria-hidden="true" /> Active
              </span>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1" style={{ color: "var(--text-secondary)" }}>
                <span>Call minutes used</span>
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {plan.minutesUsed.toLocaleString()} / {plan.minutesIncluded.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-sunken)" }}
                role="progressbar" aria-valuenow={usagePct} aria-valuemin={0} aria-valuemax={100} aria-label="Call minutes used this period">
                <motion.div className="h-full rounded-full" style={{ background: "var(--teal)" }}
                  initial={{ width: 0 }} animate={{ width: `${usagePct}%` }} transition={{ duration: 0.7, ease: "easeOut" }} />
              </div>
            </div>
            <button type="button" onClick={handleManageBilling} disabled={isPending}
              className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors disabled:opacity-60"
              style={{ background: "var(--bg-sunken)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
              {isPending && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
              {isPending ? "Opening billing…" : "Manage Billing"}
            </button>
            {billingError && (
              <p className="text-[11px] mt-1.5" style={{ color: "var(--error-text)" }} role="alert">{billingError}</p>
            )}
          </Section>

          {/* Integrations */}
          <Section icon={Database} iconBg="var(--teal-surface)" iconColor="var(--teal)" title="Integrations">
            <ul className="space-y-3" role="list">
              {integrations.map((i) => {
                const Icon = i.icon;
                const connected = i.status === "connected";
                return (
                  <li key={i.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: connected ? "var(--teal-surface)" : "var(--bg-sunken)" }}>
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
                    ) : (
                      <button type="button" aria-label={`Connect ${i.name}`}
                        className="text-[10px] font-bold flex-shrink-0 cursor-pointer rounded-lg px-2 py-1 transition-colors"
                        style={{ color: "var(--purple-text)", background: "var(--purple-surface)" }}>
                        Connect
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>

          {/* Notification preferences */}
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
              <li className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Weekly performance report</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Sent every Monday</p>
                </div>
                <Switch checked={prefs.weeklyReport} onChange={() => togglePref("weeklyReport")} label="Weekly performance report" />
              </li>
            </ul>
          </Section>

          {/* Account actions */}
          <motion.div variants={itemV} className="flex gap-2">
            <button type="button"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
              <Download size={13} aria-hidden="true" /> Export Data
            </button>
            <button type="button"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
              <LogOut size={13} aria-hidden="true" /> Sign Out
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}