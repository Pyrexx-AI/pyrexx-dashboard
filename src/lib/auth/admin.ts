/**
 * Admin Verification — Server Only
 * ───────────────────────────────────────────────────────────────
 * SERVER-ONLY. This file calls `createAdminClient()` (service-role
 * Supabase client, defined in lib/supabase/server.ts), which
 * imports "next/headers". It must NEVER be imported — even
 * transitively — from a "use client" file. Doing so previously
 * broke the production build entirely and caused runtime 500s /
 * stale-build 404s (see lib/auth/admin-client.ts for the full
 * incident writeup and the fix).
 *
 * Safe import sites: Server Components, Route Handlers, Server
 * Actions, and proxy.ts (Next.js 16's middleware equivalent, which
 * runs on the Node.js runtime and can safely use this).
 *
 * For the browser-safe email-whitelist check alone (e.g. from
 * LoginForm.tsx, a Client Component), import
 * `isWhitelistedAdminEmail` from "@/lib/auth/admin-client" directly
 * — do not import it from this file.
 */
import { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { isWhitelistedAdminEmail } from "@/lib/auth/admin-client";

// Re-exported for convenience / backwards compatibility for any
// existing server-side import sites — still safe here since this
// whole file is already server-only.
export { HARDCODED_ADMIN_EMAILS, isWhitelistedAdminEmail } from "@/lib/auth/admin-client";

/**
 * Single source of truth for verifying admin status across Next.js Server Components,
 * Route Handlers, Server Actions, and Proxy/Middleware.
 *
 * Checks:
 * 1. Hardcoded / domain whitelist / env vars
 * 2. Secure Auth Token app_metadata (set by Supabase Admin API)
 * 3. Database public.profiles role column via Service Role (bypassing RLS)
 */
export async function verifyAdminStatus(user: User | null): Promise<boolean> {
  if (!user) return false;

  const email = user.email?.toLowerCase().trim();

  // 1. Email whitelist check
  const isEmailAdmin = isWhitelistedAdminEmail(email);

  // 2. Token app_metadata / user_metadata check (app_metadata is server-only and tamper-proof)
  const isTokenAdmin =
    user.app_metadata?.role === "admin" ||
    user.user_metadata?.role === "admin";

  if (isEmailAdmin || isTokenAdmin) {
    // AUTO-HEAL: Ensure database public.profiles row reflects role = 'admin'
    try {
      const adminSupabase = createAdminClient();
      await adminSupabase.from("profiles").upsert(
        {
          id: user.id,
          role: "admin",
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || "Administrator",
        },
        { onConflict: "id" }
      );
    } catch (autoHealErr) {
      console.warn("[Admin Auth] Profile auto-healing notice (non-fatal):", autoHealErr);
    }
    return true;
  }

  // 3. Database Check using Service Role
  try {
    const adminSupabase = createAdminClient();
    const { data: profile, error } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!error && profile?.role === "admin") {
      return true;
    }
  } catch (dbErr) {
    console.warn("[Admin Auth] Database role lookup failed:", dbErr);
  }

  return false;
}