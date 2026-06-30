/**
 * Dodo Payments — API Client
 * ───────────────────────────────────────────────────────────────
 * Uses the real `dodopayments` server SDK (already in package.json).
 * Replaces an earlier draft that hand-rolled fetch() calls against
 * guessed endpoint shapes.
 *
 * Verified API surface (Dodo's Checkout Sessions API, the modern
 * replacement for the deprecated Subscriptions/Payments-with-
 * payment_link flow) — confirmed directly against the installed
 * `dodopayments` package's .d.ts files, not just documentation:
 *
 *   client.checkoutSessions.create({
 *     product_cart: [{ product_id, quantity }],
 *     customer: { email, name },
 *     return_url,
 *     metadata: {...},
 *   })
 *   → { session_id, checkout_url, client_secret, payment_id, publishable_key }
 *
 * `checkout_url` is what the browser is sent to (or what the
 * frontend embed SDK, `dodopayments-checkout`, opens inline/as an
 * overlay — see the onboarding wizard's payment step).
 */
import DodoPayments from "dodopayments";

function getClient() {
  return new DodoPayments({
    bearerToken: process.env.DODO_API_KEY!,
    environment: process.env.DODO_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
  });
}

export interface CreateCheckoutParams {
  clinicId: string;
  clinicName: string;
  contactEmail: string;
  /** Dodo product ID for the selected plan tier — see lib/plans.ts. */
  productId: string;
  returnUrl: string;
}

export interface DodoCheckoutSession {
  sessionId: string;
  checkoutUrl: string;
}

/**
 * Creates a Dodo Payments checkout session for a clinic's monthly
 * subscription. `metadata.clinic_id` round-trips through every
 * webhook event Dodo fires for this session, so
 * api/webhooks/dodo/route.ts can map the event back to the right
 * clinic row without guessing from email/name.
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<DodoCheckoutSession> {
  const client = getClient();

  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: params.productId, quantity: 1 }],
    customer: {
      email: params.contactEmail,
      name: params.clinicName,
    },
    metadata: { clinic_id: params.clinicId },
    return_url: params.returnUrl,
  });

  // The SDK types `checkout_url` as `string | null | undefined` —
  // it's only ever absent/null when `confirm: true` was passed
  // (synchronous payment confirmation, which this app doesn't use).
  // Fail loudly here rather than silently return an unusable session,
  // since the call sites can't redirect anywhere useful without it.
  if (!session.checkout_url) {
    throw new Error("Dodo checkout session created but no checkout_url was returned");
  }

  return {
    sessionId: session.session_id,
    checkoutUrl: session.checkout_url,
  };
}

/**
 * Opens Dodo's hosted customer billing portal for an existing
 * subscriber — lets the clinic update their card or view invoices.
 * Surfaced as "Manage Billing" in ProfilePanel.tsx.
 *
 * VERIFIED against the installed `dodopayments` SDK's type
 * definitions: the method is nested under `.customers`, and the
 * customer ID is a positional argument, not a body field —
 * `client.customers.customerPortal.create(customerId, { return_url })`.
 */
export async function createBillingPortalSession(
  dodoCustomerId: string,
  returnUrl: string
): Promise<{ portalUrl: string }> {
  const client = getClient();
  const portal = await client.customers.customerPortal.create(dodoCustomerId, {
    return_url: returnUrl,
  });
  return { portalUrl: portal.link };
}