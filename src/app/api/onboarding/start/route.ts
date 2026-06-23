/**
 * POST /api/onboarding/start
 * ───────────────────────────────────────────────────────────────
 * First of three onboarding API calls (start → checkout → finish).
 * Called the moment the wizard's Document Review & Sign step is
 * completed — BEFORE payment, BEFORE account creation.
 *
 * WHY CREATE THE CLINIC ROW THIS EARLY (before payment/signup)?
 * This is the resolution to the central grey area in this flow: the
 * user-visible order is "view & sign documents → pay → sign up →
 * see dashboard", but Dodo's checkout session needs a real clinic_id
 * in its metadata to route the eventual webhook back to (see
 * api/webhooks/dodo/route.ts). If we waited until AFTER payment to
 * create any database record, a successful payment with a lost
 * browser session (tab closed, network blip) would have nowhere to
 * land — an unrecoverable "paid but no account" state.
 *
 * By creating the clinic row here, BEFORE payment, the payment step
 * always has a stable target. The auth login (email + password) is
 * still created LAST, in /api/onboarding/finish, matching the
 * requested UX order where "signup" is the final step before the
 * dashboard.
 *
 * TRADE-OFF, DISCLOSED: this does mean a visitor who reaches the
 * Documents step but abandons before paying leaves behind an orphaned
 * `clinics` row (status: 'onboarding', no attached user, no
 * subscription). This is intentional and low-cost — it's just a
 * row sitting in the admin's "Needs Setup" queue. See
 * AI_RECEPTIONIST_INTEGRATION.md "Grey areas" for the recommended
 * cleanup approach (a scheduled job removing onboarding-status
 * clinics with no signed_agreements/payment after N days).
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { CrmProvider, PlanTier } from "@/types/database";

interface SignedDoc {
  documentType: string;
  documentVersion: string;
  signerName: string;
  signerTitle?: string;
}

interface OnboardingStartBody {
  clinicName: string;
  website: string | null;
  phoneNumber: string;
  contactEmail: string;
  crmProvider: CrmProvider;
  crmOtherName: string | null;
  receptionistName: string;
  planTier: PlanTier;
  signedDocuments: SignedDoc[];
}

export async function POST(req: NextRequest) {
  let body: OnboardingStartBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    clinicName, website, phoneNumber, contactEmail,
    crmProvider, crmOtherName, receptionistName, planTier, signedDocuments,
  } = body;

  if (
    !clinicName?.trim() || !phoneNumber?.trim() || !contactEmail?.trim() ||
    !receptionistName?.trim() || !crmProvider || !planTier ||
    !Array.isArray(signedDocuments) || signedDocuments.length === 0
  ) {
    return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
  }

  if (planTier === "usage_based") {
    return NextResponse.json({ error: "That plan isn't available yet" }, { status: 400 });
  }

  const supabase = createAdminClient();

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
      plan_tier: planTier,
      status: "onboarding",
    })
    .select("id")
    .single();

  if (clinicError || !clinic) {
    console.error("Failed to create clinic:", clinicError);
    return NextResponse.json({ error: "Could not create clinic record. Please try again." }, { status: 500 });
  }

  // Record each signed document. Done as a separate insert (not part
  // of the clinics insert) so a failure here doesn't block the
  // clinic from existing — we'd rather have a clinic with a logging
  // gap than no clinic at all. Failures are logged, not surfaced to
  // the user as a hard error, since the wizard's UI already required
  // scroll-to-bottom + typed name before allowing this submit.
  const agreementRows = signedDocuments.map((doc) => ({
    clinic_id: clinic.id,
    document_type: doc.documentType,
    document_version: doc.documentVersion,
    signer_name: doc.signerName.trim(),
    signer_title: doc.signerTitle?.trim() || null,
    ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
  }));

  const { error: agreementsError } = await supabase
    .from("signed_agreements")
    .insert(agreementRows);

  if (agreementsError) {
    console.error(`Failed to record signed_agreements for clinic ${clinic.id}:`, agreementsError);
  }

  return NextResponse.json({ success: true, clinicId: clinic.id });
}