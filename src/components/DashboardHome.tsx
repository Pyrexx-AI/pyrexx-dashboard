"use client";

import { useState, useEffect, useId } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Sun, Moon, LayoutDashboard, BarChart3,
  ChevronRight, CalendarCheck, Sparkles,
  CheckCircle2, Clock, AlertCircle, CalendarClock,
  TrendingUp, Zap, UserCircle2,
} from "lucide-react";
import DonutChart from "./DonutChart";
import MeetingModal, { Meeting } from "./MeetingModal";
import ListModal from "./ListModal";
import LogoMark from "./LogoMark";
import AnalyticsPanel from "./AnalyticsPanel";
import ProfilePanel from "./ProfilePanel";

/* ─── Framer Motion variants ────────────────────────────────────── */
/*
  FIX: Explicit `Variants` type annotation — without it, TS widens
  `type: "spring"` and `ease: "easeOut"` to plain `string`, which is
  incompatible with Framer Motion's Transition union types and
  breaks the production build (see git history — this exact issue
  previously failed Vercel's type-check step).
*/
const containerV: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, ease: "easeOut" } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
};

/* ─── Data ──────────────────────────────────────────────────────── */
const recentCalls: Meeting[] = [
  { id: 1, name: "Sarah Jenkins",  type: "Botox Consult",    time: "Today, 10:00 AM",    status: "Completed", transcriptPreview: "Client asked about recovery time. AI explained 24-48h, booked follow-up." },
  { id: 2, name: "Mike Ross",      type: "Back Massage",     time: "Yesterday, 2:30 PM", status: "Completed", transcriptPreview: "60-min deep tissue confirmed. Intake forms sent via SMS." },
  { id: 3, name: "Emily Clark",    type: "Pricing Inquiry",  time: "Yesterday, 4:15 PM", status: "Completed", transcriptPreview: "Provided tier pricing. Client will call back to schedule." },
  { id: 4, name: "Aisha Patel",    type: "LED Therapy",      time: "Mon, 11:20 AM",      status: "Completed", transcriptPreview: "Returning client. AI recognised previous visit and offered loyalty pricing." },
  { id: 5, name: "James Liu",      type: "General Inquiry",  time: "Mon, 9:45 AM",       status: "Completed", transcriptPreview: "Asked about Hydrafacial availability. Booked for Wednesday." },
];

const recentlyBooked: Meeting[] = [
  { id: 6,  name: "Rachel Green",   type: "Microneedling",  time: "Today, 3:30 PM",    status: "Confirmed", bookedAt: "just now",   transcriptPreview: "New client. AI collected intake info and sent confirmation SMS." },
  { id: 7,  name: "Tom Harrington", type: "LED Therapy",    time: "Tomorrow, 2:00 PM", status: "Confirmed", bookedAt: "12 min ago", transcriptPreview: "Returning client. AI offered preferred time slot automatically." },
  { id: 8,  name: "Melissa Ford",   type: "Hydrafacial",    time: "Thu, 10:30 AM",     status: "Confirmed", bookedAt: "38 min ago", transcriptPreview: "First appointment. Digital waiver sent." },
  { id: 9,  name: "Carla Mendez",   type: "Botox Follow-up",time: "Fri, 9:00 AM",      status: "Confirmed", bookedAt: "1 hr ago",   transcriptPreview: "Post-treatment check. Upsell to maintenance plan offered." },
  { id: 10, name: "Daniel Park",    type: "Consultation",   time: "Sat, 11:00 AM",     status: "Confirmed", bookedAt: "2 hrs ago",  transcriptPreview: "First-time visitor seeking full-face assessment." },
];

const upcomingBookings: Meeting[] = [
  { id: 11, name: "Jessica Alba",    type: "Botox Follow-up", time: "Today, 3:00 PM",    status: "Scheduled", transcriptPreview: "Prefers Dr. Smith. VIP note added to CRM." },
  { id: 12, name: "David Chen",      type: "Consultation",    time: "Tomorrow, 9:00 AM", status: "Scheduled", transcriptPreview: "First visit. Waiver must be completed before arrival." },
  { id: 13, name: "Amanda Seyfried", type: "Back Massage",    time: "Tomorrow, 11:30 AM",status: "Scheduled", transcriptPreview: "Requested firm pressure. Notes in CRM." },
  { id: 14, name: "Kevin Okafor",    type: "Skin Analysis",   time: "Wed, 1:00 PM",      status: "Scheduled", transcriptPreview: "Interested in long-term skincare plan." },
  { id: 15, name: "Nina Wolff",      type: "Chemical Peel",   time: "Thu, 10:00 AM",     status: "Scheduled", transcriptPreview: "Patch test completed. Green-listed for treatment." },
];

