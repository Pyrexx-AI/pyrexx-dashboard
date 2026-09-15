/**
 * GET /api/clinic/export-data?clinicId=...
 * ───────────────────────────────────────────────────────────────
 * Real CSV export of a clinic's call records. Backs
 * ProfilePanel.tsx's "Export Data" button, which previously
 * rendered but did nothing at all.
 *
 * Auth pattern matches /api/dashboard/summary: caller must be an
 * admin, or the owner/staff of the requested clinic.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callRecordStore } from "@/lib/retell/store";

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, clinic_id")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const isOwnClinic = profile?.clinic_id === clinicId;

  if (!isAdmin && !isOwnClinic) {
    return NextResponse.json({ error: "Forbidden: You cannot export another clinic's data." }, { status: 403 });
  }

  // Covers up to a year back — a hard cap keeps this endpoint fast
  // and its response size bounded. Pagination/date-range selection
  // would be the next step if clinics need older history exported.
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const records = await callRecordStore.getCallRecordsInRange(clinicId, since, new Date().toISOString());

  const header = [
    "Started At", "Patient Name", "Service Type", "Status", "Outcome",
    "Duration (seconds)", "Booking Time", "Transcript Summary",
  ];
  const rows = records.map((r) => [
    r.startedAt,
    r.patientName,
    r.serviceType,
    r.status,
    r.outcome ?? "",
    r.durationMs ? Math.round(r.durationMs / 1000) : "",
    r.bookingTime ?? "",
    r.transcriptPreview ?? "",
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const filename = `call-records-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}