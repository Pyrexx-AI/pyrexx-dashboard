"use client";

import { useState, useEffect, useId, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  LayoutDashboard, BarChart3, ChevronRight, CalendarCheck, Sparkles,
  CheckCircle2, Clock, AlertCircle, CalendarClock, TrendingUp, Zap, UserCircle2,
  Eye, ArrowLeft, Loader2, Inbox
} from "lucide-react";
import DonutChart from "./DonutChart";
import MeetingModal, { Meeting } from "./MeetingModal";
import ListModal from "./ListModal";
import LogoMark from "./LogoMark";
import AnalyticsPanel from "./AnalyticsPanel";
import ProfilePanel from "./ProfilePanel";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "./ui/ThemeToggle";
import type { DashboardMetrics, OutcomeCounts, ServiceBreakdownEntry } from "@/lib/dashboard/metrics";

const containerV: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, ease: "easeOut" } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 28 } },
};

const EMPTY_METRICS: DashboardMetrics = {
  range: "7D",
  totalCalls: 0,
  bookingsMade: 0,
  conversionRatePct: 0,
  pickupRatePct: 0,
  avgHandleTimeSeconds: 0,
  avgHandleTimeLabel: "0m 0s",
  trends: {
    totalCalls: { direction: "flat", label: "0%", positive: true },
    bookingsMade: { direction: "flat", label: "0%", positive: true },
    conversionRate: { direction: "flat", label: "0%", positive: true },
    pickupRate: { direction: "flat", label: "0%", positive: true },
    avgHandleTime: { direction: "flat", label: "0%", positive: true },
  },
  outcomes: { booked: 0, callback_requested: 0, escalated: 0, no_action: 0 },
  serviceBreakdown: [],
  volume: [],
  peakHours: [],
  topServices: [],
};

const INTENT_COLORS = ["var(--teal)", "var(--purple)", "#60A5FA", "#F59E0B", "#EC4899"];

function statusStyle(status: string) {
  switch (status) {
    case "Completed": return { bg: "var(--success-surface)", color: "var(--success-text)", Icon: CheckCircle2 };
    case "Scheduled": return { bg: "var(--purple-surface)",  color: "var(--purple-text)",  Icon: CalendarClock };
    case "Confirmed": return { bg: "var(--teal-surface)",    color: "var(--teal-text)",    Icon: CheckCircle2 };
    default:          return { bg: "var(--warning-surface)", color: "var(--warning-text)", Icon: AlertCircle };
  }
}

/**
 * Deduplicates and updates meeting records in place by matching ID.
 * Prevents multiple updates across call lifecycle events (started -> ended -> analyzed)
 * from rendering duplicated cards.
 */
function upsertMeeting(list: Meeting[], incoming: Meeting): Meeting[] {
  const existingIndex = list.findIndex(
    (m) => String(m.id) === String(incoming.id) || (m.name === incoming.name && m.time === incoming.time)
  );

  if (existingIndex >= 0) {
    const updated = [...list];
    updated[existingIndex] = { ...updated[existingIndex], ...incoming };
    return updated;
  }
  return [incoming, ...list];
}

