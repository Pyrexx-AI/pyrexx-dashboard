/**
 * Retell AI — Webhook Payload Types
 * ───────────────────────────────────────────────────────────────
 * Mirrors the structure Retell sends to your webhook URL for the
 * three voice-agent lifecycle events: call_started, call_ended,
 * and call_analyzed.
 *
 * Reference: https://docs.retellai.com/features/webhook-overview
 *
 * NOTE: Retell's payloads include many more fields than modeled
 * here. This file covers everything the Pyrexx Dashboard currently
 * needs to populate Recent Calls, Recently Booked, Upcoming, and
 * Analytics. Extend as needed — Retell will not break if your Zod
 * schema simply ignores extra fields.
 */

export type RetellWebhookEvent = "call_started" | "call_ended" | "call_analyzed";

export type RetellCallStatus =
  | "registered"
  | "ongoing"
  | "ended"
  | "error";

export interface RetellTranscriptTurn {
  role: "agent" | "user";
  content: string;
  /** Unix ms timestamp this turn started */
  words?: { word: string; start: number; end: number }[];
}

export interface RetellCallAnalysis {
  /** Short LLM-generated summary of the call */
  call_summary?: string;
  /** e.g. "appointment_booked", "callback_requested", "escalated" */
  user_sentiment?: "Positive" | "Neutral" | "Negative" | "Unknown";
  call_successful?: boolean;
  /** Custom fields defined in your Retell agent's "Post-Call Analysis" config */
  custom_analysis_data?: Record<string, unknown>;
}

export interface RetellCall {
  call_id: string;
  agent_id: string;
  call_status: RetellCallStatus;
  /** "phone_call" | "web_call" */
  call_type?: string;
  from_number?: string;
  to_number?: string;
  direction?: "inbound" | "outbound";

  start_timestamp?: number; // unix ms
  end_timestamp?: number;   // unix ms
  duration_ms?: number;

  transcript?: string;
  transcript_object?: RetellTranscriptTurn[];

  recording_url?: string;

  /** Populated only on call_analyzed */
  call_analysis?: RetellCallAnalysis;

  /**
   * Dynamic variables passed into / extracted from the call —
   * e.g. patient_name, service_requested, booking_time. Configure
   * these in your Retell agent's prompt + post-call analysis schema
   * to match the fields the dashboard needs (see RETELL_INTEGRATION.md).
   */
  retell_llm_dynamic_variables?: Record<string, string>;

  metadata?: Record<string, unknown>;
}

export interface RetellWebhookPayload {
  event: RetellWebhookEvent;
  call: RetellCall;
}

/**
 * Normalized shape used internally by the dashboard once a webhook
 * is processed. This is what gets written to storage and read back
 * by DashboardHome / AnalyticsPanel.
 *
 * Maps loosely onto the existing `Meeting` interface
 * (see components/MeetingModal.tsx) so the UI layer needs minimal
 * changes once real data replaces the mock arrays.
 */
export interface CallRecord {
  id: string;                 // = call_id
  clinicId: string;           // which Pyrexx client this call belongs to
  patientName: string;        // from dynamic variables, fallback "Unknown Caller"
  serviceType: string;        // from dynamic variables / custom analysis
  status: "Completed" | "Scheduled" | "Confirmed" | "Escalated";
  outcome?: "booked" | "callback_requested" | "escalated" | "no_action";
  startedAt: string;           // ISO timestamp
  durationMs?: number;
  transcript?: string;
  transcriptPreview?: string;  // first ~150 chars or AI summary
  bookingTime?: string;        // ISO timestamp of the booked appointment, if any
  recordingUrl?: string;
}
