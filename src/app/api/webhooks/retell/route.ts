/**
 * POST /api/webhooks/retell
 * ───────────────────────────────────────────────────────────────
 * Receives Retell AI voice-agent webhook events:
 *   • call_started  — fired when a call connects
 *   • call_ended    — fired when the call hangs up (includes transcript)
 *   • call_analyzed — fired after post-call analysis completes
 *     (includes summary, sentiment, custom outcome fields)
 *
 * SETUP: Point your Retell agent's webhook URL at:
 *   https://<your-vercel-domain>/api/webhooks/retell
 * (Agent → Settings → Webhook URL, in the Retell dashboard.)
 *
 * SECURITY: Every request is verified via HMAC signature
 * (x-retell-signature header) before any processing occurs.
 * Requests with missing/invalid signatures are rejected with 401
 * and never reach the database.
 *
 * RESPONSE TIME: Retell times out webhook calls after 10 seconds
 * and retries up to 3 times on non-2xx responses. Keep this handler
 * fast — it should only validate + upsert, never call out to slow
 * third-party APIs synchronously. If you need to trigger downstream
 * work (e.g. send an SMS on a missed call), queue it instead of
 * awaiting it inline.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyRetellSignature } from "@/lib/retell/verify-signature";
import { mapRetellCallToRecord } from "@/lib/retell/mapper";
import { callRecordStore, UnattributableCallError } from "@/lib/retell/store";
import type { RetellWebhookPayload } from "@/lib/retell/types";

export async function POST(req: NextRequest) {
  // 1. Read RAW body — signature is computed over exact bytes,
  //    so this must happen before any JSON parsing.
  const rawBody = await req.text();
  const signature = req.headers.get("x-retell-signature");

  const isValid = verifyRetellSignature(
    rawBody,
    signature,
    process.env.RETELL_API_KEY
  );

  if (!isValid) {
    // Do not leak why verification failed — just reject.
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2. Parse payload
  let payload: RetellWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, call } = payload;

  if (!call?.call_id) {
    return NextResponse.json({ error: "Missing call.call_id" }, { status: 400 });
  }

  // 3. Normalize + upsert.
  //    call_started / call_ended / call_analyzed all share the same
  //    call_id, so this naturally builds up the record over the
  //    lifecycle of a single call (see store.ts schema notes).
  //
  //    FIX: this previously called `await callRecordStore.upsert(record)`
  //    unguarded. If `resolveClinicId()` couldn't attribute the call
  //    to a clinic (metadata/dynamic variables missing clinic_id),
  //    the DB insert was GUARANTEED to fail its foreign-key
  //    constraint, throw inside this handler, and produce an
  //    unhandled 500 — which made Retell retry up to 3 times for a
  //    problem retrying could never fix (a config issue, not a
  //    transient one), and dropped the call data either way.
  //
  //    Now: attribution failures are caught, logged loudly with
  //    enough detail to fix the clinic's agent config, and
  //    acknowledged with 200 so Retell doesn't burn retries on a
  //    call that will never insert successfully. Any other/unexpected
  //    storage error is also caught and logged — Retell will still
  //    see a 500 for those and retry, since those ARE plausibly
  //    transient (e.g. a Supabase blip).
  const record = mapRetellCallToRecord(event, call);
  try {
    await callRecordStore.upsert(record);
  } catch (err) {
    if (err instanceof UnattributableCallError) {
      console.error(
        `[Retell Webhook] Dropping call ${call.call_id} (agent ${call.agent_id}): ` +
        `no clinic_id in metadata or dynamic variables. ` +
        `Fix this agent's default_dynamic_variables in Retell, or re-run provisioning ` +
        `(see lib/retell/provision.ts) so future calls attribute correctly.`
      );
      return NextResponse.json({ received: true, warning: "unattributable_call_dropped" });
    }

    console.error(`[Retell Webhook] Failed to store call ${call.call_id}:`, err);
    return NextResponse.json({ error: "Storage failure" }, { status: 500 });
  }

  // 4. Event-specific side effects.
  //    Keep these fire-and-forget (don't await slow operations) —
  //    Retell expects a 2xx within 10 seconds.
  switch (event) {
    case "call_started":
      // e.g. mark a "live call in progress" indicator on the dashboard
      break;
    case "call_ended":
      // e.g. trigger missed-call SMS if call_analysis isn't ready yet
      // and call_status === "error"
      break;
    case "call_analyzed":
      // e.g. push a real-time update via WebSocket/SSE to connected
      // dashboard clients so "Recently Booked" updates live
      break;
    default:
      // Unrecognized event — acknowledge anyway so Retell doesn't retry
      break;
  }

  return NextResponse.json({ received: true });
}

/**
 * Reject non-POST methods explicitly. Retell only ever sends POST,
 * but an explicit 405 is clearer than a generic Next.js 404 if
 * someone (or a health-check bot) probes this URL with GET.
 */
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}