function MeetingRow({ meeting, onSelect }: { meeting: Meeting; onSelect: (m: Meeting) => void }) {
  const { bg, color, Icon } = statusStyle(meeting.status);
  return (
    <button
      type="button"
      onClick={() => onSelect(meeting)}
      className="w-full text-left flex items-center gap-3 px-2 py-3 rounded-xl cursor-pointer group transition-colors"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
      onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <Icon size={14} style={{ color }} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{meeting.name}</p>
        <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
          {meeting.type}
          {meeting.bookedAt ? <span style={{ color: "var(--teal-text)" }}> · {meeting.bookedAt}</span> : <span> · {meeting.time}</span>}
        </p>
      </div>
      <ChevronRight size={13} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
    </button>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-6 text-center">
      <Inbox size={18} style={{ color: "var(--text-placeholder)" }} aria-hidden="true" />
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

function ListCard({ title, icon: Icon, iconBg, iconColor, meetings, loading, emptyLabel, onSelectMeeting, onViewAll }: any) {
  const preview = meetings.slice(0, 3);
  return (
    <motion.section variants={itemV} className="card p-4 md:p-5 flex flex-col gap-3">
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
          className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors rounded-lg px-2 py-1"
          style={{ color: iconColor, background: iconBg }}
        >
          View all <ChevronRight size={11} aria-hidden="true" />
        </button>
      </div>
      <div role="list" className="flex flex-col">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin" style={{ color: "var(--text-muted)" }} /></div>
        ) : preview.length === 0 ? (
          <EmptyRow label={emptyLabel} />
        ) : (
          preview.map((m: any) => <MeetingRow key={m.id} meeting={m} onSelect={onSelectMeeting} />)
        )}
      </div>
    </motion.section>
  );
}

function InsightsCard({ serviceBreakdown, loading }: { serviceBreakdown: ServiceBreakdownEntry[]; loading: boolean }) {
  const intents = serviceBreakdown.map((s, i) => ({ label: s.name, pct: s.value, color: INTENT_COLORS[i % INTENT_COLORS.length] }));
  return (
    <motion.section variants={itemV} className="card p-4 md:p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "var(--teal-surface)" }}>
          <Zap size={14} style={{ color: "var(--teal)" }} aria-hidden="true" />
        </div>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Call Intents</h2>
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin" style={{ color: "var(--text-muted)" }} /></div>
      ) : intents.length === 0 ? (
        <EmptyRow label="No calls yet this week" />
      ) : (
        <>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5" role="img" aria-label="Call intents breakdown bar">
            {intents.map((i) => (
              <div key={i.label} className="rounded-full" style={{ width: `${i.pct}%`, background: i.color }} />
            ))}
          </div>
          <ul className="space-y-2.5" role="list">
            {intents.map((i) => (
              <li key={i.label}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: i.color }} aria-hidden="true" />
                    <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{i.label}</span>
                  </div>
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: i.color }}>{i.pct}%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-sunken)" }}>
                  <motion.div className="h-full rounded-full" style={{ background: i.color }} initial={{ width: 0 }} animate={{ width: `${i.pct}%` }} transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </motion.section>
  );
}

