import { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

// Fallback admin emails / domains that are ALWAYS granted admin authority
const HARDCODED_ADMIN_EMAILS = [
  "admin@pyrexxai.com",
  "clifford@pyrexxai.com",
  "hello@pyrexxai.com",
];

export async function verifyAdminStatus(user: User | null): Promise<boolean> {
  if (!user || !user.email) return false;

  const email = user.email.toLowerCase().trim();

  // 1. Check if email is in the admin whitelist or ends with @pyrexxai.com
  const isEmailAdmin = 
    HARDCODED_ADMIN_EMAILS.includes(email) || 
    email.endsWith("@pyrexxai.com") ||
    process.env.ADMIN_EMAIL?.toLowerCase() === email ||
    process.env.ADMIN_EMAILS?.toLowerCase().split(",").map(e => e.trim()).includes(email);

  // 2. Check Auth Metadata
  const isMetaAdmin = 
    user.user_metadata?.role === "admin" || 
    user.app_metadata?.role === "admin";

  if (isEmailAdmin || isMetaAdmin) {
    // AUTO-HEAL: Ensure database public.profiles row reflects role = 'admin'
    try {
      const adminSupabase = createAdminClient();
      await adminSupabase.from("profiles").upsert({
        id: user.id,
        role: "admin",
        full_name: user.user_metadata?.full_name || "Administrator",
      }, { onConflict: "id" });
    } catch (e) {
      console.warn("Profile auto-healing notice:", e);
    }
    return true;
  }

  // 3. Database Check using Service Role (Bypasses RLS)
  try {
    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      return true;
    }
  } catch (e) {
    // Database query failed
  }

  return false;
}