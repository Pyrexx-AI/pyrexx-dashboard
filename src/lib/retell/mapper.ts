/**
 * Retell payload → CallRecord normalization
 * ───────────────────────────────────────────────────────────────
 * Converts Retell's raw webhook `call` object into the CallRecord
 * shape the dashboard stores and displays.
 *
 * MULTI-TENANT NOTE:
 * `clinicId` is resolved from `call.metadata.clinic_id` or
 * `call.retell_llm_dynamic_variables.clinic_id`. Set this when
 * configuring each clinic's Retell agent (Agent → Metadata, or as
 * a dynamic variable injected at call start) so calls from
 * different clinics route to the correct dashboard tenant. If
 * Pyrexx runs ONE Retell agent per clinic (most common setup),
 * `agent_id` itself can serve as the clinic identifier instead —
 * see RETELL_INTEGRATION.md "Multi-clinic strategy".
 */

import type { CallRecord, RetellCall, RetellWebhookEvent } from "./types";

function resolveClinicId(call: RetellCall): string {
  const fromMetadata = call.metadata?.["clinic_id"];
  const fromDynamic = call.retell_llm_dynamic_variables?.["clinic_id"];
  if (typeof fromMetadata === "string") return fromMetadata;
  if (typeof fromDynamic === "string") return fromDynamic;
  // Fallback: one-agent-per-clinic setups can key off agent_id directly
  return call.agent_id;
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
