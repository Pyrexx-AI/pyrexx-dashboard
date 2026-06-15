"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Phone, CalendarCheck2, Percent, Timer,
  TrendingUp, TrendingDown, Minus,
  Activity, PieChart as PieChartIcon, ListOrdered,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

/* ─── Variants ──────────────────────────────────────────────────── */
const containerV: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, ease: "easeOut" } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
};

/* ─── Types ─────────────────────────────────────────────────────── */
type Range = "7D" | "30D" | "90D";
const RANGES: Range[] = ["7D", "30D", "90D"];

interface TrendInfo {
  direction: "up" | "down" | "flat";
  label: string;
  positive: boolean; // does this direction represent a GOOD outcome for this metric?
}
interface KpiData {
  label: string;
  value: string;
  trend: TrendInfo;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

/* ─── Data ──────────────────────────────────────────────────────── */
const kpisByRange: Record<Range, KpiData[]> = {
  "7D": [
    { label: "Total Calls",      value: "1,167",  trend: { direction: "up",   label: "8.2%",  positive: true  }, icon: Phone,         iconBg: "var(--teal-surface)",   iconColor: "var(--teal)"   },
    { label: "Bookings Made",    value: "501",    trend: { direction: "up",   label: "12.4%", positive: true  }, icon: CalendarCheck2,iconBg: "var(--purple-surface)", iconColor: "var(--purple)" },
    { label: "Conversion Rate",  value: "42.9%",  trend: { direction: "up",   label: "2.1%",  positive: true  }, icon: Percent,       iconBg: "var(--info-surface)",   iconColor: "var(--info-text)" },
    { label: "Avg Handle Time",  value: "3m 24s", trend: { direction: "down", label: "0.4%",  positive: true  }, icon: Timer,         iconBg: "var(--success-surface)",iconColor: "var(--success-text)" },
  ],
  "30D": [
    { label: "Total Calls",      value: "4,317",  trend: { direction: "up",   label: "11.6%", positive: true  }, icon: Phone,         iconBg: "var(--teal-surface)",   iconColor: "var(--teal)"   },
    { label: "Bookings Made",    value: "1,844",  trend: { direction: "up",   label: "15.8%", positive: true  }, icon: CalendarCheck2,iconBg: "var(--purple-surface)", iconColor: "var(--purple)" },
    { label: "Conversion Rate",  value: "42.7%",  trend: { direction: "up",   label: "1.3%",  positive: true  }, icon: Percent,       iconBg: "var(--info-surface)",   iconColor: "var(--info-text)" },
    { label: "Avg Handle Time",  value: "3m 31s", trend: { direction: "up",   label: "2.0%",  positive: false }, icon: Timer,         iconBg: "var(--success-surface)",iconColor: "var(--success-text)" },
  ],
  "90D": [
    { label: "Total Calls",      value: "12,547", trend: { direction: "up",   label: "22.3%", positive: true  }, icon: Phone,         iconBg: "var(--teal-surface)",   iconColor: "var(--teal)"   },
    { label: "Bookings Made",    value: "5,304",  trend: { direction: "up",   label: "27.1%", positive: true  }, icon: CalendarCheck2,iconBg: "var(--purple-surface)", iconColor: "var(--purple)" },
    { label: "Conversion Rate",  value: "42.3%",  trend: { direction: "flat", label: "0.1%",  positive: true  }, icon: Percent,       iconBg: "var(--info-surface)",   iconColor: "var(--info-text)" },
    { label: "Avg Handle Time",  value: "3m 28s", trend: { direction: "down", label: "1.2%",  positive: true  }, icon: Timer,         iconBg: "var(--success-surface)",iconColor: "var(--success-text)" },
  ],
};

const volumeByRange: Record<Range, { label: string; calls: number; bookings: number }[]> = {
  "7D": [
    { label: "Mon", calls: 142, bookings: 58 },
    { label: "Tue", calls: 168, bookings: 71 },
    { label: "Wed", calls: 155, bookings: 64 },
    { label: "Thu", calls: 189, bookings: 82 },
    { label: "Fri", calls: 203, bookings: 95 },
    { label: "Sat", calls: 176, bookings: 79 },
    { label: "Sun", calls: 134, bookings: 52 },
  ],
  "30D": [
    { label: "Wk 1", calls: 980,  bookings: 410 },
    { label: "Wk 2", calls: 1120, bookings: 478 },
    { label: "Wk 3", calls: 1050, bookings: 455 },
    { label: "Wk 4", calls: 1167, bookings: 501 },
  ],
  "90D": [
    { label: "Apr", calls: 3920, bookings: 1640 },
    { label: "May", calls: 4310, bookings: 1820 },
    { label: "Jun", calls: 4317, bookings: 1844 },
  ],
};

const peakHoursData = [
  { hour: "8am",  calls: 12 },
  { hour: "9am",  calls: 28 },
  { hour: "10am", calls: 45 },
  { hour: "11am", calls: 52 },
  { hour: "12pm", calls: 38 },
  { hour: "1pm",  calls: 41 },
  { hour: "2pm",  calls: 49 },
  { hour: "3pm",  calls: 56 },
  { hour: "4pm",  calls: 48 },
  { hour: "5pm",  calls: 33 },
  { hour: "6pm",  calls: 19 },
];

const serviceBreakdown = [
  { name: "Botox / Injectables", value: 45, color: "#48C4C6" },
  { name: "Massage & Body",       value: 28, color: "#8952A5" },
  { name: "Facials & Skin",       value: 18, color: "#60A5FA" },
  { name: "General Inquiries",    value: 9,  color: "#F59E0B" },
];

const topServices = [
  { name: "Botox Consultations", calls: 312, bookings: 178, rate: 57 },
  { name: "Hydrafacial",         calls: 198, bookings: 102, rate: 51 },
  { name: "Massage Therapy",     calls: 245, bookings: 118, rate: 48 },
  { name: "Microneedling",       calls: 156, bookings: 69,  rate: 44 },
  { name: "General Inquiry",     calls: 256, bookings: 34,  rate: 13 },
];

/* ─── StatCard ──────────────────────────────────────────────────── */
function StatCard({ label, value, trend, icon: Icon, iconBg, iconColor }: KpiData) {
  const TrendIcon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  const trendColor = trend.direction === "flat" ? "var(--text-muted)" : trend.positive ? "var(--success-text)" : "var(--error-text)";
  const trendBg    = trend.direction === "flat" ? "var(--bg-sunken)"  : trend.positive ? "var(--success-surface)" : "var(--error-surface)";

  return (
    <motion.div variants={itemV} className="card p-4 md:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={16} style={{ color: iconColor }} aria-hidden="true" />
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: trendBg }}>
          <TrendIcon size={10} style={{ color: trendColor }} aria-hidden="true" />
          <span className="text-[10px] font-bold" style={{ color: trendColor }}>{trend.label}</span>
        </div>
      </div>
      <div>
        <p className="text-xl md:text-2xl font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>{value}</p>
        <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
      </div>
    </motion.div>
  );
}

