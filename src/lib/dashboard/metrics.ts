/**
 * Dashboard Metrics Aggregation
 * ───────────────────────────────────────────────────────────────
 * Pure, framework-free functions that turn raw CallRecord[] rows
 * (from lib/retell/store.ts) into the KPIs, trends, and chart data
 * the client dashboard actually displays.
 *
 * WHY THIS EXISTS: DashboardHome and AnalyticsPanel previously
 * rendered entirely hardcoded mock numbers (same values for every
 * clinic, every time). This module is the real computation those
 * components are now wired to via /api/dashboard/metrics.
 *
 * KNOWN LIMITATION — "Pickup Rate": there is no explicit "call was
 * answered vs missed" signal in the schema (Retell's raw
 * `call_status` isn't persisted to call_records, only the derived
 * `status`). This uses `durationMs > 0` as a proxy for "the AI
 * receptionist actually engaged in the call" — a genuinely missed
 * or instantly-dropped call would show 0/undefined duration. If
 * exact missed-call tracking matters, persist `call.call_status`
 * (or `call.disconnection_reason`) from the Retell webhook payload
 * and compute this from that instead.
 */

import type { CallRecord } from "@/lib/retell/types";

export type MetricsRange = "7D" | "30D" | "90D";

export function rangeToDays(range: MetricsRange): number {
  switch (range) {
    case "7D": return 7;
    case "30D": return 30;
    case "90D": return 90;
  }
}

export interface TrendInfo {
  direction: "up" | "down" | "flat";
  label: string;
  /** Does this direction represent a GOOD outcome for this metric? (e.g. "down" is good for handle time) */
  positive: boolean;
}

function computeTrend(current: number, previous: number, higherIsBetter: boolean): TrendInfo {
  if (previous === 0) {
    if (current === 0) return { direction: "flat", label: "0%", positive: true };
    return { direction: "up", label: "New", positive: higherIsBetter };
  }
  const deltaPct = ((current - previous) / previous) * 100;
  if (Math.abs(deltaPct) < 0.5) {
    return { direction: "flat", label: `${Math.abs(deltaPct).toFixed(1)}%`, positive: true };
  }
  const direction: TrendInfo["direction"] = deltaPct > 0 ? "up" : "down";
  const positive = direction === "up" ? higherIsBetter : !higherIsBetter;
  return { direction, label: `${Math.abs(deltaPct).toFixed(1)}%`, positive };
}

export interface OutcomeCounts {
  booked: number;
  callback_requested: number;
  escalated: number;
  no_action: number;
}

function countOutcomes(records: CallRecord[]): OutcomeCounts {
  const counts: OutcomeCounts = { booked: 0, callback_requested: 0, escalated: 0, no_action: 0 };
  for (const r of records) {
    const key = (r.outcome ?? "no_action") as keyof OutcomeCounts;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export interface ServiceBreakdownEntry {
  name: string;
  /** Percentage of total calls (0-100, rounded) */
  value: number;
  count: number;
}

function computeServiceBreakdown(records: CallRecord[], topN = 4): ServiceBreakdownEntry[] {
  if (records.length === 0) return [];
  const counts = new Map<string, number>();
  for (const r of records) counts.set(r.serviceType, (counts.get(r.serviceType) ?? 0) + 1);

  const total = records.length;
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);

  const entries: ServiceBreakdownEntry[] = top.map(([name, count]) => ({
    name,
    count,
    value: Math.round((count / total) * 100),
  }));

  if (rest.length) {
    const restCount = rest.reduce((sum, [, c]) => sum + c, 0);
    entries.push({ name: "Other", count: restCount, value: Math.round((restCount / total) * 100) });
  }

  return entries;
}

/** See module doc comment — proxy for "connected", not a true answered/missed signal. */
function computePickupRate(records: CallRecord[]): number {
  if (records.length === 0) return 0;
  const connected = records.filter((r) => (r.durationMs ?? 0) > 0).length;
  return (connected / records.length) * 100;
}

function computeConversionRate(records: CallRecord[]): number {
  if (records.length === 0) return 0;
  const booked = records.filter((r) => r.outcome === "booked").length;
  return (booked / records.length) * 100;
}

function computeAvgHandleTimeSeconds(records: CallRecord[]): number {
  const withDuration = records.filter((r) => typeof r.durationMs === "number" && r.durationMs! > 0);
  if (withDuration.length === 0) return 0;
  const totalMs = withDuration.reduce((sum, r) => sum + (r.durationMs ?? 0), 0);
  return Math.round(totalMs / withDuration.length / 1000);
}

export function formatHandleTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s}s`;
}

export interface VolumeBucket {
  label: string;
  calls: number;
  bookings: number;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function weekKey(d: Date): string {
  const copy = new Date(d);
  const dayOfWeek = (copy.getUTCDay() + 6) % 7; // 0 = Monday
  copy.setUTCDate(copy.getUTCDate() - dayOfWeek);
  return copy.toISOString().slice(0, 10);
}
function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function computeVolume(records: CallRecord[], range: MetricsRange): VolumeBucket[] {
  const keyFn = range === "7D" ? dayKey : range === "30D" ? weekKey : monthKey;
  const labelFn = (d: Date): string => {
    if (range === "7D") return d.toLocaleDateString("en-US", { weekday: "short" });
    if (range === "30D") return `Wk ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    return d.toLocaleDateString("en-US", { month: "short" });
  };

  const buckets = new Map<string, { calls: number; bookings: number; date: Date }>();
  for (const r of records) {
    const d = new Date(r.startedAt);
    const key = keyFn(d);
    const existing = buckets.get(key) ?? { calls: 0, bookings: 0, date: d };
    existing.calls += 1;
    if (r.outcome === "booked") existing.bookings += 1;
    buckets.set(key, existing);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => ({ label: labelFn(v.date), calls: v.calls, bookings: v.bookings }));
}

