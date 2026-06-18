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
 * /admin for the agency to begin DFY setup.
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

  const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrlRaw || !serviceRoleKey) {
    return NextResponse.json({ error: "Server missing Supabase credentials." }, { status: 500 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (initError) {
    return NextResponse.json({ error: (initError as Error).message }, { status: 500 });
  }

  // 1. Create the clinic row via normal PostgREST interface.
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
    .select("*")
    .single();

  if (clinicError || !clinic) {
    console.error("Failed to create clinic:", clinicError);
    return NextResponse.json({ error: "Could not create clinic record. Please try again." }, { status: 500 });
  }

  // 2. Direct REST API fetch to the Supabase Admin Auth endpoint.
  // This completely bypasses the `@supabase/supabase-js` Auth wrapper, dodging the
  // `AuthRetryableFetchError` bug and exposing the real database trigger errors instantly.
  const supabaseUrl = supabaseUrlRaw.replace(/\/$/, ""); 

  try {
    const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        email: contactEmail.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          clinic_id: clinic.id,
          role: "owner",
          full_name: clinicName.trim(),
        }
      }),
      cache: "no-store" // Prevent Next.js from caching this POST
    });

    if (!authRes.ok) {
      const errorText = await authRes.text();
      console.error("Failed to create auth user (Direct API):", errorText);
      
      // Roll back the clinic row since auth failed
      await supabase.from("clinics").delete().eq("id", clinic.id);

      // Attempt to parse the exact error from Supabase
      let errorMessage = "Could not create account.";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.msg || errorJson.message || errorMessage;
        
        // INTERCEPT THE DATABASE HEX
        if (errorMessage.toLowerCase().includes("database error creating new user")) {
          return NextResponse.json({ 
            error: errorMessage,
            requiresDbFix: true
          }, { status: 500 });
        }

        if (errorMessage.toLowerCase().includes("already registered") || errorMessage.toLowerCase().includes("already exists")) {
          return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
        }
      } catch (e) {
        // Fallback if not JSON
      }

      return NextResponse.json({ error: errorMessage }, { status: authRes.status });
    }

    const authData = await authRes.json();

    // 3. Guarantee the profile exists
    // By creating it manually here via PostgREST, we ensure the profile is generated 
    // even if the user applies our "safe" DB trigger fix which suppresses errors.
    await supabase.from("profiles").upsert({
      id: authData.id,
      clinic_id: clinic.id,
      role: "owner",
      full_name: clinicName.trim()
    });

    return NextResponse.json({ success: true, clinicId: clinic.id });

  } catch (networkError) {
    console.error("Network crash during Auth fetch:", networkError);
    await supabase.from("clinics").delete().eq("id", clinic.id);
    return NextResponse.json({ 
      error: "Network Error: Could not reach the authentication provider. Check if your local Supabase instance is fully running." 
    }, { status: 500 });
  }
}