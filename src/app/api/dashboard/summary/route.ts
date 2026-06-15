/**
 * GET /api/dashboard/summary?clinicId=...
 * ───────────────────────────────────────────────────────────────
 * Reads from `callRecordStore` (populated by /api/webhooks/retell)
 * and returns data shaped for DashboardHome's three list cards:
 * Recent Calls, Recently Booked, Upcoming.
 *
 * This is the seam where mock data (DashboardHome.tsx's
 * `recentCalls` / `recentlyBooked` / `upcomingBookings` arrays)
 * gets replaced with live Retell data. To wire it up:
 *
 *   1. In DashboardHome.tsx, replace the hardcoded arrays with a
 *      fetch to this endpoint (e.g. via SWR or a server component).
 *   2. Map CallRecord → Meeting (see lib/retell/types.ts —
 *      the two shapes are intentionally close).
 *
 * AUTH NOTE: This route currently trusts a `clinicId` query param.
 * In production, derive clinicId from the authenticated session
 * (e.g. NextAuth/Clerk) instead of accepting it as client input —
 * otherwise any clinic could read another clinic's call data by
 * changing the query string.
 */

import { NextRequest, NextResponse } from "next/server";
import { callRecordStore } from "@/lib/retell/store";
import type { CallRecord } from "@/lib/retell/types";

/** CallRecord → Meeting (matches components/MeetingModal.tsx) */
function toMeeting(record: CallRecord, idx: number) {
  return {
    id: idx + 1, // Meeting.id is numeric in the current UI; swap to string IDs if refactoring
    name: record.patientName,
    type: record.serviceType,
    time: record.bookingTime
      ? new Date(record.bookingTime).toLocaleString("en-US", {
          weekday: "short",
          hour: "numeric",
          minute: "2-digit",
        })
      : new Date(record.startedAt).toLocaleString("en-US", {
          weekday: "short",
          hour: "numeric",
          minute: "2-digit",
        }),
    status: record.status,
    transcriptPreview: record.transcriptPreview,
    bookedAt: record.outcome === "booked" ? "recently" : undefined,
  };
}

export async function GET(req: NextRequest) {
  const clinicId = req.nextUrl.searchParams.get("clinicId");

  if (!clinicId) {
    return NextResponse.json({ error: "Missing clinicId" }, { status: 400 });
  }

  const [recent, confirmed, scheduled] = await Promise.all([
    callRecordStore.getByStatus(clinicId, "Completed", 5),
    callRecordStore.getByStatus(clinicId, "Confirmed", 5),
    callRecordStore.getByStatus(clinicId, "Scheduled", 5),
  ]);

  return NextResponse.json({
    recentCalls: recent.map(toMeeting),
    recentlyBooked: confirmed.map(toMeeting),
    upcomingBookings: scheduled.map(toMeeting),
  });
}
