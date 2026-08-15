"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ClinicStatus, PlanTier, CrmProvider } from "@/types/database";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  let isAdmin = user.user_metadata?.role === "admin" || user.app_metadata?.role === "admin";

  const adminClient = createAdminClient();

  if (!isAdmin) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      isAdmin = true;
    }
  }

  if (!isAdmin) throw new Error("Not authorized: Admin privilege required.");

  return adminClient;
}

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
      plan_price_cents: data.plan_tier === "full_time" ? 150000 : 100000,
      status: "pending_setup",
      subscription_status: "active",
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { success: true, clinicId: clinic.id };
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
      credentials: { api_key: credentials.apiKey.trim(), account_identifier: credentials.accountIdentifier.trim(), notes: credentials.notes.trim() },
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