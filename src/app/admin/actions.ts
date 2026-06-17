"use server";

/**
 * Admin Server Actions
 * ───────────────────────────────────────────────────────────────
 * Every action here re-verifies role === 'admin' via the regular
 * (RLS-respecting) server client before writing. This is
 * belt-and-suspenders: middleware.ts already blocks non-admins from
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");
  return supabase;
}

/**
 * Connect an AI Receptionist Agent to this clinic's account.
 * `agentId` is the underlying voice-agent platform's agent ID
 * (configured by the admin per AI_RECEPTIONIST_INTEGRATION.md —
 * including setting that agent's `clinic_id` metadata to THIS
 * clinic's id, so inbound webhooks route correctly).
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
 * Store/update CRM credentials for this clinic. Written to
 * `integration_credentials` (provider = 'crm'), which has NO
 * select/insert/update policy for non-admins — clinic users can
 * never read this row, by RLS design.
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
 * Move a clinic through its lifecycle:
 *   onboarding → pending_setup → active
 *   active/pending_setup → suspended (and back)
 *
 * Flipping to 'active' is the moment the clinic's dashboard starts
 * showing live data — at that point, agent_id should already be set
 * (the UI nudges the admin to do agent setup first, but doesn't
 * hard-block it, since some clinics may go live CRM-less initially).
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