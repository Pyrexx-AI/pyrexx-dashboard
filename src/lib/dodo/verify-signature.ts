/**
 * Dodo Payments — Webhook Signature Verification
 * ───────────────────────────────────────────────────────────────
 * Dodo signs webhook payloads (commonly via a `webhook-signature` /
 * `dodo-signature` header, HMAC-SHA256 over the raw body keyed with
 * your webhook secret — confirm the exact header name and signing
 * scheme against Dodo's current webhook docs when wiring this up,
 * as exact header naming can vary by provider version).
 *
 * Structurally identical to Retell's verification
 * (lib/retell/verify-signature.ts) — same HMAC + constant-time
 * comparison pattern, different secret/header.
 */
import crypto from "crypto";

export function verifyDodoSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string | undefined
): boolean {
  if (!signatureHeader || !webhookSecret) return false;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody, "utf-8")
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}