/**
 * POST /api/onboarding
 * ───────────────────────────────────────────────────────────────
 * Handles the final submit of OnboardingWizard. Runs server-side
 * with the SERVICE ROLE client so:
 *   - The `clinics` row can be created WITHOUT needing a public
 *     "anyone can insert" RLS policy (which would be a standing
 *     security hole — see 0001_init_schema.sql, clinics has no
 *     insert policy for anon/authenticated, only for admins).
 *   - The auth user and `profiles` row are created in the same
 *     request, linked via `clinic_id` in user metadata (consumed
 *     by the `handle_new_user()` trigger).
 *
 * RESULT: a new clinic with status = 'onboarding', and one user
 * with role = 'owner' linked to it. The clinic then appears in
 * /admin for the agency to begin DFY setup (Step 2 in
 * RETELL_INTEGRATION.md → now AI_RECEPTIONIST_INTEGRATION.md).
 *
 * VALIDATION: This is intentionally minimal (non-empty checks).
 * For production, add a schema validator (e.g. zod) and rate
 * limiting — this is a public, unauthenticated endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { CrmProvider } from "@/types/database";

interface OnboardingBody {
  clinicName: string;
  website: string | null;
  phoneNumber: string;
  contactEmail: string;
  crmProvider: CrmProvider;
  crmOtherName: string | null;
  receptionistName: string;
  password: string;
}

export async function POST(req: NextRequest) {
  let body: OnboardingBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    clinicName, website, phoneNumber, contactEmail,
    crmProvider, crmOtherName, receptionistName, password,
  } = body;

  if (!clinicName?.trim() || !phoneNumber?.trim() || !contactEmail?.trim() ||
      !receptionistName?.trim() || !crmProvider || (password?.length ?? 0) < 8) {
    return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 1. Create the clinic row.
  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .insert({
      name: clinicName.trim(),
      website: website?.trim() || null,
      phone_number: phoneNumber.trim(),
      contact_email: contactEmail.trim().toLowerCase(),
      crm_provider: crmProvider,
      crm_other_name: crmProvider === "other" ? crmOtherName?.trim() || null : null,
      receptionist_name: receptionistName.trim(),
      status: "onboarding",
    })
    .select("id")
    .single();

  if (clinicError || !clinic) {
    console.error("Failed to create clinic:", clinicError);
    return NextResponse.json({ error: "Could not create clinic record" }, { status: 500 });
  }

  // 2. Create the auth user, attaching clinic_id + role via metadata.
  //    The `handle_new_user()` trigger reads this metadata to create
  //    the matching `profiles` row automatically.
  const { error: authError } = await supabase.auth.admin.createUser({
    email: contactEmail.trim().toLowerCase(),
    password,
    email_confirm: true, // skip email verification for DFY onboarding;
                          // set to false if you want a confirmation step
    user_metadata: {
      clinic_id: clinic.id,
      role: "owner",
      full_name: clinicName.trim(),
    },
  });

  if (authError) {
    // Roll back the clinic row if user creation failed, so retries
    // don't pile up orphaned clinic records.
    await supabase.from("clinics").delete().eq("id", clinic.id);

    if (authError.message.toLowerCase().includes("already registered")) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error("Failed to create auth user:", authError);
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }

  return NextResponse.json({ success: true, clinicId: clinic.id });
}