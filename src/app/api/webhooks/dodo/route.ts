/**
 * POST /api/webhooks/dodo
 * ───────────────────────────────────────────────────────────────
 * Receives Dodo Payments subscription lifecycle events and keeps
 * `clinics.subscription_status` / `dodo_customer_id` /
 * `dodo_subscription_id` in sync.
 *
 * EVENTS HANDLED (confirm exact event names against Dodo's current
 * webhook docs — naming may differ slightly, e.g. "subscription.active"
 * vs "subscription.activated"):
 *   - checkout.completed       → first payment succeeded, subscription created
 *   - subscription.active      → subscription confirmed active
 *   - subscription.renewed     → recurring payment succeeded
 *   - subscription.past_due    → payment failed, retrying
 *   - subscription.canceled    → subscription ended
 *
 * Uses the SERVICE ROLE client (no user session exists for a
 * webhook request) — same pattern as the Retell webhook handler.
 *
 * SECURITY: signature verified before any processing — see
 * lib/dodo/verify-signature.ts. Update the header name there to
 * match Dodo's exact webhook signing header once confirmed.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyDodoSignature } from "@/lib/dodo/verify-signature";
import { createAdminClient } from "@/lib/supabase/server";
import type { SubscriptionStatus } from "@/types/database";

interface DodoWebhookPayload {
  type: string;
  data: {
    id: string;                 // subscription or checkout id
    customer_id: string;
    metadata?: { clinic_id?: string };
    status?: string;
  };
}

function mapDodoStatus(eventType: string): SubscriptionStatus | null {
  if (eventType === "checkout.completed" || eventType === "subscription.active") return "active";
  if (eventType === "subscription.renewed") return "active";
  if (eventType === "subscription.past_due") return "past_due";
  if (eventType === "subscription.canceled") return "canceled";
  return null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("dodo-signature"); // confirm exact header name with Dodo docs

  const isValid = verifyDodoSignature(rawBody, signature, process.env.DODO_WEBHOOK_SECRET);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: DodoWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const clinicId = payload.data.metadata?.clinic_id;
  if (!clinicId) {
    // Can't route this event to a clinic — acknowledge so Dodo
    // doesn't retry, but log for investigation.
    console.warn("Dodo webhook missing clinic_id metadata:", payload.type);
    return NextResponse.json({ received: true });
  }

  const status = mapDodoStatus(payload.type);
  if (!status) {
    // Unrecognized/irrelevant event type — acknowledge, no-op.
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("clinics")
    .update({
      subscription_status: status,
      dodo_customer_id: payload.data.customer_id,
      dodo_subscription_id: payload.data.id,
    })
    .eq("id", clinicId);

  if (error) {
    console.error("Failed to update clinic subscription status:", error);
    return NextResponse.json({ error: "Database update failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}