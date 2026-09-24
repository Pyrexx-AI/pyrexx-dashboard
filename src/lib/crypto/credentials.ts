/**
 * Integration Credentials Encryption
 * ───────────────────────────────────────────────────────────────
 * FIX: `integration_credentials.credentials` (CRM API keys, account
 * identifiers) was previously stored as plaintext JSON — anyone
 * with read access to that table (a DB backup, a Supabase project
 * collaborator, a future RLS misconfiguration) would see raw
 * third-party credentials in the clear. This encrypts the JSON blob
 * with AES-256-GCM before it's written, using a server-only key that
 * never reaches the client or the database's own access surface.
 *
 * WHY APPLICATION-LAYER AES-GCM INSTEAD OF POSTGRES-LEVEL ENCRYPTION
 * (pgsodium / pgcrypto column encryption): those still leave the key
 * material reachable from inside Postgres (extensions, functions,
 * or anyone with sufficient DB privileges), and pgsodium in
 * particular is deprecated on newer Supabase platform versions.
 * Encrypting/decrypting in the Node runtime, with the key only ever
 * present as a server-side env var, keeps the plaintext credential
 * out of the database entirely.
 *
 * KEY MANAGEMENT: `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` must be a
 * base64-encoded 32-byte key (AES-256), e.g. generated with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * Store it only in your deployment platform's server-side env vars
 * (never NEXT_PUBLIC_*). Rotating this key requires re-encrypting
 * every existing row — not handled here, since this app currently
 * only has one CRM credential per clinic and rotation isn't yet a
 * built feature.
 */
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // NIST-recommended IV length for GCM

function getKey(): Buffer {
  const raw = process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "INTEGRATION_CREDENTIALS_ENCRYPTION_KEY is not set — cannot encrypt/decrypt integration credentials. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("INTEGRATION_CREDENTIALS_ENCRYPTION_KEY must decode to exactly 32 bytes (a base64-encoded AES-256 key).");
  }
  return key;
}

export interface EncryptedCredentialsBlob {
  _encrypted: true;
  v: 1;
  iv: string;
  tag: string;
  ciphertext: string;
}

function isEncryptedBlob(value: unknown): value is EncryptedCredentialsBlob {
  return !!value && typeof value === "object" && (value as any)._encrypted === true;
}

/** Encrypts a plain credentials object for storage in `integration_credentials.credentials`. */
export function encryptCredentials(plain: Record<string, unknown>): EncryptedCredentialsBlob {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const json = JSON.stringify(plain);
  const ciphertext = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    _encrypted: true,
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

/**
 * Decrypts a stored credentials blob back to a plain object.
 *
 * BACKWARDS COMPATIBILITY: if `stored` doesn't look like an
 * encrypted blob (i.e. `_encrypted` isn't `true`), it's returned
 * as-is. This handles any row written before this fix shipped,
 * which would still be plaintext JSON — those continue to work
 * (and get re-encrypted automatically the next time an admin saves
 * that clinic's credentials through updateCrmCredentials).
 */
export function decryptCredentials(stored: unknown): Record<string, unknown> {
  if (!stored || typeof stored !== "object") return {};
  if (!isEncryptedBlob(stored)) {
    return stored as Record<string, unknown>;
  }

  const key = getKey();
  const iv = Buffer.from(stored.iv, "base64");
  const tag = Buffer.from(stored.tag, "base64");
  const ciphertext = Buffer.from(stored.ciphertext, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return JSON.parse(plaintext.toString("utf8"));
}