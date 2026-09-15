/**
 * GET /api/dashboard/metrics?clinicId=...&range=7D|30D|90D
 * ───────────────────────────────────────────────────────────────
 * Real KPIs, trend deltas, and chart data for a clinic's dashboard
 * ("Dashboard" tab snapshot) and Analytics tab. Backs the numbers
 * DashboardHome and AnalyticsPanel previously hardcoded as mock data
 * — see lib/dashboard/metrics.ts for the aggregation logic itself.
 *
 * Auth pattern mirrors /api/dashboard/summary/route.ts: caller must
 * be an admin, or the owner/staff of the requested clinic.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callRecordStore } from "@/lib/retell/store";
import { computeDashboardMetrics, rangeToDays, type MetricsRange } from "@/lib/dashboard/metrics";

function isValidRange(value: string | null): value is MetricsRange {
  return value === "7D" || value === "30D" || value === "90D";
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clinicId = req.nextUrl.searchParams.get("clinicId");
  if (!clinicId) {
    return NextResponse.json({ error: "Missing clinicId" }, { status: 400 });
  }

  const rangeParam = req.nextUrl.searchParams.get("range");
  const range: MetricsRange = isValidRange(rangeParam) ? rangeParam : "7D";

  // Authorization check — identical pattern to /api/dashboard/summary
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, clinic_id")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const isOwnClinic = profile?.clinic_id === clinicId;

  if (!isAdmin && !isOwnClinic) {
    return NextResponse.json({ error: "Forbidden: You cannot access another clinic's analytics." }, { status: 403 });
  }

  const days = rangeToDays(range);
  const now = new Date();
  const currentStart = new Date(now.getTime() - days * 86_400_000);
  const previousStart = new Date(currentStart.getTime() - days * 86_400_000);

  const [current, previous] = await Promise.all([
    callRecordStore.getCallRecordsInRange(clinicId, currentStart.toISOString(), now.toISOString()),
    callRecordStore.getCallRecordsInRange(clinicId, previousStart.toISOString(), currentStart.toISOString()),
  ]);

  return NextResponse.json(computeDashboardMetrics(range, current, previous));
}