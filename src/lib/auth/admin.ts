import { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { isWhitelistedAdminEmail } from "@/lib/auth/admin-client";

export { HARDCODED_ADMIN_EMAILS, isWhitelistedAdminEmail } from "@/lib/auth/admin-client";

/**
 * High-performance, zero-write admin verification.
 * Safe for proxy/middleware execution.
 */
export async function verifyAdminStatus(user: User | null): Promise<boolean> {
  if (!user) return false;

  const email = user.email?.toLowerCase().trim();

  // 1. In-memory check against whitelisted admin emails
  if (isWhitelistedAdminEmail(email)) {
    return true;
  }

  // 2. Cryptographically signed JWT claims (zero I/O)
  if (user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin") {
    return true;
  }

  // 3. Database read fallback via Service Role (read-only query)
  try {
    const adminSupabase = createAdminClient();
    const { data: profile, error } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && profile?.role === "admin") {
      return true;
    }
  } catch (dbErr) {
    console.warn("[Admin Auth] Database role lookup failed:", dbErr);
  }

  return false;
}