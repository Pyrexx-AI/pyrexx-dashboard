import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callRecordStore } from "@/lib/retell/store";
import type { CallRecord } from "@/lib/retell/types";
import type { Meeting } from "@/components/MeetingModal";

function toMeeting(record: CallRecord): Meeting {
  return {
    id: record.id, // Preserves canonical call_id for deterministic realtime upserts
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clinicId = req.nextUrl.searchParams.get("clinicId");
  if (!clinicId) {
    return NextResponse.json({ error: "Missing clinicId" }, { status: 400 });
  }

  // Authorization Check: Verify caller is an Admin or owner/staff of the requested clinic
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, clinic_id")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const isOwnClinic = profile?.clinic_id === clinicId;

  if (!isAdmin && !isOwnClinic) {
    return NextResponse.json(
      { error: "Forbidden: You cannot access another clinic's call records." },
      { status: 403 }
    );
  }

  const [recent, confirmed, upcoming] = await Promise.all([
    callRecordStore.getByStatus(clinicId, "Completed", 5),
    callRecordStore.getByStatus(clinicId, "Confirmed", 5),
    callRecordStore.getUpcomingBookings(clinicId, 5),
  ]);

  return NextResponse.json({
    recentCalls: recent.map(toMeeting),
    recentlyBooked: confirmed.map(toMeeting),
    upcomingBookings: upcoming.map(toMeeting),
  });
}