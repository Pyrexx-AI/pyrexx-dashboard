"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyAdminStatus } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";
import type { ClinicStatus, PlanTier, CrmProvider } from "@/types/database";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const isAdmin = await verifyAdminStatus(user);
  if (!isAdmin) throw new Error("Not authorized: Admin privilege required.");

  return createAdminClient();
}

/**
 * Creates a clinic record for an offline/manual sale (admin collected
 * payment outside Dodo — e.g. invoiced, comped, or a legacy client
 * being migrated in) and skips the checkout step entirely.
 *
 * STATUS FIX: this previously set `status: "pending_setup"`, which
 * made the clinic permanently un-loginable — /api/onboarding/finish
 * (the ONLY code path that creates a login) requires
 * `status === "onboarding"` and 404s otherwise, and there was no
 * other way to create the owner's auth user for a manually-added
 * clinic. Setting `status: "onboarding"` here routes these clients
 * through the exact same password-setup step as a paid signup
 * (`/signup/finish?clinicId=...` → AccountStep → /api/onboarding/finish),
 * just without the payment step in between. `finish` still advances
 * the clinic to `pending_setup` once the owner sets a password,
 * matching the paid flow's status progression.
 *
 * `subscription_status: "active"` is intentional here (not a bug) —
 * billing was handled outside the system, so there's no Dodo webhook
 * coming to set this later.
 *
 * Returns `setupUrl` so the admin can hand it directly to the client
 * — there's no automated email step yet (tracked separately).
 */
export async function createManualClient(data: {
  name: string;
  contact_email: string;
  phone_number: string;
  receptionist_name: string;
  plan_tier: PlanTier;
  crm_provider: CrmProvider;
}) {
  const supabase = await requireAdmin();

  const { data: clinic, error } = await supabase
    .from("clinics")
    .insert({
      ...data,
      name: data.name.trim(),
      contact_email: data.contact_email.trim().toLowerCase(),
      phone_number: data.phone_number.trim(),
      receptionist_name: data.receptionist_name.trim(),
      plan_price_cents: data.plan_tier === "full_time" ? 150000 : 100000,
      status: "onboarding",
      subscription_status: "active",
    })
    .select("*")
    .single();

  if (error) {
    // Postgres 23505 = unique violation (duplicate contact_email)
    if (error.code === "23505") {
      return { error: "A clinic with this contact email already exists." };
    }
    return { error: error.message };
  }

  revalidatePath("/admin");

  const setupUrl = `/signup/finish?clinicId=${clinic.id}`;
  return { success: true, clinicId: clinic.id, setupUrl };
}

export async function disconnectAgent(clinicId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("clinics")
    .update({
      agent_id: null,
      agent_phone_number: null,
      agent_provisioning_status: "pending",
    })
    .eq("id", clinicId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/clients/${clinicId}`);
  return { success: true };
}

export async function updateAgentConnection(clinicId: string, data: { agentId: string; agentPhoneNumber: string }) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("clinics")
    .update({ agent_id: data.agentId.trim() || null, agent_phone_number: data.agentPhoneNumber.trim() || null })
    .eq("id", clinicId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/clients/${clinicId}`);
  return { success: true };
}

export async function updateCrmCredentials(clinicId: string, credentials: { apiKey: string; accountIdentifier: string; notes: string }) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("integration_credentials")
    .upsert({
      clinic_id: clinicId,
      provider: "crm",
      credentials: { api_key: credentials.apiKey.trim(), accountIdentifier: credentials.accountIdentifier.trim(), notes: credentials.notes.trim() },
    }, { onConflict: "clinic_id,provider" });
  if (error) return { error: error.message };
  revalidatePath(`/admin/clients/${clinicId}`);
  return { success: true };
}

export async function updateEscalationNumber(clinicId: string, escalationPhoneNumber: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("clinics").update({ escalation_phone_number: escalationPhoneNumber.trim() || null }).eq("id", clinicId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/clients/${clinicId}`);
  return { success: true };
}

export async function retryProvisioning(clinicId: string) {
  const supabase = await requireAdmin();
  const { data: clinic, error: fetchError } = await supabase.from("clinics").select("*").eq("id", clinicId).single();
  if (fetchError || !clinic) return { error: "Clinic not found" };

  const { provisionAiReceptionistAgent } = await import("@/lib/retell/provision");
  const result = await provisionAiReceptionistAgent(clinic);
  revalidatePath(`/admin/clients/${clinicId}`);
  if (!result.success) return { error: result.error || "Provisioning failed" };
  return { success: true };
}

export async function updateClinicStatus(clinicId: string, status: ClinicStatus) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("clinics").update({ status }).eq("id", clinicId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/clients/${clinicId}`);
  revalidatePath("/admin");
  return { success: true };
}