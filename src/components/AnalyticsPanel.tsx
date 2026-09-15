"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Phone, CalendarCheck2, Percent, Timer,
  TrendingUp, TrendingDown, Minus,
  Activity, PieChart as PieChartIcon, ListOrdered, Loader2, Inbox,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import type { DashboardMetrics, MetricsRange } from "@/lib/dashboard/metrics";

/*
 * REAL DATA NOTE:
 * This panel previously rendered entirely hardcoded mock data
 * (kpisByRange / volumeByRange / peakHoursData / serviceBreakdown /
 * topServices — all static, identical for every clinic). It also
 * never received a `clinicId` prop from DashboardHome at all, so
 * there was no way to wire it to real data without this change.
 * Now it fetches /api/dashboard/metrics for the selected clinic and
 * range and renders everything from that response.
 */

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
type Range = MetricsRange;
const RANGES: Range[] = ["7D", "30D", "90D"];

interface TrendInfo {
  direction: "up" | "down" | "flat";
  label: string;
  positive: boolean;
}
interface KpiData {
  label: string;
  value: string;
  trend: TrendInfo;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const SERVICE_COLORS = ["#48C4C6", "#8952A5", "#60A5FA", "#F59E0B", "#EC4899"];

function buildKpis(metrics: DashboardMetrics): KpiData[] {
  return [
    {
      label: "Total Calls",
      value: metrics.totalCalls.toLocaleString(),
      trend: metrics.trends.totalCalls,
      icon: Phone, iconBg: "var(--teal-surface)", iconColor: "var(--teal)",
    },
    {
      label: "Bookings Made",
      value: metrics.bookingsMade.toLocaleString(),
      trend: metrics.trends.bookingsMade,
      icon: CalendarCheck2, iconBg: "var(--purple-surface)", iconColor: "var(--purple)",
    },
    {
      label: "Conversion Rate",
      value: `${metrics.conversionRatePct.toFixed(1)}%`,
      trend: metrics.trends.conversionRate,
      icon: Percent, iconBg: "var(--info-surface)", iconColor: "var(--info-text)",
    },
    {
      label: "Avg Handle Time",
      value: metrics.avgHandleTimeLabel,
      trend: metrics.trends.avgHandleTime,
      icon: Timer, iconBg: "var(--success-surface)", iconColor: "var(--success-text)",
    },
  ];
}

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

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center">
      <Inbox size={20} style={{ color: "var(--text-placeholder)" }} aria-hidden="true" />
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

/* ─── Main Panel ────────────────────────────────────────────────── */
export default function AnalyticsPanel({ clinicId }: { clinicId?: string }) {
  const [range, setRange] = useState<Range>("7D");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (id: string, r: Range) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/metrics?clinicId=${encodeURIComponent(id)}&range=${r}`);
      if (!res.ok) {
        setError("Could not load analytics right now. Please try again.");
        return;
      }
      const json = await res.json();
      setMetrics(json);
    } catch {
      setError("Could not load analytics right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    fetchMetrics(clinicId, range);
  }, [clinicId, range, fetchMetrics]);

  if (!clinicId) {
    return (
      <div className="card p-10 flex flex-col items-center justify-center text-center gap-2">
        <Inbox size={28} style={{ color: "var(--text-placeholder)" }} aria-hidden="true" />
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>No clinic linked to this account yet</p>
        <p className="text-xs max-w-sm" style={{ color: "var(--text-muted)" }}>
          Once your account is linked to a clinic, analytics for your AI receptionist calls will appear here.
        </p>
      </div>
    );
  }

  const kpis = metrics ? buildKpis(metrics) : [];
  const volume = metrics?.volume ?? [];
  const peakHoursData = metrics?.peakHours ?? [];
  const serviceBreakdown = (metrics?.serviceBreakdown ?? []).map((s, i) => ({
    name: s.name,
    value: s.value,
    color: SERVICE_COLORS[i % SERVICE_COLORS.length],
  }));
  const topServices = metrics?.topServices ?? [];

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

      {error && (
        <motion.div variants={itemV} className="card p-4 text-xs" style={{ background: "var(--error-surface)", color: "var(--error-text)" }}>
          {error}
        </motion.div>
      )}

      {loading ? (
        <motion.div variants={itemV} className="card p-16 flex items-center justify-center">
          <Loader2 size={22} className="animate-spin" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
        </motion.div>
      ) : (
        <>
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
            {volume.length === 0 ? (
              <EmptyState label="No call activity in this range yet" />
            ) : (
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
            )}
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
              {peakHoursData.length === 0 ? (
                <EmptyState label="No calls in this range yet" />
              ) : (
                <div className="w-full h-48" role="img" aria-label="Call volume by hour of day">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakHoursData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                      <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                      <Tooltip contentStyle={chartTooltipStyle()} labelStyle={{ color: "var(--text-primary)", fontWeight: 600 }} cursor={{ fill: "var(--bg-sunken)" }} />
                      <Bar dataKey="calls" name="Calls" fill="#48C4C6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.section>

            <motion.section variants={itemV} className="card p-4 md:p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "var(--info-surface)" }}>
                  <PieChartIcon size={14} style={{ color: "var(--info-text)" }} aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Service Breakdown</h3>
              </div>
              {serviceBreakdown.length === 0 ? (
                <EmptyState label="No calls in this range yet" />
              ) : (
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
              )}
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
            {topServices.length === 0 ? (
              <EmptyState label="No calls in this range yet" />
            ) : (
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
            )}
          </motion.section>
        </>
      )}
    </motion.div>
  );
}