/**
 * Call Record Store — storage abstraction
 * ───────────────────────────────────────────────────────────────
 * The webhook handler and dashboard data-fetching code depend on
 * this interface, not on a specific database. Swap the in-memory
 * implementation below for Postgres / Supabase / PlanetScale /
 * Prisma etc. without touching the webhook route or UI components.
 *
 * SUGGESTED PRODUCTION SCHEMA (Postgres):
 *
 *   create table call_records (
 *     id                 text primary key,        -- Retell call_id
 *     clinic_id          text not null,
 *     patient_name       text not null default 'Unknown Caller',
 *     service_type       text not null default 'General Inquiry',
 *     status             text not null,           -- Completed | Scheduled | Confirmed | Escalated
 *     outcome            text,                     -- booked | callback_requested | escalated | no_action
 *     started_at         timestamptz not null,
 *     duration_ms        integer,
 *     transcript         text,
 *     transcript_preview text,
 *     booking_time       timestamptz,
 *     recording_url      text,
 *     raw_payload        jsonb,                   -- full Retell payload for debugging/reprocessing
 *     created_at         timestamptz not null default now(),
 *     updated_at         timestamptz not null default now()
 *   );
 *
 *   create index on call_records (clinic_id, started_at desc);
 *
 * Each webhook event (call_started → call_ended → call_analyzed)
 * carries the same call_id, so `upsert` is the correct operation —
 * call_started creates the row, call_ended fills in duration/transcript,
 * call_analyzed fills in outcome/summary.
 */

import type { CallRecord } from "./types";

export interface CallRecordStore {
  upsert(record: CallRecord): Promise<void>;
  getRecent(clinicId: string, limit?: number): Promise<CallRecord[]>;
  getByStatus(clinicId: string, status: CallRecord["status"], limit?: number): Promise<CallRecord[]>;
  getById(id: string): Promise<CallRecord | null>;
}

/**
 * In-memory store — for local development only.
 * Data is lost on every server restart / redeploy. Replace with a
 * real database adapter before going to production (see schema above).
 */
class InMemoryCallRecordStore implements CallRecordStore {
  private records = new Map<string, CallRecord>();

  async upsert(record: CallRecord): Promise<void> {
    const existing = this.records.get(record.id);
    this.records.set(record.id, { ...existing, ...record });
  }

  async getRecent(clinicId: string, limit = 20): Promise<CallRecord[]> {
    return [...this.records.values()]
      .filter((r) => r.clinicId === clinicId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  }

  async getByStatus(clinicId: string, status: CallRecord["status"], limit = 20): Promise<CallRecord[]> {
    return [...this.records.values()]
      .filter((r) => r.clinicId === clinicId && r.status === status)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  }

  async getById(id: string): Promise<CallRecord | null> {
    return this.records.get(id) ?? null;
  }
}

/**
 * Singleton instance. In a real deployment, replace this export with
 * your database-backed implementation, e.g.:
 *
 *   export const callRecordStore: CallRecordStore = new PostgresCallRecordStore(pool);
 *
 * Keeping the same `CallRecordStore` interface means
 * `src/app/api/webhooks/retell/route.ts` and any dashboard data
 * fetchers require zero changes when you make this swap.
 */
export const callRecordStore: CallRecordStore = new InMemoryCallRecordStore();
