/**
 * POST /api/onboarding/finish
 * ───────────────────────────────────────────────────────────────
 * Third and final onboarding API call (start → checkout → finish).
 * Creates the clinic owner's actual login (email + password) and
 * attaches it to the clinic row created back in /api/onboarding/start.
 * This is the user-visible "signup" step — it runs LAST, after
 * documents are signed and payment is complete, matching the
 * requested flow order.
 *
 * Reuses the direct-REST-API approach to Supabase's admin auth
 * endpoint (rather than the @supabase/supabase-js Auth wrapper) —
 * this was a deliberate fix in an earlier iteration of this codebase
 * for an AuthRetryableFetchError class of bug, and surfaces real
 * database trigger errors immediately instead of swallowing them.
 *
 * GUARD: only proceeds if the clinic exists, is still in
 * 'onboarding' status, and has no existing profiles row — same
 * replay-protection reasoning as /api/onboarding/checkout.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

interface FinishBody {
  clinicId: string;
  password: string;
}

export async function POST(req: NextRequest) {
  let body: FinishBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { clinicId, password } = body;
  if (!clinicId || (password?.length ?? 0) < 8) {
    return NextResponse.json({ error: "Missing clinicId or password too short" }, { status: 400 });
  }

  const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrlRaw || !serviceRoleKey) {
    return NextResponse.json({ error: "Server missing Supabase credentials." }, { status: 500 });
  }

  const supabase = createAdminClient();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", clinicId)
    .single();

  if (!clinic || clinic.status !== "onboarding") {
    return NextResponse.json({ error: "Clinic not found or already set up" }, { status: 404 });
  }

  const { count: existingProfiles } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("clinic_id", clinicId);

  if (existingProfiles && existingProfiles > 0) {
    return NextResponse.json({ error: "This clinic has already completed signup" }, { status: 409 });
  }

  const supabaseUrl = supabaseUrlRaw.replace(/\/$/, "");

  try {
    const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        email: clinic.contact_email,
        password,
        email_confirm: true,
        user_metadata: {
          clinic_id: clinic.id,
          role: "owner",
          full_name: clinic.name,
        },
      }),
      cache: "no-store",
    });

    if (!authRes.ok) {
      const errorText = await authRes.text();
      console.error("Failed to create auth user (Direct API):", errorText);

      let errorMessage = "Could not create account.";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.msg || errorJson.message || errorMessage;

        if (errorMessage.toLowerCase().includes("database error creating new user")) {
          return NextResponse.json({ error: errorMessage, requiresDbFix: true }, { status: 500 });
        }
        if (
          errorMessage.toLowerCase().includes("already registered") ||
          errorMessage.toLowerCase().includes("already exists")
        ) {
          return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
        }
      } catch {
        // errorText wasn't JSON — fall through with the generic message
      }

      return NextResponse.json({ error: errorMessage }, { status: authRes.status });
    }

    const authData = await authRes.json();

    // Belt-and-suspenders: guarantee the profile exists even if the
    // handle_new_user() trigger silently no-ops for any reason.
    await supabase.from("profiles").upsert({
      id: authData.id,
      clinic_id: clinic.id,
      role: "owner",
      full_name: clinic.name,
    });

    // Onboarding form-filling + signing + payment are all done —
    // hand the clinic off to the admin queue for agent setup.
    await supabase
      .from("clinics")
      .update({ status: "pending_setup" })
      .eq("id", clinic.id);

    return NextResponse.json({ success: true });
  } catch (networkError) {
    console.error("Network crash during Auth fetch:", networkError);
    return NextResponse.json(
      { error: "Network error creating your account. Please try again or contact support." },
      { status: 500 }
    );
  }
}