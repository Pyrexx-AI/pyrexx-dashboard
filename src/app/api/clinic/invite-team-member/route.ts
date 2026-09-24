/**
 * POST /api/clinic/invite-team-member
 * ───────────────────────────────────────────────────────────────
 * Lets a clinic OWNER (not staff — see role check below) invite a
 * teammate to their clinic's dashboard. Backs ProfilePanel.tsx's
 * "Invite" button on Team Members, which previously rendered but
 * did nothing at all.
 *
 * Uses Supabase's built-in `auth.admin.inviteUserByEmail` — this
 * sends the invite email itself via Supabase's configured email
 * templates, so no separate email/SMTP provider is required. The
 * `data: { clinic_id, role: 'staff' }` passed here is read by the
 * handle_new_user() trigger (supabase/migrations/0001_init_schema.sql)
 * the moment the invited user's auth.users row is created, which is
 * what actually links their new profile to this clinic as staff —
 * verified end-to-end against a real Postgres instance during Phase 3.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const clinicId = body?.clinicId as string | undefined;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : undefined;

  if (!clinicId || !email || !isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, clinic_id")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  // Only the OWNER of the clinic (not staff) can invite — a
  // deliberately narrower permission than "any team member can add
  // more team members."
  const isOwnerOfThisClinic = profile?.role === "owner" && profile?.clinic_id === clinicId;

  if (!isAdmin && !isOwnerOfThisClinic) {
    return NextResponse.json({ error: "Forbidden: Only the clinic owner can invite team members." }, { status: 403 });
  }

  const adminSupabase = createAdminClient();
  const origin = req.nextUrl.origin;

  const { error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    data: { clinic_id: clinicId, role: "staff" },
    redirectTo: `${origin}/login`,
  });

  if (error) {
    // Supabase returns a specific message for "user already exists" —
    // surface it plainly rather than a generic failure.
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}