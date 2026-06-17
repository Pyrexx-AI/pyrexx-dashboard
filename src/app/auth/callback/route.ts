/**
 * GET /auth/callback
 * ───────────────────────────────────────────────────────────────
 * Supabase redirects here after email confirmation or a magic-link
 * click, with a `code` query param. Exchanging it sets the session
 * cookie via the server client, then redirects into the app.
 *
 * Not used by the DFY onboarding flow as written (email_confirm:
 * true skips confirmation), but kept for:
 *   - Password reset links
 *   - Magic-link sign-in (if added later)
 *   - Re-enabling email confirmation for self-serve signups
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}