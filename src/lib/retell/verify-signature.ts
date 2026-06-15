/**
 * Retell AI — Webhook Signature Verification
 * ───────────────────────────────────────────────────────────────
 * Every webhook Retell sends includes an `x-retell-signature` header.
 * This MUST be verified before processing the payload — otherwise
 * anyone who discovers your webhook URL could POST fake call data
 * (fake bookings, fake transcripts) into the dashboard.
 *
 * Retell signs using HMAC-SHA256 over the raw request body, keyed
 * with your Retell API key. Reference:
 * https://docs.retellai.com/features/webhook-overview
 *
 * IMPORTANT: This function expects the RAW request body string —
 * not a parsed object — because signatures are computed over exact
 * bytes. In the Next.js route handler, read the body with
 * `await req.text()` BEFORE calling JSON.parse().
 */

import crypto from "crypto";

export function verifyRetellSignature(
  rawBody: string,
  signatureHeader: string | null,
  apiKey: string | undefined
): boolean {
  if (!signatureHeader || !apiKey) return false;

  const expected = crypto
    .createHmac("sha256", apiKey)
    .update(rawBody, "utf-8")
    .digest("hex");

  // Constant-time comparison to avoid timing attacks
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
