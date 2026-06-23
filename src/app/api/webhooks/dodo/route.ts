/**
 * POST /api/webhooks/dodo
 * ───────────────────────────────────────────────────────────────
 * Receives Dodo Payments subscription lifecycle events, keeps
 * `clinics.subscription_status` in sync, and — the key piece that
 * makes onboarding "minimal backend setup for the admin" — triggers
 * automated AI Receptionist Agent provisioning the moment a clinic's
 * subscription becomes active.
 *
 * VERIFIED event names + payload shape (checked directly against
 * the installed `dodopayments` package's .d.ts files, not just
 * documentation):
 *   type: 'payment.succeeded' | 'payment.failed' | 'payment.processing'
 *       | 'payment.cancelled' | 'subscription.active' | 'subscription.renewed'
 *       | 'subscription.on_hold' | 'subscription.paused' | 'subscription.cancelled'
 *       | 'subscription.failed' | 'subscription.expired' | ...
 *   data: { subscription_id, customer: { customer_id, email, ... },
 *            product_id, metadata: {...}, status, ... }
 *
 * There is no single "past_due" event — `subscription.on_hold` and
 * `dunning.started` are the closest analogs (payment failed, Dodo is
 * retrying before cancellation) and both map to our 'past_due' status.
 *
 * SECURITY: verified via the Standard Webhooks spec (see
 * lib/dodo/verify-signature.ts) before any processing — invalid
 * signatures are rejected with 401 and never reach the database or
 * trigger provisioning.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyDodoWebhook } from "@/lib/dodo/verify-signature";
import { createAdminClient } from "@/lib/supabase/server";
import { provisionAiReceptionistAgent } from "@/lib/retell/provision";
import type { SubscriptionStatus } from "@/types/database";

interface DodoEventData {
  subscription_id?: string;
  customer?: { customer_id?: string };
  product_id?: string;
  metadata?: { clinic_id?: string };
}

interface DodoWebhookPayload {
  type: string;
  data: DodoEventData;
}

function mapDodoStatus(eventType: string): SubscriptionStatus | null {
  if (eventType === "subscription.active" || eventType === "subscription.renewed") return "active";
  if (eventType === "subscription.on_hold" || eventType === "dunning.started") return "past_due";
  if (
    eventType === "subscription.cancelled" ||
    eventType === "subscription.expired" ||
    eventType === "subscription.failed"
  )
    return "canceled";
  return null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // verifyDodoWebhook both checks the signature AND returns the
  // already-JSON-parsed payload (the standardwebhooks lib does both
  // in one step) — no separate JSON.parse needed.
  const payload = verifyDodoWebhook(rawBody, req.headers) as unknown as DodoWebhookPayload | null;

  if (!payload) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const clinicId = payload.data?.metadata?.clinic_id;
  if (!clinicId) {
    // Can't route this event to a clinic — acknowledge so Dodo
    // doesn't retry, but log for investigation. This shouldn't
    // happen in practice since every checkout session this app
    // creates sets metadata.clinic_id (see lib/dodo/client.ts).
    console.warn("Dodo webhook missing clinic_id metadata:", payload.type);
    return NextResponse.json({ received: true });
  }

  const status = mapDodoStatus(payload.type);
  if (!status) {
    // Unrecognized/irrelevant event type for our purposes — ack, no-op.
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();
  const { data: clinic, error } = await supabase
    .from("clinics")
    .update({
      subscription_status: status,
      dodo_customer_id: payload.data.customer?.customer_id,
      dodo_subscription_id: payload.data.subscription_id,
      dodo_product_id: payload.data.product_id,
    })
    .eq("id", clinicId)
    .select("*")
    .single();

  if (error || !clinic) {
    console.error("Failed to update clinic subscription status:", error);
    return NextResponse.json({ error: "Database update failed" }, { status: 500 });
  }

  // The key automation: the instant a clinic's subscription goes
  // active for the FIRST time (agent not yet provisioned), kick off
  // agent creation. Guarded by agent_provisioning_status so renewal
  // events (which also map to "active") don't re-provision a
  // already-working agent.
  if (status === "active" && clinic.agent_provisioning_status === "pending") {
    // Intentionally NOT awaited inline before responding — Retell
    // provisioning involves 3 sequential API calls and can take a
    // few seconds, longer than we want to make Dodo's webhook
    // delivery wait. We still await it within this handler's
    // execution (Vercel functions run to completion regardless of
    // whether the response was already sent in some runtimes, but
    // to be safe and explicit, we await it before returning here —
    // serverless functions are not guaranteed to continue running
    // after returning a response). If provisioning takes too long
    // and risks the webhook timeout, move this to a queue (e.g.
    // Vercel Queue, Inngest, or a Supabase Edge Function trigered by
    // a DB row change) — noted as a scaling follow-up.
    const result = await provisionAiReceptionistAgent(clinic);
    if (!result.success) {
      // Don't fail the webhook over this — billing succeeded, that
      // part of the flow is done and should be acknowledged. The
      // clinic is now in agent_provisioning_status = 'failed',
      // visible to the admin in /admin/clients/[id] with a Retry
      // button (manual fallback, not the default path).
      console.error(`Auto-provisioning failed for clinic ${clinicId}:`, result.error);
    }
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}