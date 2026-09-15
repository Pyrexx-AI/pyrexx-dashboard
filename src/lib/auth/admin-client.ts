/**
 * Admin Whitelist — Client-Safe
 * ───────────────────────────────────────────────────────────────
 * PURE, BROWSER-SAFE LOGIC ONLY. No imports from "next/headers",
 * "@/lib/supabase/server", or anything else server-only.
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM lib/auth/admin.ts:
 * `isWhitelistedAdminEmail` is used by LoginForm.tsx, a Client
 * Component, to optimistically route a just-logged-in user before
 * the page reloads. Previously this lived in the same file as
 * `verifyAdminStatus` (which calls `createAdminClient()` from
 * lib/supabase/server.ts, which imports `next/headers`). Because
 * ES modules bundle at the file level, importing ONE export from
 * that file pulled the ENTIRE module — including the next/headers
 * import chain — into the browser bundle. Next.js correctly refuses
 * to bundle "next/headers" for the client, which broke:
 *   - The production build entirely (`next build` failed)
 *   - `/login` at runtime in dev (500 error)
 *   - Every other route that only shipped because an OLDER,
 *     pre-breakage build was still deployed (e.g. `/admin/legal`
 *     404ing while older admin routes kept working)
 *
 * FIX: pure/client-safe logic lives here. Anything that touches the
 * database or the service-role key lives in lib/auth/admin.ts,
 * which must only ever be imported from Server Components, Route
 * Handlers, Server Actions, or proxy.ts — never from a "use client"
 * file, even transitively.
 */

/**
 * Fallback administrative emails and domain that are ALWAYS granted executive privileges.
 */
export const HARDCODED_ADMIN_EMAILS = [
  "admin@pyrexxai.com",
  "clifford@pyrexxai.com",
  "hello@pyrexxai.com",
];

/**
 * Fast synchronous check for known admin email addresses or domain patterns.
 *
 * NOTE: `process.env.ADMIN_EMAIL` / `ADMIN_EMAILS` below are only
 * read here for convenience of keeping the whitelist check in one
 * place — in a Client Component bundle, non-NEXT_PUBLIC_ env vars
 * are inlined as `undefined` at build time (Next.js does not leak
 * server env values into the browser), so this still resolves
 * correctly and safely on both sides: server callers get the real
 * value, browser callers just fall through to the hardcoded list.
 */
export function isWhitelistedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();

  if (HARDCODED_ADMIN_EMAILS.includes(normalized)) return true;
  if (normalized.endsWith("@pyrexxai.com")) return true;

  const envAdmin = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (envAdmin && envAdmin === normalized) return true;

  const envAdmins = process.env.ADMIN_EMAILS?.toLowerCase().split(",").map((e) => e.trim());
  if (envAdmins && envAdmins.includes(normalized)) return true;

  return false;
}