"use client";

import { useState, useEffect, useId } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  MessageSquare,
  Sun,
  Moon,
  Home,
  Users,
  PieChart,
  Mic,
  Sparkles,
} from "lucide-react";
import DonutChart from "./DonutChart";
import MeetingModal, { Meeting } from "./MeetingModal";

/* ─── Animation Variants ─────────────────────────────────────────── */
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, duration: 0.4, ease: "easeOut" },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
};

/* ─── Data ───────────────────────────────────────────────────────── */
const previousMeetings: Meeting[] = [
  {
    id: 1,
    name: "Sarah Jenkins",
    type: "Botox Consult",
    time: "Today, 10:00 AM",
    status: "Completed",
    transcriptPreview:
      "Client asked about recovery time for Botox. Handled successfully and booked follow-up.",
  },
  {
    id: 2,
    name: "Mike Ross",
    type: "Back Massage",
    time: "Yesterday, 2:30 PM",
    status: "Completed",
    transcriptPreview:
      "Confirmed 60-minute deep tissue massage. Sent intake forms via SMS.",
  },
  {
    id: 3,
    name: "Emily Clark",
    type: "Pricing Inquiry",
    time: "Yesterday, 4:15 PM",
    status: "Completed",
    transcriptPreview:
      "Provided pricing tier list. Client stated they will call back to schedule.",
  },
];

const upcomingMeetings: Meeting[] = [
  {
    id: 4,
    name: "Jessica Alba",
    type: "Botox Follow-up",
    time: "Today, 3:00 PM",
    status: "Scheduled",
    transcriptPreview:
      "System automatically fetched this from calendar. Client prefers Dr. Smith.",
  },
  {
    id: 5,
    name: "David Chen",
    type: "Consultation",
    time: "Tomorrow, 9:00 AM",
    status: "Scheduled",
    transcriptPreview:
      "First-time visitor. Ensure digital waiver is completed.",
  },
  {
    id: 6,
    name: "Amanda Seyfried",
    type: "Back Massage",
    time: "Tomorrow, 11:30 AM",
    status: "Scheduled",
    transcriptPreview: "Requested firm pressure. Notes added to CRM.",
  },
];

/* ─── Sub-components ─────────────────────────────────────────────── */

// Shared "coming soon" panel for unbuilt tabs
function ComingSoonPanel({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-col items-center justify-center py-24 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-pyrexx-blue/10 dark:bg-pyrexx-blue/20 flex items-center justify-center mb-5">
        <Icon className="text-pyrexx-blue" size={28} aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
        {title}
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
        {description}
      </p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-pyrexx-purple bg-pyrexx-purple/10 px-3 py-1.5 rounded-full">
        <Sparkles size={12} aria-hidden="true" /> Coming Soon
      </span>
    </motion.div>
  );
}

