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
            // middleware is also refreshing the session (see middleware.ts).
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
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}