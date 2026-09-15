import { createAdminClient } from "@/lib/supabase/server";
import type { CallRecord } from "./types";

/**
 * Thrown by `upsert()` when a CallRecord has no resolvable
 * `clinicId`. Distinguishing this from a generic Postgres error lets
 * the webhook route log a clear, actionable message ("this clinic's
 * Retell agent isn't configured with clinic_id") instead of a raw
 * foreign-key-violation stack trace, and lets it decide not to
 * bother retrying (see api/webhooks/retell/route.ts).
 */
export class UnattributableCallError extends Error {
  constructor(public readonly callId: string) {
    super(`Call ${callId} has no resolvable clinic_id — cannot store it.`);
    this.name = "UnattributableCallError";
  }
}

export interface CallRecordStore {
  upsert(record: CallRecord): Promise<void>;
  getRecent(clinicId: string, limit?: number): Promise<CallRecord[]>;
  getByStatus(clinicId: string, status: CallRecord["status"], limit?: number): Promise<CallRecord[]>;
  getById(id: string): Promise<CallRecord | null>;
  /**
   * Calls with a real future `booking_time` — used for the
   * "Upcoming" dashboard card. NOTE: this replaces the previous
   * approach of filtering by `status === "Scheduled"`, which never
   * worked — lib/retell/mapper.ts's resolveStatus() never actually
   * produces the "Scheduled" status (it only returns "Completed",
   * "Confirmed", or "Escalated"), so that query always returned an
   * empty array regardless of how many real upcoming bookings existed.
   */
  getUpcomingBookings(clinicId: string, limit?: number): Promise<CallRecord[]>;
  /**
   * All calls for a clinic within [sinceISO, untilISO), used by the
   * analytics aggregation layer (lib/dashboard/metrics.ts). Returns
   * every column needed for KPI/trend/breakdown computation — no
   * status or outcome filtering, unlike getByStatus.
   */
  getCallRecordsInRange(clinicId: string, sinceISO: string, untilISO: string): Promise<CallRecord[]>;
}

/**
 * Real Supabase implementation.
 * Used by webhooks to permanently store Retell call data.
 */
class SupabaseCallRecordStore implements CallRecordStore {

  async upsert(record: CallRecord): Promise<void> {
    if (!record.clinicId) {
      throw new UnattributableCallError(record.id);
    }

    // Admin client bypasses RLS, ensuring webhooks can always write.
    const supabase = createAdminClient();

    // Map TS camelCase to Postgres snake_case
    const dbRecord = {
      id: record.id,
      clinic_id: record.clinicId,
      patient_name: record.patientName,
      service_type: record.serviceType,
      status: record.status,
      outcome: record.outcome || null,
      started_at: record.startedAt,
      duration_ms: record.durationMs || null,
      transcript: record.transcript || null,
      transcript_preview: record.transcriptPreview || null,
      booking_time: record.bookingTime || null,
      recording_url: record.recordingUrl || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("call_records")
      .upsert(dbRecord, { onConflict: "id" });

    if (error) {
      console.error(`Failed to upsert CallRecord ${record.id}:`, error);
      throw error;
    }
  }

  async getRecent(clinicId: string, limit = 20): Promise<CallRecord[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("call_records")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map(mapFromDb);
  }

  async getByStatus(clinicId: string, status: CallRecord["status"], limit = 20): Promise<CallRecord[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("call_records")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("status", status)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map(mapFromDb);
  }

  async getById(id: string): Promise<CallRecord | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("call_records")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return mapFromDb(data);
  }

  async getUpcomingBookings(clinicId: string, limit = 20): Promise<CallRecord[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("call_records")
      .select("*")
      .eq("clinic_id", clinicId)
      .not("booking_time", "is", null)
      .gte("booking_time", new Date().toISOString())
      .order("booking_time", { ascending: true })
      .limit(limit);

    if (error || !data) return [];
    return data.map(mapFromDb);
  }

  async getCallRecordsInRange(clinicId: string, sinceISO: string, untilISO: string): Promise<CallRecord[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("call_records")
      .select("*")
      .eq("clinic_id", clinicId)
      .gte("started_at", sinceISO)
      .lt("started_at", untilISO)
      .order("started_at", { ascending: true });

    if (error || !data) return [];
    return data.map(mapFromDb);
  }
}

// Helper to map snake_case back to frontend camelCase
function mapFromDb(row: any): CallRecord {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientName: row.patient_name,
    serviceType: row.service_type,
    status: row.status,
    outcome: row.outcome,
    startedAt: row.started_at,
    durationMs: row.duration_ms,
    transcript: row.transcript,
    transcriptPreview: row.transcript_preview,
    bookingTime: row.booking_time,
    recordingUrl: row.recording_url,
  };
}

export const callRecordStore: CallRecordStore = new SupabaseCallRecordStore();