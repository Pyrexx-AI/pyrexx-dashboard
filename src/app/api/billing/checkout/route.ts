/**
 * POST /api/billing/checkout
 * ───────────────────────────────────────────────────────────────
 * Creates a Dodo Payments checkout session for an EXISTING clinic's
 * subscription (self-serve "Manage Billing" in ProfilePanel, or an
 * admin re-sending a payment link from /admin/clients/[id]).
 *
 * This route requires an authenticated session. For the NEW-clinic
 * onboarding flow (no account exists yet), see
 * /api/onboarding/checkout instead — same underlying
 * createCheckoutSession() call, different auth model (see that
 * route's doc comment for why).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/dodo/client";
import { getPlan } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { clinicId } = await req.json();
  if (!clinicId) {
    return NextResponse.json({ error: "Missing clinicId" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const isOwnClinic = profile?.clinic_id === clinicId;

  if (!isAdmin && !isOwnClinic) {
    return NextResponse.json({ error: "Not authorized for this clinic" }, { status: 403 });
  }

  const { data: clinic } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", clinicId)
    .single();

  if (!clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }

  const plan = getPlan(clinic.plan_tier);
  const productId = process.env[plan.dodoProductIdEnvVar];
  if (!productId) {
    console.error(`Missing env var ${plan.dodoProductIdEnvVar} for plan tier ${clinic.plan_tier}`);
    return NextResponse.json({ error: "Billing is not fully configured for this plan yet" }, { status: 500 });
  }

  const origin = req.nextUrl.origin;

  try {
    const session = await createCheckoutSession({
      clinicId: clinic.id,
      clinicName: clinic.name,
      contactEmail: clinic.contact_email,
      productId,
      returnUrl: `${origin}/?billing=success`,
    });

    return NextResponse.json({ checkoutUrl: session.checkoutUrl });
  } catch (err) {
    console.error("Dodo checkout creation failed:", err);
    return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 });
  }
}