function OutcomesCard({ outcomes, loading }: { outcomes: OutcomeCounts; loading: boolean }) {
  const outcomeList = [
    { label: "Appointment Booked",  count: outcomes.booked,             Icon: CheckCircle2, bg: "var(--success-surface)", color: "var(--success-text)" },
    { label: "Callback Requested",  count: outcomes.callback_requested, Icon: Clock,        bg: "var(--warning-surface)", color: "var(--warning-text)" },
    { label: "Escalated to Staff",  count: outcomes.escalated,          Icon: AlertCircle,  bg: "var(--info-surface)",    color: "var(--info-text)" },
  ];
  const total = outcomeList.reduce((s, o) => s + o.count, 0);
  return (
    <motion.section variants={itemV} className="card p-4 md:p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "var(--purple-surface)" }}>
          <TrendingUp size={14} style={{ color: "var(--purple)" }} aria-hidden="true" />
        </div>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Outcomes</h2>
        <span className="ml-auto text-xs font-semibold badge" style={{ background: "var(--bg-sunken)", color: "var(--text-muted)" }}>
          {total} this week
        </span>
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin" style={{ color: "var(--text-muted)" }} /></div>
      ) : total === 0 ? (
        <EmptyRow label="No outcomes recorded yet this week" />
      ) : (
        <ul className="space-y-3" role="list">
          {outcomeList.map(({ label, count, Icon, bg, color }) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
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
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-sunken)" }}>
                    <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}

function trendSubtitle(trend: { direction: "up" | "down" | "flat"; label: string }, suffix = "vs last wk"): string {
  if (trend.direction === "flat") return `No change ${suffix}`;
  const sign = trend.direction === "up" ? "+" : "-";
  return `${sign}${trend.label} ${suffix}`;
}

function DashboardPanel({
  onSelectMeeting,
  recentCalls,
  recentlyBooked,
  upcomingBookings,
  metrics,
  loadingSummary,
  loadingMetrics,
  hasClinic,
}: {
  onSelectMeeting: (m: Meeting) => void;
  recentCalls: Meeting[];
  recentlyBooked: Meeting[];
  upcomingBookings: Meeting[];
  metrics: DashboardMetrics;
  loadingSummary: boolean;
  loadingMetrics: boolean;
  hasClinic: boolean;
}) {
  const [openList, setOpenList] = useState<"recent" | "booked" | "upcoming" | null>(null);

  if (!hasClinic) {
    return (
      <div className="card p-10 flex flex-col items-center justify-center text-center gap-2">
        <Inbox size={28} style={{ color: "var(--text-placeholder)" }} aria-hidden="true" />
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>No clinic linked to this account yet</p>
        <p className="text-xs max-w-sm" style={{ color: "var(--text-muted)" }}>
          Once your account is linked to a clinic, your call activity and analytics will appear here. Check the Profile tab, or contact Pyrexx support.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      {/* Main Stage (8 Cols on Desktop) */}
      <div className="xl:col-span-8 flex flex-col gap-5">
        <motion.div variants={itemV} className="grid grid-cols-3 gap-3 md:gap-4">
          <DonutChart
            title="Pickup Rate"
            value={loadingMetrics ? "--" : `${metrics.pickupRatePct.toFixed(1)}%`}
            percentage={loadingMetrics ? 0 : metrics.pickupRatePct}
            subtitle={loadingMetrics ? "Loading…" : trendSubtitle(metrics.trends.pickupRate)}
            trend={loadingMetrics ? undefined : { direction: metrics.trends.pickupRate.direction, label: metrics.trends.pickupRate.label }}
          />
          <DonutChart
            title="Conversion"
            value={loadingMetrics ? "--" : `${metrics.conversionRatePct.toFixed(1)}%`}
            percentage={loadingMetrics ? 0 : metrics.conversionRatePct}
            subtitle={loadingMetrics ? "Loading…" : trendSubtitle(metrics.trends.conversionRate)}
            trend={loadingMetrics ? undefined : { direction: metrics.trends.conversionRate.direction, label: metrics.trends.conversionRate.label }}
          />
          <DonutChart
            title="Total Calls"
            value={loadingMetrics ? "--" : metrics.totalCalls.toLocaleString()}
            percentage={loadingMetrics || metrics.totalCalls === 0 ? 0 : 100}
            subtitle={loadingMetrics ? "Loading…" : `${metrics.totalCalls} this week`}
            trend={loadingMetrics ? undefined : { direction: metrics.trends.totalCalls.direction, label: metrics.trends.totalCalls.label }}
          />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ListCard title="Recent Calls" icon={CalendarCheck} iconBg="var(--teal-surface)" iconColor="var(--teal-text)" meetings={recentCalls} loading={loadingSummary} emptyLabel="No calls yet" onSelectMeeting={onSelectMeeting} onViewAll={() => setOpenList("recent")} />
          <ListCard title="Recently Booked" icon={Sparkles} iconBg="var(--purple-surface)" iconColor="var(--purple-text)" meetings={recentlyBooked} loading={loadingSummary} emptyLabel="No bookings yet" onSelectMeeting={onSelectMeeting} onViewAll={() => setOpenList("booked")} />
        </div>

        <InsightsCard serviceBreakdown={metrics.serviceBreakdown} loading={loadingMetrics} />
      </div>

      {/* Command Rail (4 Cols on Desktop) */}
      <div className="xl:col-span-4 flex flex-col gap-5">
        <ListCard title="Upcoming" icon={CalendarClock} iconBg="var(--info-surface)" iconColor="var(--info-text)" meetings={upcomingBookings} loading={loadingSummary} emptyLabel="No upcoming appointments" onSelectMeeting={onSelectMeeting} onViewAll={() => setOpenList("upcoming")} />
        <OutcomesCard outcomes={metrics.outcomes} loading={loadingMetrics} />
      </div>

      <ListModal isOpen={openList === "recent"} onClose={() => setOpenList(null)} title="Recent Calls" subtitle="All completed AI calls" meetings={recentCalls} onSelectMeeting={onSelectMeeting} variant="recent" />
      <ListModal isOpen={openList === "booked"} onClose={() => setOpenList(null)} title="Recently Booked" subtitle="Bookings captured by AI" meetings={recentlyBooked} onSelectMeeting={onSelectMeeting} variant="booked" />
      <ListModal isOpen={openList === "upcoming"} onClose={() => setOpenList(null)} title="Upcoming Appointments" subtitle="Scheduled via AI receptionist" meetings={upcomingBookings} onSelectMeeting={onSelectMeeting} variant="upcoming" />
    </div>
  );
}

const TABS = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "analytics", icon: BarChart3, label: "Analytics" },
  { id: "profile", icon: UserCircle2, label: "Profile" },
];

export interface DashboardHomeProps {
  initialClinicId?: string;
  isAdmin: boolean;
  isInspectionMode?: boolean;
  previewClinicId?: string;
  clinicName?: string;
  userEmail?: string;
  initialTab?: string;
}

export default function DashboardHome({
  initialClinicId,
  isAdmin,
  isInspectionMode = false,
  previewClinicId,
  clinicName,
  userEmail,
  initialTab = "dashboard",
}: DashboardHomeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") || initialTab);
  const [selectedMeeting, setSelected] = useState<Meeting | null>(null);
  const [mounted, setMounted] = useState(false);

  const [recentCalls, setRecentCalls] = useState<Meeting[]>([]);
  const [recentlyBooked, setRecentlyBooked] = useState<Meeting[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Meeting[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY_METRICS);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  const tabPanelId = useId();

  const fetchSummary = useCallback(async (clinicId: string) => {
    setLoadingSummary(true);
    try {
      const res = await fetch(`/api/dashboard/summary?clinicId=${encodeURIComponent(clinicId)}`);
      if (res.ok) {
        const json = await res.json();
        setRecentCalls(json.recentCalls ?? []);
        setRecentlyBooked(json.recentlyBooked ?? []);
        setUpcomingBookings(json.upcomingBookings ?? []);
      } else {
        console.error("Failed to load dashboard summary:", await res.text());
      }
    } catch (err) {
      console.error("Failed to load dashboard summary:", err);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const fetchMetrics = useCallback(async (clinicId: string) => {
    setLoadingMetrics(true);
    try {
      const res = await fetch(`/api/dashboard/metrics?clinicId=${encodeURIComponent(clinicId)}&range=7D`);
      if (res.ok) {
        const json = await res.json();
        setMetrics(json);
      } else {
        console.error("Failed to load dashboard metrics:", await res.text());
      }
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);

    if (!initialClinicId) {
      setLoadingSummary(false);
      setLoadingMetrics(false);
      return;
    }

    fetchSummary(initialClinicId);
    fetchMetrics(initialClinicId);

    const supabase = createClient();
    const channel = supabase
      .channel(`public:call_records:${initialClinicId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_records",
          filter: `clinic_id=eq.${initialClinicId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (!row || !row.id) return;

          // Format meeting item with real call ID
          const incomingMeeting: Meeting = {
            id: row.id,
            name: row.patient_name || "Unknown Caller",
            type: row.service_type || "General Inquiry",
            time: row.booking_time
              ? new Date(row.booking_time).toLocaleString("en-US", {
                  weekday: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "Just now",
            status: row.status || "Completed",
            transcriptPreview: row.transcript_preview || undefined,
            bookedAt: row.outcome === "booked" ? "just now" : undefined,
          };

          // Deterministic in-place update or prepend
          setRecentCalls((prev) => upsertMeeting(prev, incomingMeeting));

          if (row.outcome === "booked") {
            setRecentlyBooked((prev) => upsertMeeting(prev, incomingMeeting));
          }

          if (row.booking_time && new Date(row.booking_time) >= new Date()) {
            setUpcomingBookings((prev) => upsertMeeting(prev, incomingMeeting));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialClinicId, fetchSummary, fetchMetrics]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="min-h-screen font-sans dashboard-bg flex flex-col">
      {/* Admin Inspection Banner */}
      {isAdmin && isInspectionMode && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md z-40 relative">
          <div className="flex items-center gap-2">
            <Eye size={16} />
            <span>
              Admin Inspection Mode: Viewing live dashboard for <strong>{clinicName || previewClinicId}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="flex items-center gap-1 bg-slate-950 text-white px-3 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={12} /> Return to Admin Command Center
          </button>
        </div>
      )}

      {/* Header */}
      <motion.header
        className="sticky top-0 z-30 px-4 md:px-8 py-3 md:py-4 flex items-center gap-3"
        style={{
          background: isDark ? "rgba(13,8,24,0.85)" : "rgba(248,250,252,0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <LogoMark size={36} />
          <div>
            <h1 className="text-base md:text-lg font-extrabold leading-tight tracking-tight" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: "var(--teal)" }}>Pyrexx</span> AI
            </h1>
            <p className="text-[10px] hidden sm:block font-medium leading-tight" style={{ color: "var(--text-muted)" }}>
              {clinicName ? `${clinicName} · AI Receptionist` : "AI Receptionist"}
            </p>
          </div>
        </div>

        {/* Desktop Header Navigation Tabs */}
        <div className="hidden lg:flex items-center gap-1 mx-auto bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-full border border-slate-300/40 dark:border-slate-700/40">
          {TABS.map(({ id, icon: Icon, label }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTabChange(id)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
                style={
                  isActive
                    ? { background: "var(--teal)", color: "#fff", boxShadow: "0 2px 8px rgba(72,196,198,0.3)" }
                    : { color: "var(--text-muted)", background: "transparent" }
                }
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <ThemeToggle />
        </div>
      </motion.header>

      {/* Main Workspace */}
      <main id={`${tabPanelId}-panel`} className="flex-1 px-4 md:px-8 max-w-7xl mx-auto w-full pt-5 pb-28 lg:pb-12">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} variants={containerV} initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.1 } }}>
            {activeTab === "dashboard" ? (
              <DashboardPanel
                onSelectMeeting={setSelected}
                recentCalls={recentCalls}
                recentlyBooked={recentlyBooked}
                upcomingBookings={upcomingBookings}
                metrics={metrics}
                loadingSummary={loadingSummary}
                loadingMetrics={loadingMetrics}
                hasClinic={!!initialClinicId}
              />
            ) : activeTab === "analytics" ? (
              <AnalyticsPanel clinicId={initialClinicId} />
            ) : (
              <ProfilePanel
                clinicId={initialClinicId}
                isAdmin={isAdmin}
                isInspectionMode={isInspectionMode}
                userEmail={userEmail}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Bottom Nav (Mobile/Tablet display only) */}
      <motion.nav
        className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center p-1.5 gap-1"
        style={{
          background: isDark ? "rgba(22,11,36,0.90)" : "rgba(255,255,255,0.90)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--border-medium)",
          borderRadius: "9999px",
          boxShadow: "var(--shadow-lg)",
        }}
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", damping: 22 }}
      >
        {TABS.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleTabChange(id)}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-200"
              style={isActive ? { background: "var(--teal)", color: "#fff", boxShadow: "0 2px 8px rgba(72,196,198,0.35)" } : { color: "var(--text-muted)", background: "transparent" }}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </motion.nav>

      <MeetingModal isOpen={!!selectedMeeting} onClose={() => setSelected(null)} meeting={selectedMeeting} />
    </div>
  );
}