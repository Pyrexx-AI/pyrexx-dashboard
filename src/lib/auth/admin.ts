import { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

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