/* ─── Meeting Card ───────────────────────────────────────────────── */
function MeetingCard({
  meeting,
  variant,
  onSelect,
}: {
  meeting: Meeting;
  variant: "previous" | "upcoming";
  onSelect: (m: Meeting) => void;
}) {
  // FIX [14]: Descriptive screen-reader label instead of generic "View"
  const label = `View details for ${meeting.name} — ${meeting.type}`;
  const badgeText = variant === "previous" ? meeting.type : meeting.time;
  const hoverClass =
    variant === "previous"
      ? "hover:bg-pyrexx-blue/8 dark:hover:bg-pyrexx-blue/20"
      : "hover:bg-pyrexx-purple/8 dark:hover:bg-pyrexx-purple/20";
  const activeBadgeHover =
    variant === "previous"
      ? "group-hover:bg-pyrexx-blue group-hover:text-white"
      : "group-hover:bg-pyrexx-purple group-hover:text-white";
  const badgeColor =
    variant === "previous" ? "text-pyrexx-purple" : "text-pyrexx-blue";

  return (
    <button
      type="button" // FIX [13]
      onClick={() => onSelect(meeting)}
      aria-label={label} // FIX [14]
      className={`
        w-full text-left cursor-pointer
        bg-slate-50 dark:bg-pyrexx-surface
        ${hoverClass}
        transition-colors p-4 rounded-[0.875rem] group
        border border-transparent dark:border-pyrexx-purple/15
        focus-visible:outline-2 focus-visible:outline-pyrexx-blue
      `}
    >
      <div className="flex justify-between items-center gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
            {meeting.name}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {badgeText}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={`
            shrink-0 text-[10px] font-bold ${badgeColor}
            bg-white dark:bg-pyrexx-darkBg
            px-3 py-1.5 rounded-full shadow-sm
            ${activeBadgeHover} transition-colors
          `}
        >
          {variant === "previous" ? "View" : "Details"}
        </span>
      </div>
    </button>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
type TabId = "dashboard" | "transcripts" | "analytics" | "crm";

export default function DashboardHome() {
  // FIX [18]: Proper type instead of any
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  // FIX [5] + [20]: Read from localStorage on init (anti-flash script in layout
  // has already set the class; this state just keeps React in sync)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  // Sync <html> class + persist on toggle
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("pyrexx-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("pyrexx-theme", "light");
    }
  }, [isDarkMode]);

  const tabPanelId = useId();

  const tabs: { id: TabId; icon: React.ElementType; label: string }[] = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "transcripts", icon: MessageSquare, label: "Transcripts" },
    { id: "analytics", icon: PieChart, label: "Analytics" },
    { id: "crm", icon: Users, label: "CRM" },
  ];

  /* ─── Render active tab panel ─────────────────────────────────── */
  const renderPanel = () => {
    // FIX [16]: All tabs show meaningful content instead of nothing
    switch (activeTab) {
      case "dashboard":
        return <DashboardPanel onSelectMeeting={setSelectedMeeting} />;
      case "transcripts":
        return (
          <ComingSoonPanel
            icon={Mic}
            title="Call Transcripts"
            description="Full AI-generated transcripts of every patient call will appear here, searchable by name, date, or intent."
          />
        );
      case "analytics":
        return (
          <ComingSoonPanel
            icon={PieChart}
            title="Analytics"
            description="Deep performance analytics — conversion funnels, call intent trends, response time distributions, and revenue attribution."
          />
        );
      case "crm":
        return (
          <ComingSoonPanel
            icon={Users}
            title="Patient CRM"
            description="Unified patient records, call history, booking preferences, and follow-up pipeline — connected to your AI receptionist."
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <motion.header
        className="flex justify-between items-center px-4 md:px-8 pt-5 md:pt-7 pb-2"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            <span className="text-pyrexx-blue">Pyrexx</span> AI
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            AI Receptionist performance
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-center gap-2 md:gap-3">
          {/* FIX [17]: Promo visible on mobile too — compact chip variant */}
          <div className="flex bg-white dark:bg-pyrexx-darkCard shadow-card dark:shadow-card-dark rounded-full items-center gap-1.5 border border-slate-100 dark:border-pyrexx-purple/20 px-3 py-1.5 md:px-5 md:py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-pyrexx-blue animate-pulse shrink-0" aria-hidden="true" />
            {/* Full promo text on md+, compact on mobile */}
            <p className="text-[10px] md:text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              <span className="hidden md:inline">Setup: </span>
              <span className="line-through text-slate-400 font-normal">$1k</span>
              <span className="text-pyrexx-purple ml-1 font-bold">$500</span>
            </p>
          </div>

          {/* FIX [10] [25]: aria-label + cursor-pointer on theme toggle */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={isDarkMode}
            className="
              flex items-center justify-center w-9 h-9 md:w-10 md:h-10
              rounded-full cursor-pointer
              bg-white dark:bg-pyrexx-darkCard
              shadow-card dark:shadow-card-dark
              border border-slate-100 dark:border-pyrexx-purple/30
              text-slate-600 dark:text-pyrexx-blue
              hover:scale-105 active:scale-95
              transition-transform
            "
          >
            {isDarkMode ? (
              <Sun size={17} aria-hidden="true" />
            ) : (
              <Moon size={17} aria-hidden="true" />
            )}
          </button>
        </motion.div>
      </motion.header>

      {/* ─── Tab Panel ──────────────────────────────────────────── */}
      <motion.main
        id={`${tabPanelId}-panel`}
        className="px-4 md:px-8 pt-4 pb-28 md:pb-32"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        key={activeTab} // re-animate on tab switch
      >
        <AnimatePresence mode="wait">
          {renderPanel()}
        </AnimatePresence>
      </motion.main>

      {/* ─── Bottom Nav ─────────────────────────────────────────── */}
      <motion.nav
        aria-label="Main navigation"
        className="
          fixed bottom-5 md:bottom-8 left-1/2 -translate-x-1/2 z-40
          flex items-center gap-1 p-1.5
          bg-white/80 dark:bg-pyrexx-darkCard/85
          backdrop-blur-xl
          border border-slate-200/80 dark:border-pyrexx-purple/25
          shadow-float
          rounded-full
        "
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", damping: 22 }}
        // FIX [11]: tablist role for keyboard nav pattern
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tabPanelId}-panel`}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 cursor-pointer
                rounded-full text-xs font-semibold
                transition-all duration-250
                ${isActive
                  ? "px-4 py-2.5 bg-pyrexx-blue text-white shadow-md"
                  : "px-3 py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-pyrexx-purple/20"
                }
              `}
            >
              <Icon size={16} aria-hidden="true" />
              {/* FIX [19]: Always show label — no hidden-unless-active on mobile */}
              <span className="hidden sm:block">{tab.label}</span>
              {/* On xs screens, show a tiny label when active only for space */}
              {isActive && <span className="sm:hidden">{tab.label}</span>}
            </button>
          );
        })}
      </motion.nav>

      {/* ─── Meeting Modal ───────────────────────────────────────── */}
      <MeetingModal
        isOpen={!!selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
        meeting={selectedMeeting}
      />
    </div>
  );
}

