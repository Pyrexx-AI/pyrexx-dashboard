"use server";

/**
 * Admin Server Actions
 * ───────────────────────────────────────────────────────────────
 * Every action here re-verifies role === 'admin' via the regular
 * (RLS-respecting) server client before writing. This is
 * belt-and-suspenders: proxy.ts already blocks non-admins from
 * reaching /admin/*, and the RLS policies in 0001_init_schema.sql
 * (`admin_update_clinics`, `admin_all_integration_credentials`) would
 * reject the write anyway — but checking explicitly here gives a
 * clean error message instead of a silent RLS failure.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ClinicStatus } from "@/types/database";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");
  return supabase;
}

/**
 * Connect an AI Receptionist Agent to this clinic's account.
 */
export async function updateAgentConnection(
  clinicId: string,
  data: { agentId: string; agentPhoneNumber: string }
) {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("clinics")
    .update({
      agent_id: data.agentId.trim() || null,
      agent_phone_number: data.agentPhoneNumber.trim() || null,
    })
    .eq("id", clinicId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/clients/${clinicId}`);
  return { success: true };
}

/**
 * Store/update CRM credentials for this clinic.
 */
export async function updateCrmCredentials(
  clinicId: string,
  credentials: { apiKey: string; accountIdentifier: string; notes: string }
) {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("integration_credentials")
    .upsert(
      {
        clinic_id: clinicId,
        provider: "crm",
        credentials: {
          api_key: credentials.apiKey.trim(),
          account_identifier: credentials.accountIdentifier.trim(),
          notes: credentials.notes.trim(),
        },
      },
      { onConflict: "clinic_id,provider" }
    );

  if (error) return { error: error.message };
  revalidatePath(`/admin/clients/${clinicId}`);
  return { success: true };
}

/**
 * Update the escalation phone number.
 */
export async function updateEscalationNumber(clinicId: string, escalationPhoneNumber: string) {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("clinics")
    .update({ escalation_phone_number: escalationPhoneNumber.trim() || null })
    .eq("id", clinicId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/clients/${clinicId}`);
  return { success: true };
}

/**
 * Manually re-trigger AI Receptionist Agent provisioning.
 */
export async function retryProvisioning(clinicId: string) {
  const supabase = await requireAdmin();

  const { data: clinic, error: fetchError } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", clinicId)
    .single();

  if (fetchError || !clinic) return { error: "Clinic not found" };

  const { provisionAiReceptionistAgent } = await import("@/lib/retell/provision");
  const result = await provisionAiReceptionistAgent(clinic);

  revalidatePath(`/admin/clients/${clinicId}`);

  if (!result.success) return { error: result.error || "Provisioning failed" };
  return { success: true };
}

/**
 * Move a clinic through its lifecycle:
 *   onboarding → pending_setup → active
 *   active/pending_setup → suspended (and back)
 */
export async function updateClinicStatus(clinicId: string, status: ClinicStatus) {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("clinics")
    .update({ status })
    .eq("id", clinicId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/clients/${clinicId}`);
  revalidatePath("/admin");
  return { success: true };
}