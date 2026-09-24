// src/app/api/webhooks/dodo/route.ts
import { NextRequest, NextResponse, after } from "next/server";
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
  ) {
    return "canceled";
  }
  return null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const payload = verifyDodoWebhook(rawBody, req.headers) as unknown as DodoWebhookPayload | null;

  if (!payload) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const clinicId = payload.data?.metadata?.clinic_id;
  if (!clinicId) {
    console.warn("[Dodo Webhook] Missing clinic_id metadata:", payload.type);
    return NextResponse.json({ received: true });
  }

  const status = mapDodoStatus(payload.type);
  if (!status) {
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  // 1. Update billing details
  const { data: clinic, error } = await supabase
    .from("clinics")
    .update({
      subscription_status: status,
      dodo_customer_id: payload.data.customer?.customer_id,
      dodo_subscription_id: payload.data.subscription_id,
      dodo_product_id: payload.data.product_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clinicId)
    .select("*")
    .single();

  if (error || !clinic) {
    console.error("[Dodo Webhook] DB update failed:", error);
    return NextResponse.json({ error: "Database update failed" }, { status: 500 });
  }

  // 2. ATOMIC CAS PROVISIONING LOCK:
  // Conditionally transition from 'pending' -> 'provisioning' atomically.
  // If concurrent webhooks arrive, only the transaction that acquires the lock gets 1 row back.
  if (status === "active") {
    const { data: lockedClinic } = await supabase
      .from("clinics")
      .update({ agent_provisioning_status: "provisioning", agent_provisioning_error: null })
      .eq("id", clinicId)
      .eq("agent_provisioning_status", "pending")
      .select("*")
      .maybeSingle();

    if (lockedClinic) {
      after(async () => {
        const result = await provisionAiReceptionistAgent(lockedClinic);
        if (!result.success) {
          console.error(`[Auto-Provisioning] Failed for clinic ${clinicId}:`, result.error);
        }
      });
    }
  }

  return NextResponse.json({ received: true });
}