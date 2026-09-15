import { createAdminClient } from "@/lib/supabase/server";
import type { CallRecord } from "./types";

export interface CallRecordStore {
  upsert(record: CallRecord): Promise<void>;
  getRecent(clinicId: string, limit?: number): Promise<CallRecord[]>;
  getByStatus(clinicId: string, status: CallRecord["status"], limit?: number): Promise<CallRecord[]>;
  getById(id: string): Promise<CallRecord | null>;
}

/**
 * Real Supabase implementation.
 * Used by webhooks to permanently store Retell call data.
 */
class SupabaseCallRecordStore implements CallRecordStore {
  
  async upsert(record: CallRecord): Promise<void> {
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