/* ─── Shared chart tooltip ──────────────────────────────────────── */
function chartTooltipStyle() {
  return {
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "0.75rem",
    boxShadow: "var(--shadow-md)",
    padding: "8px 12px",
    fontSize: "11px",
  };
}

/* ─── Main Panel ────────────────────────────────────────────────── */
export default function AnalyticsPanel() {
  const [range, setRange] = useState<Range>("7D");
  const volume = volumeByRange[range];
  const kpis = kpisByRange[range];

  return (
    <motion.div variants={containerV} initial="hidden" animate="show" className="flex flex-col gap-4">
      {/* Header + range selector */}
      <motion.div variants={itemV} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Analytics</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Performance across all AI receptionist calls
          </p>
        </div>
        <div className="theme-toggle-pill" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`theme-toggle-btn${range === r ? " active" : ""}`}
              style={range === r ? { color: "var(--teal-text)" } : undefined}
            >
              {r}
            </button>
          ))}
        </div>
      </motion.div>

      {/* KPI row */}
      <motion.div variants={itemV} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((kpi) => <StatCard key={kpi.label} {...kpi} />)}
      </motion.div>

      {/* Call volume trend */}
      <motion.section variants={itemV} className="card p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "var(--teal-surface)" }}>
              <Activity size={14} style={{ color: "var(--teal)" }} aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Calls vs Bookings</h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#48C4C6" }} aria-hidden="true" />Calls</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#8952A5" }} aria-hidden="true" />Bookings</span>
          </div>
        </div>
        <div className="w-full h-56" role="img" aria-label="Calls versus bookings over time">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volume} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="callsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#48C4C6" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#48C4C6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bookingsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8952A5" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#8952A5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip
                contentStyle={chartTooltipStyle()}
                labelStyle={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: 4 }}
                cursor={{ stroke: "var(--border-medium)", strokeWidth: 1 }}
              />
              <Area type="monotone" dataKey="calls" name="Calls" stroke="#48C4C6" strokeWidth={2.5} fill="url(#callsFill)" />
              <Area type="monotone" dataKey="bookings" name="Bookings" stroke="#8952A5" strokeWidth={2.5} fill="url(#bookingsFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      {/* Peak hours + Service breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.section variants={itemV} className="card p-4 md:p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "var(--purple-surface)" }}>
              <Activity size={14} style={{ color: "var(--purple)" }} aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Peak Call Hours</h3>
          </div>
          <div className="w-full h-48" role="img" aria-label="Call volume by hour of day">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={chartTooltipStyle()} labelStyle={{ color: "var(--text-primary)", fontWeight: 600 }} cursor={{ fill: "var(--bg-sunken)" }} />
                <Bar dataKey="calls" name="Calls" fill="#48C4C6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section variants={itemV} className="card p-4 md:p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "var(--info-surface)" }}>
              <PieChartIcon size={14} style={{ color: "var(--info-text)" }} aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Service Breakdown</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-28 h-28 flex-shrink-0" role="img" aria-label="Service breakdown by percentage">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={serviceBreakdown} dataKey="value" innerRadius="58%" outerRadius="95%" startAngle={90} endAngle={-270} stroke="none" cornerRadius={4}>
                    {serviceBreakdown.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-2" role="list">
              {serviceBreakdown.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs min-w-0" style={{ color: "var(--text-secondary)" }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} aria-hidden="true" />
                    <span className="truncate">{s.name}</span>
                  </span>
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: "var(--text-primary)" }}>{s.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>
      </div>

      {/* Top services conversion leaderboard */}
      <motion.section variants={itemV} className="card p-4 md:p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "var(--teal-surface)" }}>
            <ListOrdered size={14} style={{ color: "var(--teal)" }} aria-hidden="true" />
          </div>
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Conversion by Service</h3>
        </div>
        <ul className="space-y-3" role="list">
          {topServices.map((s) => (
            <li key={s.name}>
              <div className="flex justify-between items-baseline mb-1 gap-2">
                <span className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{s.name}</span>
                <span className="text-[11px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {s.bookings}/{s.calls} calls
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-sunken)" }}
                  role="progressbar" aria-valuenow={s.rate} aria-valuemin={0} aria-valuemax={100}
                  aria-label={`${s.name} conversion rate`}>
                  <motion.div className="h-full rounded-full" style={{ background: "#48C4C6" }}
                    initial={{ width: 0 }} animate={{ width: `${s.rate}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }} />
                </div>
                <span className="text-xs font-bold w-10 text-right flex-shrink-0" style={{ color: "var(--teal-text)" }}>{s.rate}%</span>
              </div>
            </li>
          ))}
        </ul>
      </motion.section>
    </motion.div>
  );
}
