"use client";

import { useState, useEffect, useId } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  LayoutDashboard, BarChart3, ChevronRight, CalendarCheck, Sparkles,
  CheckCircle2, Clock, AlertCircle, CalendarClock, TrendingUp, Zap, UserCircle2,
} from "lucide-react";
import DonutChart from "./DonutChart";
import MeetingModal, { Meeting } from "./MeetingModal";
import ListModal from "./ListModal";
import LogoMark from "./LogoMark";
import AnalyticsPanel from "./AnalyticsPanel";
import ProfilePanel from "./ProfilePanel";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "./ui/ThemeToggle";

const containerV: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, ease: "easeOut" } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
};

/* ─── Mock Initial Data ─────────────────────────────────────────── */
const initialRecentCalls: Meeting[] = [
  { id: 1, name: "Sarah Jenkins",  type: "Botox Consult",    time: "Today, 10:00 AM",    status: "Completed", transcriptPreview: "Client asked about recovery time. AI explained 24-48h, booked follow-up." },
  { id: 2, name: "Mike Ross",      type: "Back Massage",     time: "Yesterday, 2:30 PM", status: "Completed", transcriptPreview: "60-min deep tissue confirmed. Intake forms sent via SMS." },
  { id: 3, name: "Emily Clark",    type: "Pricing Inquiry",  time: "Yesterday, 4:15 PM", status: "Completed", transcriptPreview: "Provided tier pricing. Client will call back to schedule." },
];

const initialRecentlyBooked: Meeting[] = [
  { id: 6,  name: "Rachel Green",   type: "Microneedling",  time: "Today, 3:30 PM",    status: "Confirmed", bookedAt: "just now",   transcriptPreview: "New client. AI collected intake info and sent confirmation SMS." },
  { id: 7,  name: "Tom Harrington", type: "LED Therapy",    time: "Tomorrow, 2:00 PM", status: "Confirmed", bookedAt: "12 min ago", transcriptPreview: "Returning client. AI offered preferred time slot automatically." },
];

const initialUpcomingBookings: Meeting[] = [
  { id: 11, name: "Jessica Alba",    type: "Botox Follow-up", time: "Today, 3:00 PM",    status: "Scheduled", transcriptPreview: "Prefers Dr. Smith. VIP note added to CRM." },
  { id: 12, name: "David Chen",      type: "Consultation",    time: "Tomorrow, 9:00 AM", status: "Scheduled", transcriptPreview: "First visit. Waiver must be completed before arrival." },
];

function statusStyle(status: string) {
  switch (status) {
    case "Completed": return { bg: "var(--success-surface)", color: "var(--success-text)", Icon: CheckCircle2 };
    case "Scheduled": return { bg: "var(--purple-surface)",  color: "var(--purple-text)",  Icon: CalendarClock };
    case "Confirmed": return { bg: "var(--teal-surface)",    color: "var(--teal-text)",    Icon: CheckCircle2 };
    default:          return { bg: "var(--warning-surface)", color: "var(--warning-text)", Icon: AlertCircle };
  }
}

function MeetingRow({ meeting, onSelect }: { meeting: Meeting; onSelect: (m: Meeting) => void }) {
  const { bg, color, Icon } = statusStyle(meeting.status);
  return (
    <button type="button" onClick={() => onSelect(meeting)} className="w-full text-left flex items-center gap-3 px-1 py-2.5 rounded-xl cursor-pointer group transition-colors" style={{ borderBottom: "1px solid var(--border-subtle)" }} onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")} onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}><Icon size={12} style={{ color }} aria-hidden="true" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{meeting.name}</p>
        <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{meeting.type}{meeting.bookedAt ? <span style={{ color: "var(--teal-text)" }}> · {meeting.bookedAt}</span> : <span> · {meeting.time}</span>}</p>
      </div>
      <ChevronRight size={12} className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
    </button>
  );
}

function ListCard({ title, icon: Icon, iconBg, iconColor, meetings, onSelectMeeting, onViewAll }: any) {
  const preview = meetings.slice(0, 3);
  return (
    <motion.section variants={itemV} className="card p-4 md:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: iconBg }}><Icon size={14} style={{ color: iconColor }} aria-hidden="true" /></div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{title}</h2>
        </div>
        <button type="button" onClick={onViewAll} className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors rounded-lg px-2 py-1" style={{ color: iconColor, background: iconBg }}>
          View all <ChevronRight size={11} aria-hidden="true" />
        </button>
      </div>
      <div role="list" className="flex flex-col">{preview.map((m: any) => (<MeetingRow key={m.id} meeting={m} onSelect={onSelectMeeting} />))}</div>
    </motion.section>
  );
}

