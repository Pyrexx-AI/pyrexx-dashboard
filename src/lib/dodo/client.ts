/**
 * Dodo Payments — API Client Wrapper
 * ───────────────────────────────────────────────────────────────
 * Thin wrapper around Dodo's REST API for the two operations this
 * app needs: creating a checkout session for a new subscription,
 * and (optionally) opening the customer portal for self-service
 * billing management.
 *
 * Dodo's official Node SDK (`dodopayments`) is the preferred way to
 * call their API — installing it gives typed methods automatically.
 * If not yet installed, run: npm install dodopayments
 *
 * This wrapper deliberately stays thin and uses fetch() directly so
 * the code remains correct even before the SDK is added — swap the
 * fetch() calls below for SDK method calls once installed, the
 * call sites (api/billing/checkout, api/webhooks/dodo) don't need
 * to change.
 */

const DODO_API_BASE = process.env.DODO_API_BASE_URL || "https://api.dodopayments.com";

function dodoHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.DODO_API_KEY}`,
  };
}

export interface CreateCheckoutParams {
  clinicId: string;
  clinicName: string;
  contactEmail: string;
  /** Dodo product/price ID for the $1,000/mo plan — created once in the Dodo dashboard. */
  productId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface DodoCheckoutSession {
  id: string;
  checkout_url: string;
}

/**
 * Creates a Dodo Payments checkout session for a clinic's monthly
 * subscription. The clinic is redirected to `checkout_url` to enter
 * payment details; on completion Dodo fires a webhook (see
 * api/webhooks/dodo/route.ts) which marks the clinic's subscription
 * active in Supabase.
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<DodoCheckoutSession> {
  const res = await fetch(`${DODO_API_BASE}/checkouts`, {
    method: "POST",
    headers: dodoHeaders(),
    body: JSON.stringify({
      product_id: params.productId,
      customer: {
        email: params.contactEmail,
        name: params.clinicName,
      },
      // Round-trips through Dodo's webhook payload (`metadata` field)
      // so api/webhooks/dodo can map the event back to a clinic row
      // without guessing from email/name.
      metadata: { clinic_id: params.clinicId },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dodo checkout creation failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Opens Dodo's hosted customer billing portal for an existing
 * subscriber — lets the clinic update their card or view invoices
 * without building custom billing UI. Surfaced as "Manage Billing"
 * in ProfilePanel.tsx.
 */
export async function createBillingPortalSession(
  dodoCustomerId: string,
  returnUrl: string
): Promise<{ portal_url: string }> {
  const res = await fetch(`${DODO_API_BASE}/customers/${dodoCustomerId}/portal`, {
    method: "POST",
    headers: dodoHeaders(),
    body: JSON.stringify({ return_url: returnUrl }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dodo portal session failed (${res.status}): ${text}`);
  }

  return res.json();
}