/**
 * Dodo Payments — Webhook Signature Verification
 * ───────────────────────────────────────────────────────────────
 * CORRECTED VERSION: Dodo Payments uses the Standard Webhooks spec
 * (https://www.standardwebhooks.com), not a bespoke HMAC scheme.
 * Headers are `webhook-id`, `webhook-signature`, `webhook-timestamp`
 * (NOT a single `dodo-signature` header as an earlier draft of this
 * file assumed). The signed payload is `${id}.${timestamp}.${body}`,
 * base64-encoded (not hex), and the secret is typically prefixed
 * `whsec_`.
 *
 * Rather than hand-roll that scheme, use the official
 * `standardwebhooks` npm package, which Dodo's own docs reference
 * directly:
 *
 *   npm install standardwebhooks
 *
 * Usage in the webhook route:
 *   import { verifyDodoWebhook } from "@/lib/dodo/verify-signature";
 *   const event = verifyDodoWebhook(rawBody, req.headers);
 *   if (!event) return 401;
 */
import { Webhook } from "standardwebhooks";

export function verifyDodoWebhook(
  rawBody: string,
  headers: Headers
): Record<string, unknown> | null {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) return null;

  const webhookId = headers.get("webhook-id");
  const webhookSignature = headers.get("webhook-signature");
  const webhookTimestamp = headers.get("webhook-timestamp");

  if (!webhookId || !webhookSignature || !webhookTimestamp) return null;

  try {
    const wh = new Webhook(secret);
    // .verify() throws if the signature is invalid; returns the
    // parsed payload (already JSON.parsed) if valid.
    const payload = wh.verify(rawBody, {
      "webhook-id": webhookId,
      "webhook-signature": webhookSignature,
      "webhook-timestamp": webhookTimestamp,
    });
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}