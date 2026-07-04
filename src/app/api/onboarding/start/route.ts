import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plans";
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
  const plan = getPlan(planTier); // Fetch plan details to get the price

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
      plan_price_cents: plan?.priceCents || 0, // Prevent NOT NULL Postgres errors
      status: "onboarding",
    })
    .select("id")
    .single();

  if (clinicError || !clinic) {
    console.error("Failed to create clinic in DB:", clinicError);

    // Postgres Code 23505 = Unique Violation (e.g., duplicate email during testing)
    if (clinicError?.code === "23505") {
      return NextResponse.json({ 
        error: "An account or clinic with this email already exists." 
      }, { status: 409 });
    }

    return NextResponse.json({ 
      error: "Could not create clinic record. Please try again." 
    }, { status: 500 });
  }

  // Record each signed document. 
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