/**
 * Supabase — Browser Client
 * ───────────────────────────────────────────────────────────────
 * Use this in Client Components ("use client"). It reads/writes
 * the session via cookies automatically through @supabase/ssr.
 *
 * Usage:
 *   import { createClient } from "@/lib/supabase/client";
 *   const supabase = createClient();
 *   const { data } = await supabase.from("clinics").select("*");
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}