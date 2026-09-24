// src/lib/retell/provision.ts
import Retell from "retell-sdk";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Clinic = Database["public"]["Tables"]["clinics"]["Row"];

function getClient() {
  return new Retell({ apiKey: process.env.RETELL_API_KEY! });
}

const DEFAULT_VOICE_ID = "11labs-Cimo";

function buildSystemPrompt(clinic: Clinic): string {
  const crmLine =
    clinic.crm_provider === "none"
      ? "This clinic does not yet use scheduling software — take a message and confirm a callback time instead of attempting to book directly."
      : `This clinic uses ${clinic.crm_other_name || clinic.crm_provider} for scheduling. Booking tools will be attached separately by the agency.`;

  return `You are ${clinic.receptionist_name}, the AI phone receptionist for ${clinic.name}.

Your job is to answer inbound calls professionally and warmly: "Thank you for calling ${clinic.name}, this is ${clinic.receptionist_name}, how can I help you today?"

${crmLine}

If a caller describes a medical emergency, use the transfer_to_staff tool immediately.
Keep responses concise and natural for a phone conversation. Confirm appointment times and names before ending the call.`;
}

export interface ProvisionResult {
  success: boolean;
  agentId?: string;
  phoneNumber?: string;
  llmId?: string;
  error?: string;
}

export async function provisionAiReceptionistAgent(clinic: Clinic): Promise<ProvisionResult> {
  const supabase = createAdminClient();
  const client = getClient();

  let createdLlmId: string | null = null;
  let createdAgentId: string | null = null;

  try {
    const escalationNumber = clinic.escalation_phone_number || clinic.phone_number;

    // Step 1: Create LLM Response Engine
    const llm = await client.llm.create({
      model: "gpt-4.1",
      general_prompt: buildSystemPrompt(clinic),
      general_tools: [
        {
          type: "transfer_call",
          name: "transfer_to_staff",
          description: "Use when caller has an urgent medical concern or asks for a human.",
          transfer_destination: {
            type: "predefined",
            number: escalationNumber,
          },
          transfer_option: { type: "warm_transfer" },
        },
      ],
      default_dynamic_variables: {
        clinic_id: clinic.id,
        clinic_name: clinic.name,
        receptionist_name: clinic.receptionist_name,
      },
    });
    createdLlmId = llm.llm_id;

    // Step 2: Create Retell Agent
    const agent = await client.agent.create({
      agent_name: `${clinic.name} — ${clinic.receptionist_name}`,
      voice_id: DEFAULT_VOICE_ID,
      response_engine: { type: "retell-llm", llm_id: llm.llm_id },
    });
    createdAgentId = agent.agent_id;

    // Step 3: Purchase Shadow Number with Resilient Fallback
    const areaCodeMatch = clinic.phone_number.match(/^\+?1?(\d{3})/);
    const areaCode = areaCodeMatch ? parseInt(areaCodeMatch[1], 10) : undefined;

    let phoneNumberRecord;
    try {
      phoneNumberRecord = await client.phoneNumber.create({
        area_code: areaCode,
        nickname: `${clinic.name} (Pyrexx shadow number)`,
        inbound_agents: [{ agent_id: agent.agent_id, weight: 1 }],
      });
    } catch (areaCodeErr) {
      console.warn(`[Provisioning] Area code ${areaCode} unavailable. Retrying with global inventory...`, areaCodeErr);
      // Fallback: Purchase without strict area code constraint
      phoneNumberRecord = await client.phoneNumber.create({
        nickname: `${clinic.name} (Pyrexx shadow number - fallback)`,
        inbound_agents: [{ agent_id: agent.agent_id, weight: 1 }],
      });
    }

    // Step 4: Persist State
    await supabase
      .from("clinics")
      .update({
        agent_id: agent.agent_id,
        agent_phone_number: phoneNumberRecord.phone_number,
        agent_provisioning_status: "provisioned",
        agent_provisioning_error: null,
      })
      .eq("id", clinic.id);

    return {
      success: true,
      agentId: agent.agent_id,
      phoneNumber: phoneNumberRecord.phone_number,
      llmId: llm.llm_id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Telephony provisioning failed";
    console.error(`[Provisioning Error] Clinic ${clinic.id}:`, message);

    // Complete Multi-Resource Rollback
    await Promise.allSettled([
      createdAgentId ? client.agent.delete(createdAgentId) : Promise.resolve(),
      createdLlmId ? client.llm.delete(createdLlmId) : Promise.resolve(),
    ]);

    await supabase
      .from("clinics")
      .update({ agent_provisioning_status: "failed", agent_provisioning_error: message })
      .eq("id", clinic.id);

    return { success: false, error: message };
  }
}