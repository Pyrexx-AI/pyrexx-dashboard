/**
 * POST /api/clinic/update-profile
 * ───────────────────────────────────────────────────────────────
 * Lets a clinic's own owner/staff (or an admin) update their
 * clinic's basic profile fields. Backs two previously-dead buttons
 * in ProfilePanel.tsx: "Edit" on Clinic Profile (name/phone/website)
 * and "Edit" on AI Receptionist (receptionist_name — the only field
 * in that section that's actually a real column; voice/hours/greeting
 * shown there are display-only derived text, not stored anywhere).
 *
 * Only name/phone_number/website/receptionist_name are updatable
 * here — deliberately excludes plan_tier, subscription_status,
 * agent_id, and everything else an admin manages from
 * /admin/clients/[id]. Uses the regular RLS-scoped client (not the
 * service-role client) so the database's own
 * "clinics_update_own_or_admin" policy (see
 * supabase/migrations/0001_init_schema.sql) is the actual
 * enforcement point, not just this route's application-level check.
 *
 * Accepts a partial update — pass only the fields you're changing.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const clinicId = body?.clinicId as string | undefined;
  if (!clinicId) {
    return NextResponse.json({ error: "Missing clinicId" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, clinic_id")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const isOwnClinic = profile?.clinic_id === clinicId;

  if (!isAdmin && !isOwnClinic) {
    return NextResponse.json({ error: "Forbidden: You cannot edit another clinic's profile." }, { status: 403 });
  }

  const updates: { name?: string; phone_number?: string; website?: string | null; receptionist_name?: string } = {};
  if (typeof body?.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (typeof body?.phoneNumber === "string" && body.phoneNumber.trim()) updates.phone_number = body.phoneNumber.trim();
  if (typeof body?.website === "string") updates.website = body.website.trim() || null;
  if (typeof body?.receptionistName === "string" && body.receptionistName.trim()) updates.receptionist_name = body.receptionistName.trim();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("clinics")
    .update(updates)
    .eq("id", clinicId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, clinic: updated });
}