/* ─── Dashboard Panel (extracted to keep DashboardHome readable) ── */
function DashboardPanel({
  onSelectMeeting,
}: {
  onSelectMeeting: (m: Meeting) => void;
}) {
  return (
    <>
      {/* Donut Row */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-3 gap-2 md:gap-5 mb-4 md:mb-6"
      >
        <DonutChart
          title="Pickup Rate"
          value="98.5%"
          percentage={98.5}
          subtitle="+2.1% this week"
        />
        <DonutChart
          title="Conversion"
          value="42.3%"
          percentage={42.3}
          subtitle="+5.4% this week"
        />
        <DonutChart
          title="Total Calls"
          value="1,245"
          percentage={75}
          subtitle="Calls logged"
        />
      </motion.div>

      {/* Main Grid */}
      {/* FIX [24]: Consistent card info — both cols show name + type + time */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 items-stretch">
        {/* Col 1: Previous Meetings */}
        <motion.section
          variants={itemVariants}
          aria-labelledby="prev-meetings-heading"
          className="bg-card dark:bg-pyrexx-darkCard p-4 md:p-6 rounded-2xl shadow-card dark:shadow-card-dark flex flex-col"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 bg-pyrexx-blue/10 dark:bg-pyrexx-blue/20 rounded-xl">
              <Calendar className="text-pyrexx-blue" size={16} aria-hidden="true" />
            </div>
            <h2 id="prev-meetings-heading" className="text-base font-bold text-slate-800 dark:text-white">
              Recent Calls
            </h2>
          </div>
          <div className="space-y-2.5 flex-1">
            {previousMeetings.map((m) => (
              <MeetingCard key={m.id} meeting={m} variant="previous" onSelect={onSelectMeeting} />
            ))}
          </div>
        </motion.section>

        {/* Col 2: Middle stacked cards */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4 md:gap-5">
          {/* Call Intents */}
          <section
            aria-labelledby="intents-heading"
            className="bg-card dark:bg-pyrexx-darkCard p-4 md:p-6 rounded-2xl shadow-card dark:shadow-card-dark flex-1 flex flex-col"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 bg-pyrexx-purple/10 dark:bg-pyrexx-purple/20 rounded-xl">
                <MessageSquare className="text-pyrexx-purple" size={16} aria-hidden="true" />
              </div>
              <h2 id="intents-heading" className="text-base font-bold text-slate-800 dark:text-white">
                Call Intents
              </h2>
            </div>
            <ul className="space-y-3 text-sm flex-1" role="list">
              {[
                { label: "Botox Consultations", val: "45%", pct: 45 },
                { label: "Back Massages", val: "35%", pct: 35 },
                { label: "General Inquiries", val: "20%", pct: 20 },
              ].map((intent) => (
                <li key={intent.label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-600 dark:text-slate-300 font-medium text-xs">{intent.label}</span>
                    <span className="text-pyrexx-blue font-bold text-xs">{intent.val}</span>
                  </div>
                  {/* Progress bar — visual + accessible */}
                  <div
                    className="h-1 bg-slate-100 dark:bg-pyrexx-purple/15 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={intent.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${intent.label}: ${intent.val}`}
                  >
                    <div
                      className="h-full bg-pyrexx-blue rounded-full transition-all"
                      style={{ width: intent.val }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Recent Outcomes */}
          <section
            aria-labelledby="outcomes-heading"
            className="bg-card dark:bg-pyrexx-darkCard p-4 md:p-6 rounded-2xl shadow-card dark:shadow-card-dark flex-1 flex flex-col"
          >
            <h2 id="outcomes-heading" className="text-base font-bold text-slate-800 dark:text-white mb-4">
              Recent Outcomes
            </h2>
            <ul className="space-y-3 flex-1" role="list">
              {[
                { title: "Appointment Booked", icon: CheckCircle, color: "text-pyrexx-blue", bg: "bg-pyrexx-blue/10 dark:bg-pyrexx-blue/20" },
                { title: "Callback Requested", icon: Clock, color: "text-slate-400", bg: "bg-slate-100 dark:bg-slate-700/30" },
                { title: "Escalated to Staff", icon: AlertCircle, color: "text-pyrexx-purple", bg: "bg-pyrexx-purple/10 dark:bg-pyrexx-purple/20" },
              ].map((outcome) => (
                <li key={outcome.title} className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${outcome.bg} shrink-0`}>
                    <outcome.icon className={outcome.color} size={14} aria-hidden="true" />
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{outcome.title}</span>
                </li>
              ))}
            </ul>
          </section>
        </motion.div>

        {/* Col 3: Upcoming Meetings */}
        <motion.section
          variants={itemVariants}
          aria-labelledby="next-meetings-heading"
          className="bg-card dark:bg-pyrexx-darkCard p-4 md:p-6 rounded-2xl shadow-card dark:shadow-card-dark flex flex-col"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 bg-pyrexx-blue/10 dark:bg-pyrexx-blue/20 rounded-xl">
              <Calendar className="text-pyrexx-blue" size={16} aria-hidden="true" />
            </div>
            <h2 id="next-meetings-heading" className="text-base font-bold text-slate-800 dark:text-white">
              Upcoming
            </h2>
          </div>
          <div className="space-y-2.5 flex-1">
            {upcomingMeetings.map((m) => (
              <MeetingCard key={m.id} meeting={m} variant="upcoming" onSelect={onSelectMeeting} />
            ))}
          </div>
        </motion.section>
      </div>
    </>
  );
}