function DashboardPanel({ 
  onSelectMeeting, recentCalls, recentlyBooked, upcomingBookings 
}: { 
  onSelectMeeting: (m: Meeting) => void;
  recentCalls: Meeting[];
  recentlyBooked: Meeting[];
  upcomingBookings: Meeting[];
}) {
  const [openList, setOpenList] = useState<"recent" | "booked" | "upcoming" | null>(null);
  return (
    <>
      <motion.div variants={itemV} className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-5">
        <DonutChart title="Pickup Rate" value="98.5%" percentage={98.5} subtitle="+2.1% vs last wk" trend={{ direction: "up", label: "2.1%" }} />
        <DonutChart title="Conversion" value="42.3%" percentage={42.3} subtitle="+5.4% vs last wk" trend={{ direction: "up", label: "5.4%" }} />
        <DonutChart title="Total Calls" value="1,245" percentage={75} subtitle="245 this week" trend={{ direction: "up", label: "12%" }} />
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-4 mb-4 md:mb-5">
        <ListCard title="Recent Calls" icon={CalendarCheck} iconBg="var(--teal-surface)" iconColor="var(--teal-text)" meetings={recentCalls} onSelectMeeting={onSelectMeeting} onViewAll={() => setOpenList("recent")} />
        <ListCard title="Recently Booked" icon={Sparkles} iconBg="var(--purple-surface)" iconColor="var(--purple-text)" meetings={recentlyBooked} onSelectMeeting={onSelectMeeting} onViewAll={() => setOpenList("booked")} />
        <ListCard title="Upcoming" icon={CalendarClock} iconBg="var(--info-surface)" iconColor="var(--info-text)" meetings={upcomingBookings} onSelectMeeting={onSelectMeeting} onViewAll={() => setOpenList("upcoming")} />
      </div>
      <ListModal isOpen={openList === "recent"} onClose={() => setOpenList(null)} title="Recent Calls" subtitle="All completed AI calls" meetings={recentCalls} onSelectMeeting={onSelectMeeting} variant="recent" />
      <ListModal isOpen={openList === "booked"} onClose={() => setOpenList(null)} title="Recently Booked" subtitle="Bookings captured by AI" meetings={recentlyBooked} onSelectMeeting={onSelectMeeting} variant="booked" />
      <ListModal isOpen={openList === "upcoming"} onClose={() => setOpenList(null)} title="Upcoming Appointments" subtitle="Scheduled via AI receptionist" meetings={upcomingBookings} onSelectMeeting={onSelectMeeting} variant="upcoming" />
    </>
  );
}

const TABS = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "analytics", icon: BarChart3, label: "Analytics" },
  { id: "profile", icon: UserCircle2, label: "Profile" },
];

export default function DashboardHome() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  
  const activeTab = searchParams.get("tab") || "dashboard";
  
  const [selectedMeeting, setSelected] = useState<Meeting | null>(null);
  const [clinicId, setClinicId] = useState<string | undefined>();
  const [mounted, setMounted] = useState(false);
  
  const [recentCalls, setRecentCalls] = useState<Meeting[]>(initialRecentCalls);
  const [recentlyBooked, setRecentlyBooked] = useState<Meeting[]>(initialRecentlyBooked);
  const [upcomingBookings, setUpcomingBookings] = useState<Meeting[]>(initialUpcomingBookings);

  const tabPanelId = useId();

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();

    async function fetchUserContext() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profile?.clinic_id) {
          setClinicId(profile.clinic_id);

          // Supabase Realtime Subscription on call_records
          const channel = supabase
            .channel(`public:call_records:${profile.clinic_id}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "call_records", filter: `clinic_id=eq.${profile.clinic_id}` },
              (payload) => {
                const row = payload.new as any;
                if (!row) return;

                const newMeeting: Meeting = {
                  id: Date.now(),
                  name: row.patient_name || "Unknown Caller",
                  type: row.service_type || "General Inquiry",
                  time: "Just now",
                  status: row.status || "Completed",
                  transcriptPreview: row.transcript_preview || undefined,
                  bookedAt: row.outcome === "booked" ? "just now" : undefined,
                };

                setRecentCalls((prev) => [newMeeting, ...prev]);
                if (row.outcome === "booked") {
                  setRecentlyBooked((prev) => [newMeeting, ...prev]);
                }
              }
            )
            .subscribe();

          return () => {
            supabase.removeChannel(channel);
          };
        }
      }
    }
    fetchUserContext();
  }, []);

  const handleTabChange = (tabId: string) => {
    router.replace(`${pathname}?tab=${tabId}`, { scroll: false });
  };

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="min-h-screen font-sans dashboard-bg">
      <motion.header
        className="sticky top-0 z-30 px-4 md:px-8 py-3 md:py-4 flex items-center gap-3"
        style={{
          background: isDark ? "rgba(13,8,24,0.80)" : "rgba(248,250,252,0.80)",
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
            <p className="text-[10px] hidden sm:block font-medium leading-tight" style={{ color: "var(--text-muted)" }}>AI Receptionist</p>
          </div>
        </div>
        <div className="flex-1" />
        <ThemeToggle />
      </motion.header>

      <main id={`${tabPanelId}-panel`} className="px-4 md:px-8 pt-5 pb-28">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} variants={containerV} initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.1 } }}>
            {activeTab === "dashboard" ? (
              <DashboardPanel 
                onSelectMeeting={setSelected}
                recentCalls={recentCalls}
                recentlyBooked={recentlyBooked}
                upcomingBookings={upcomingBookings}
              />
            ) : activeTab === "analytics" ? (
              <AnalyticsPanel />
            ) : (
              <ProfilePanel clinicId={clinicId} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <motion.nav
        className="fixed bottom-5 md:bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center p-1.5 gap-1"
        style={{
          background: isDark ? "rgba(22,11,36,0.88)" : "rgba(255,255,255,0.88)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--border-medium)",
          borderRadius: "9999px",
          boxShadow: "var(--shadow-lg)",
        }}
        initial={{ y: 48, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45, type: "spring", damping: 22 }}
      >
        {TABS.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button key={id} onClick={() => handleTabChange(id)} className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-200" style={isActive ? { background: "var(--teal)", color: "#fff", boxShadow: "0 2px 8px rgba(72,196,198,0.35)" } : { color: "var(--text-muted)", background: "transparent" }}>
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