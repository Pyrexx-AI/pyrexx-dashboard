/**
 * Supabase — Server Client
 * ───────────────────────────────────────────────────────────────
 * Use this in Server Components, Server Actions, and Route Handlers.
 * Reads the session from cookies on the incoming request.
 *
 * Usage:
 *   import { createClient } from "@/lib/supabase/server";
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from a Server Component during render,
            // where cookie mutation isn't allowed. Safe to ignore if
            // middleware is also refreshing the session (see proxy.ts).
          }
        },
      },
    }
  );
}

/**
 * Admin client — uses the SERVICE ROLE key, bypasses RLS entirely.
 *
 * ONLY use this for:
 *   - Webhook handlers (Retell, Dodo) writing call_records / billing
 *     status, where there is no authenticated user session.
 *   - Admin-only server actions in /app/admin, AFTER verifying the
 *     calling user's role === 'admin' via the regular server client.
 *
 * NEVER import this into anything that runs in the browser, and
 * never use it to serve data back to a clinic user without an
 * explicit, deliberate authorization check first — it ignores every
 * RLS policy in 0001_init_schema.sql.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Fatal: Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment.");
    throw new Error("Server configuration error: Missing Supabase Admin API keys.");
  }

  return createSupabaseClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    { 
      auth: { autoRefreshToken: false, persistSession: false },
      // FIX: Forces the Supabase client to use the Next.js global fetch, 
      // preventing Node.js fetch desyncs in server environments.
      global: { fetch: fetch } 
    }
  );
}