/* ─── Helpers ───────────────────────────────────────────────────── */
function statusStyle(status: string) {
  switch (status) {
    case "Completed": return { bg: "var(--success-surface)", color: "var(--success-text)", Icon: CheckCircle2 };
    case "Scheduled": return { bg: "var(--purple-surface)",  color: "var(--purple-text)",  Icon: CalendarClock };
    case "Confirmed": return { bg: "var(--teal-surface)",    color: "var(--teal-text)",    Icon: CheckCircle2 };
    default:          return { bg: "var(--warning-surface)", color: "var(--warning-text)", Icon: AlertCircle };
  }
}

/* ─── MeetingRow — used inside ListCards ────────────────────────── */
function MeetingRow({ meeting, onSelect }: { meeting: Meeting; onSelect: (m: Meeting) => void }) {
  const { bg, color, Icon } = statusStyle(meeting.status);
  return (
    <button
      type="button"
      onClick={() => onSelect(meeting)}
      aria-label={`View ${meeting.name} — ${meeting.type}`}
      className="w-full text-left flex items-center gap-3 px-1 py-2.5 rounded-xl cursor-pointer group transition-colors"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
      onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <Icon size={12} style={{ color }} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{meeting.name}</p>
        <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
          {meeting.type}
          {meeting.bookedAt
            ? <span style={{ color: "var(--teal-text)" }}> · {meeting.bookedAt}</span>
            : <span> · {meeting.time}</span>
          }
        </p>
      </div>
      <ChevronRight size={12} className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
        style={{ color: "var(--text-muted)" }} aria-hidden="true" />
    </button>
  );
}

/* ─── ListCard ──────────────────────────────────────────────────── */
interface ListCardProps {
  title: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  meetings: Meeting[];
  onSelectMeeting: (m: Meeting) => void;
  onViewAll: () => void;
}
function ListCard({ title, icon: Icon, iconBg, iconColor, meetings, onSelectMeeting, onViewAll }: ListCardProps) {
  const preview = meetings.slice(0, 3);
  return (
    <motion.section variants={itemV} className="card p-4 md:p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
            <Icon size={14} style={{ color: iconColor }} aria-hidden="true" />
          </div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{title}</h2>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          aria-label={`View all ${title}`}
          className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors rounded-lg px-2 py-1"
          style={{ color: iconColor, background: iconBg }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = "0.75")}
          onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
        >
          View all <ChevronRight size={11} aria-hidden="true" />
        </button>
      </div>

      {/* 3-item preview — NOT scrollable (user navigates screen freely) */}
      <div role="list" className="flex flex-col">
        {preview.map((m) => (
          <MeetingRow key={m.id} meeting={m} onSelect={onSelectMeeting} />
        ))}
      </div>
    </motion.section>
  );
}

