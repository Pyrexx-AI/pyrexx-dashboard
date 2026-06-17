/**
 * Supabase — Middleware Session Helper
 * ───────────────────────────────────────────────────────────────
 * Refreshes the auth session on every request and keeps cookies in
 * sync between the browser and server. Called from src/middleware.ts.
 *
 * This file does NOT do route protection — that logic lives in
 * src/middleware.ts so it's visible in one place alongside the
 * admin/clinic role checks.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: this call refreshes the session token if expired.
  // Do not remove — without it, sessions silently stop working
  // after the access token's TTL elapses.
  const { data: { user } } = await supabase.auth.getUser();

  return { response, user, supabase };
}