/**
 * POST /api/onboarding/checkout
 * ───────────────────────────────────────────────────────────────
 * Second of three onboarding API calls (start → checkout → finish).
 * Creates a Dodo checkout session for a clinic that was just created
 * by /api/onboarding/start, BEFORE that clinic has any login.
 *
 * UNAUTHENTICATED BY NECESSITY: there's no session to check yet —
 * the whole point of this route existing separately from
 * /api/billing/checkout is that one requires auth and this one
 * can't. The safety boundary here isn't a session check, it's:
 *   1. `clinicId` must reference a real clinic.
 *   2. That clinic's status must still be 'onboarding' (once an
 *      admin or the finish step moves it forward, this stops
 *      working for that id).
 *   3. That clinic must have NO existing `profiles` row (i.e. nobody
 *      has completed signup for it yet) — prevents someone who
 *      guessed/observed a clinic_id from generating new checkout
 *      sessions against an already-claimed account.
 * A stray extra checkout session even within those bounds isn't
 * exploitable for fraud — it still requires real payment details and
 * money still goes to Pyrexx's own Dodo account.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/dodo/client";
import { getPlan } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const { clinicId } = await req.json();
  if (!clinicId) {
    return NextResponse.json({ error: "Missing clinicId" }, { status: 400 });
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

  const plan = getPlan(clinic.plan_tier);
  const productId = process.env[plan.dodoProductIdEnvVar];
  if (!productId) {
    console.error(`Missing env var ${plan.dodoProductIdEnvVar} for plan tier ${clinic.plan_tier}`);
    return NextResponse.json({ error: "Billing is not fully configured yet — contact support" }, { status: 500 });
  }

  const origin = req.nextUrl.origin;

  try {
    const session = await createCheckoutSession({
      clinicId: clinic.id,
      clinicName: clinic.name,
      contactEmail: clinic.contact_email,
      productId,
      returnUrl: `${origin}/signup/finish?clinicId=${clinic.id}`,
    });

    return NextResponse.json({ checkoutUrl: session.checkoutUrl, sessionId: session.sessionId });
  } catch (err) {
    console.error("Dodo checkout creation failed during onboarding:", err);
    return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 });
  }
}