/* ─── InsightsCard ──────────────────────────────────────────────── */
function InsightsCard() {
  const intents = [
    { label: "Botox / Injectables", pct: 45, color: "var(--teal)" },
    { label: "Massage & Body",       pct: 28, color: "var(--purple)" },
    { label: "Facials & Skin",       pct: 18, color: "#60A5FA" },
    { label: "General Inquiries",    pct: 9,  color: "#F59E0B" },
  ];
  return (
    <motion.section variants={itemV} className="card p-4 md:p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "var(--teal-surface)" }}>
          <Zap size={14} style={{ color: "var(--teal)" }} aria-hidden="true" />
        </div>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Call Intents</h2>
      </div>

      {/* Stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5" role="img" aria-label="Intent distribution bar">
        {intents.map((i) => (
          <div key={i.label} className="rounded-full" style={{ width: `${i.pct}%`, background: i.color }} />
        ))}
      </div>

      {/* Legend rows */}
      <ul className="space-y-2.5" role="list">
        {intents.map((i) => (
          <li key={i.label}>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: i.color }} aria-hidden="true" />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{i.label}</span>
              </div>
              <span className="text-xs font-bold" style={{ color: i.color }}>{i.pct}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-sunken)" }}
              role="progressbar" aria-valuenow={i.pct} aria-valuemin={0} aria-valuemax={100}
              aria-label={`${i.label}: ${i.pct}%`}>
              <motion.div className="h-full rounded-full"
                style={{ background: i.color }}
                initial={{ width: 0 }}
                animate={{ width: `${i.pct}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }} />
            </div>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

/* ─── OutcomesCard ──────────────────────────────────────────────── */
function OutcomesCard() {
  const outcomes = [
    { label: "Appointment Booked",  count: 38, Icon: CheckCircle2, bg: "var(--success-surface)", color: "var(--success-text)" },
    { label: "Callback Requested",  count: 12, Icon: Clock,        bg: "var(--warning-surface)", color: "var(--warning-text)" },
    { label: "Escalated to Staff",  count: 4,  Icon: AlertCircle,  bg: "var(--info-surface)",    color: "var(--info-text)" },
  ];
  const total = outcomes.reduce((s, o) => s + o.count, 0);
  return (
    <motion.section variants={itemV} className="card p-4 md:p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "var(--purple-surface)" }}>
          <TrendingUp size={14} style={{ color: "var(--purple)" }} aria-hidden="true" />
        </div>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Outcomes</h2>
        <span className="ml-auto text-xs font-semibold badge"
          style={{ background: "var(--bg-sunken)", color: "var(--text-muted)" }}>
          {total} today
        </span>
      </div>
      <ul className="space-y-3" role="list">
        {outcomes.map(({ label, count, Icon, bg, color }) => {
          const pct = Math.round((count / total) * 100);
          return (
            <li key={label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={14} style={{ color }} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
                  <span className="text-xs font-bold" style={{ color }}>{count}</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-sunken)" }}
                  role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
                  <motion.div className="h-full rounded-full" style={{ background: color }}
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

/* ─── Dashboard Panel ───────────────────────────────────────────── */
type ModalKey = "recent" | "booked" | "upcoming" | null;
function DashboardPanel({ onSelectMeeting }: { onSelectMeeting: (m: Meeting) => void }) {
  const [openList, setOpenList] = useState<ModalKey>(null);
  return (
    <>
      {/* KPI row */}
      <motion.div variants={itemV} className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-5">
        <DonutChart title="Pickup Rate"  value="98.5%" percentage={98.5} subtitle="+2.1% vs last wk"
          trend={{ direction: "up", label: "2.1%" }} />
        <DonutChart title="Conversion"  value="42.3%" percentage={42.3} subtitle="+5.4% vs last wk"
          trend={{ direction: "up", label: "5.4%" }} />
        <DonutChart title="Total Calls" value="1,245"  percentage={75}   subtitle="245 this week"
          trend={{ direction: "up", label: "12%" }} />
      </motion.div>

      {/* Three activity cards — Recent · Booked · Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-4 mb-4 md:mb-5">
        <ListCard title="Recent Calls"
          icon={CalendarCheck} iconBg="var(--teal-surface)" iconColor="var(--teal-text)"
          meetings={recentCalls} onSelectMeeting={onSelectMeeting} onViewAll={() => setOpenList("recent")} />
        <ListCard title="Recently Booked"
          icon={Sparkles} iconBg="var(--purple-surface)" iconColor="var(--purple-text)"
          meetings={recentlyBooked} onSelectMeeting={onSelectMeeting} onViewAll={() => setOpenList("booked")} />
        <ListCard title="Upcoming"
          icon={CalendarClock} iconBg="var(--info-surface)" iconColor="var(--info-text)"
          meetings={upcomingBookings} onSelectMeeting={onSelectMeeting} onViewAll={() => setOpenList("upcoming")} />
      </div>

      {/* Insights row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InsightsCard />
        <OutcomesCard />
      </div>

      {/* List modals */}
      <ListModal isOpen={openList === "recent"}   onClose={() => setOpenList(null)}
        title="Recent Calls" subtitle="All completed AI calls"
        meetings={recentCalls} onSelectMeeting={onSelectMeeting} variant="recent" />
      <ListModal isOpen={openList === "booked"}   onClose={() => setOpenList(null)}
        title="Recently Booked" subtitle="Bookings captured by AI"
        meetings={recentlyBooked} onSelectMeeting={onSelectMeeting} variant="booked" />
      <ListModal isOpen={openList === "upcoming"} onClose={() => setOpenList(null)}
        title="Upcoming Appointments" subtitle="Scheduled via AI receptionist"
        meetings={upcomingBookings} onSelectMeeting={onSelectMeeting} variant="upcoming" />
    </>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */
type TabId = "dashboard" | "analytics" | "profile";
const TABS: { id: TabId; icon: React.ElementType; label: string }[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "analytics", icon: BarChart3,       label: "Analytics"  },
  { id: "profile",   icon: UserCircle2,     label: "Profile"   },
];

export default function DashboardHome() {
  const [activeTab, setActiveTab]       = useState<TabId>("dashboard");
  const [selectedMeeting, setSelected]  = useState<Meeting | null>(null);
  const [isDark, setIsDark]             = useState(() =>
    typeof window !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );
  const tabPanelId = useId();

  /* Persist theme */
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) { root.classList.add("dark");    localStorage.setItem("pyrexx-theme", "dark");  }
    else        { root.classList.remove("dark"); localStorage.setItem("pyrexx-theme", "light"); }
  }, [isDark]);

  return (
    <div className="min-h-screen font-sans dashboard-bg">
      {/* ── Header ────────────────────────────────────────────── */}
      <motion.header
        className="sticky top-0 z-30 px-4 md:px-8 py-3 md:py-4 flex items-center gap-3"
        style={{
          background: isDark
            ? "rgba(13,8,24,0.80)"
            : "rgba(244,246,255,0.80)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Logo + wordmark */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <LogoMark size={36} />
          <div>
            <h1 className="text-base md:text-lg font-extrabold leading-tight tracking-tight"
              style={{ color: "var(--text-primary)" }}>
              <span style={{ color: "var(--teal)" }}>Pyrexx</span> AI
            </h1>
            <p className="text-[10px] hidden sm:block font-medium leading-tight"
              style={{ color: "var(--text-muted)" }}>
              AI Receptionist
            </p>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Theme toggle — sun/moon pill with depression effect */}
        <div className="theme-toggle-pill flex-shrink-0" role="group" aria-label="Color theme">
          <button
            type="button"
            onClick={() => setIsDark(false)}
            aria-label="Light mode"
            aria-pressed={!isDark}
            className={`theme-toggle-btn${!isDark ? " active" : ""}`}
          >
            <Sun size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Light</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDark(true)}
            aria-label="Dark mode"
            aria-pressed={isDark}
            className={`theme-toggle-btn${isDark ? " active" : ""}`}
          >
            <Moon size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Dark</span>
          </button>
        </div>
      </motion.header>

      {/* ── Tab panel ─────────────────────────────────────────── */}
      <main
        id={`${tabPanelId}-panel`}
        className="px-4 md:px-8 pt-5 pb-28"
        aria-live="polite"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={containerV}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            {activeTab === "dashboard" ? (
              <DashboardPanel onSelectMeeting={setSelected} />
            ) : activeTab === "analytics" ? (
              <AnalyticsPanel />
            ) : (
              <ProfilePanel />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Bottom Nav — 3 items (Dashboard · Analytics · Profile) ── */}
      <motion.nav
        aria-label="Main navigation"
        role="tablist"
        className="fixed bottom-5 md:bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center p-1.5 gap-1"
        style={{
          background: isDark ? "rgba(22,11,36,0.88)" : "rgba(255,255,255,0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--border-medium)",
          borderRadius: "9999px",
          boxShadow: "var(--shadow-lg)",
        }}
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45, type: "spring", damping: 22 }}
      >
        {TABS.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tabPanelId}-panel`}
              onClick={() => setActiveTab(id)}
              aria-label={label}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-200"
              style={
                isActive
                  ? { background: "var(--teal)", color: "#fff", boxShadow: "0 2px 8px rgba(72,196,198,0.35)" }
                  : { color: "var(--text-muted)", background: "transparent" }
              }
            >
              <Icon size={15} aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </motion.nav>

      {/* ── Meeting detail modal ───────────────────────────────── */}
      <MeetingModal
        isOpen={!!selectedMeeting}
        onClose={() => setSelected(null)}
        meeting={selectedMeeting}
      />
    </div>
  );
}