function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${period}`;
}

function computePeakHours(records: CallRecord[]): { hour: string; calls: number }[] {
  const counts = new Array(24).fill(0) as number[];
  for (const r of records) {
    const hour = new Date(r.startedAt).getHours();
    counts[hour] += 1;
  }
  return counts
    .map((calls, hour) => ({ hour, calls }))
    .filter((h) => h.calls > 0)
    .map((h) => ({ hour: formatHourLabel(h.hour), calls: h.calls }));
}

export interface TopServiceEntry {
  name: string;
  calls: number;
  bookings: number;
  rate: number; // 0-100
}

function computeTopServices(records: CallRecord[], limit = 8): TopServiceEntry[] {
  const map = new Map<string, { calls: number; bookings: number }>();
  for (const r of records) {
    const entry = map.get(r.serviceType) ?? { calls: 0, bookings: 0 };
    entry.calls += 1;
    if (r.outcome === "booked") entry.bookings += 1;
    map.set(r.serviceType, entry);
  }
  return [...map.entries()]
    .map(([name, { calls, bookings }]) => ({
      name,
      calls,
      bookings,
      rate: calls > 0 ? Math.round((bookings / calls) * 100) : 0,
    }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, limit);
}

export interface DashboardMetrics {
  range: MetricsRange;
  totalCalls: number;
  bookingsMade: number;
  conversionRatePct: number;
  pickupRatePct: number;
  avgHandleTimeSeconds: number;
  avgHandleTimeLabel: string;
  trends: {
    totalCalls: TrendInfo;
    bookingsMade: TrendInfo;
    conversionRate: TrendInfo;
    pickupRate: TrendInfo;
    avgHandleTime: TrendInfo;
  };
  outcomes: OutcomeCounts;
  serviceBreakdown: ServiceBreakdownEntry[];
  volume: VolumeBucket[];
  peakHours: { hour: string; calls: number }[];
  topServices: TopServiceEntry[];
}

/**
 * `current` = records in the requested range (e.g. last 7 days).
 * `previous` = records in the equal-length window immediately
 * before that, used purely to compute trend deltas.
 */
export function computeDashboardMetrics(
  range: MetricsRange,
  current: CallRecord[],
  previous: CallRecord[]
): DashboardMetrics {
  const totalCalls = current.length;
  const bookingsMade = current.filter((r) => r.outcome === "booked").length;
  const conversionRatePct = computeConversionRate(current);
  const pickupRatePct = computePickupRate(current);
  const avgHandleTimeSeconds = computeAvgHandleTimeSeconds(current);

  const prevTotal = previous.length;
  const prevBookings = previous.filter((r) => r.outcome === "booked").length;
  const prevConversion = computeConversionRate(previous);
  const prevPickup = computePickupRate(previous);
  const prevAvgHandle = computeAvgHandleTimeSeconds(previous);

  return {
    range,
    totalCalls,
    bookingsMade,
    conversionRatePct,
    pickupRatePct,
    avgHandleTimeSeconds,
    avgHandleTimeLabel: formatHandleTime(avgHandleTimeSeconds),
    trends: {
      totalCalls: computeTrend(totalCalls, prevTotal, true),
      bookingsMade: computeTrend(bookingsMade, prevBookings, true),
      conversionRate: computeTrend(conversionRatePct, prevConversion, true),
      pickupRate: computeTrend(pickupRatePct, prevPickup, true),
      avgHandleTime: computeTrend(avgHandleTimeSeconds, prevAvgHandle, false),
    },
    outcomes: countOutcomes(current),
    serviceBreakdown: computeServiceBreakdown(current),
    volume: computeVolume(current, range),
    peakHours: computePeakHours(current),
    topServices: computeTopServices(current),
  };
}