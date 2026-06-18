// src/app/api/billing/checkout/route.ts
/**
 * POST /api/billing/checkout
 * ───────────────────────────────────────────────────────────────
 * Creates a Dodo Payments checkout session for the $1,000/mo Pyrexx
 * AI Receptionist plan and returns the URL to redirect the clinic to.
 *
 * WHO CALLS THIS:
 *   - The admin, from /admin/clients/[id], when moving a clinic to
 *     'active' and they haven't subscribed yet (DFY flow: agency
 *     sends the clinic this checkout link directly).
 *   - OR the clinic owner themselves, from ProfilePanel's
 *     "Manage Billing" section, if self-serve billing is enabled.
 *
 * Both paths are supported — this route only needs a valid
 * authenticated session (checked via the server client) plus a
 * clinicId the caller is authorized to act on. Admins can pass any
 * clinicId; clinic users are restricted to their own.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/dodo/client";

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

  const origin = req.nextUrl.origin;

  try {
    const session = await createCheckoutSession({
      clinicId: clinic.id,
      clinicName: clinic.name,
      contactEmail: clinic.contact_email,
      productId: process.env.DODO_PRODUCT_ID!, // the $1,000/mo plan, created once in the Dodo dashboard
      successUrl: `${origin}/?billing=success`,
      cancelUrl: `${origin}/?billing=canceled`,
    });

    return NextResponse.json({ checkoutUrl: session.checkout_url });
  } catch (err) {
    console.error("Dodo checkout creation failed:", err);
    return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 });
  }
}