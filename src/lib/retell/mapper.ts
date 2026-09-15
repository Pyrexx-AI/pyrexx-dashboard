/**
 * Retell payload → CallRecord normalization
 * ───────────────────────────────────────────────────────────────
 * Converts Retell's raw webhook `call` object into the CallRecord
 * shape the dashboard stores and displays.
 *
 * MULTI-TENANT NOTE:
 * `clinicId` is resolved from `call.metadata.clinic_id` or
 * `call.retell_llm_dynamic_variables.clinic_id`. This is set
 * automatically for every clinic at agent-provisioning time (see
 * lib/retell/provision.ts's `default_dynamic_variables`), so it
 * should always be present. If it's ever missing, `resolveClinicId`
 * returns `null` rather than guessing — see its doc comment for why
 * `agent_id` can never be used as a fallback here.
 */

import type { CallRecord, RetellCall, RetellWebhookEvent } from "./types";

/**
 * Resolves which clinic a call belongs to, or null if it can't be
 * determined safely.
 *
 * FIX: this previously fell back to `call.agent_id` when no
 * `clinic_id` was present in metadata/dynamic variables. That
 * fallback was never actually safe — `call_records.clinic_id` has a
 * foreign-key constraint against `clinics.id` (a Supabase UUID),
 * and `agent_id` is a Retell-generated ID in a completely different
 * ID namespace. It could never satisfy that FK, so any call missing
 * `clinic_id` metadata was GUARANTEED to throw on
 * `callRecordStore.upsert()` — not a rare edge case, a certainty.
 *
 * The real fix is ensuring `clinic_id` is always injected as a
 * default dynamic variable at agent-provisioning time (see
 * lib/retell/provision.ts). This function now returns `null` when
 * that's missing, so the caller (the webhook route) can log and
 * skip the record instead of crashing on every retry.
 */
function resolveClinicId(call: RetellCall): string | null {
  const fromMetadata = call.metadata?.["clinic_id"];
  const fromDynamic = call.retell_llm_dynamic_variables?.["clinic_id"];
  if (typeof fromMetadata === "string" && fromMetadata) return fromMetadata;
  if (typeof fromDynamic === "string" && fromDynamic) return fromDynamic;
  return null;
}

function resolveStatus(event: RetellWebhookEvent, call: RetellCall): CallRecord["status"] {
  const sentiment = call.call_analysis?.user_sentiment;
  const customOutcome = call.call_analysis?.custom_analysis_data?.["outcome"];

  if (event === "call_analyzed") {
    if (customOutcome === "escalated" || sentiment === "Negative") return "Escalated";
    if (customOutcome === "booked") return "Confirmed";
    return "Completed";
  }
  if (event === "call_ended") return "Completed";
  return "Completed"; // call_started rows are provisional; refined on later events
}

function resolveOutcome(call: RetellCall): CallRecord["outcome"] {
  const custom = call.call_analysis?.custom_analysis_data?.["outcome"];
  if (custom === "booked" || custom === "callback_requested" || custom === "escalated") {
    return custom;
  }
  return "no_action";
}

export function mapRetellCallToRecord(
  event: RetellWebhookEvent,
  call: RetellCall
): CallRecord {
  const dyn = call.retell_llm_dynamic_variables ?? {};

  const patientName = dyn["patient_name"] || dyn["caller_name"] || "Unknown Caller";
  const serviceType = dyn["service_requested"] || dyn["service_type"] || "General Inquiry";
  const bookingTime = dyn["booking_time"] || dyn["appointment_time"];

  const startedAt = call.start_timestamp
    ? new Date(call.start_timestamp).toISOString()
    : new Date().toISOString();

  const summary = call.call_analysis?.call_summary;
  const transcriptPreview =
    summary?.slice(0, 220) ||
    call.transcript?.slice(0, 220) ||
    undefined;

  return {
    id: call.call_id,
    clinicId: resolveClinicId(call),
    patientName,
    serviceType,
    status: resolveStatus(event, call),
    outcome: resolveOutcome(call),
    startedAt,
    durationMs: call.duration_ms,
    transcript: call.transcript,
    transcriptPreview,
    bookingTime,
    recordingUrl: call.recording_url,
  };
}