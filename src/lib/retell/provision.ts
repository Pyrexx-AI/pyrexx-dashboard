/**
 * AI Receptionist Agent — Automated Provisioning
 * ───────────────────────────────────────────────────────────────
 * Replaces fully-manual agent setup with a server-side function that
 * creates the Retell LLM, Agent, and shadow phone number directly
 * from the clinic's onboarding-submitted info. Triggered from the
 * Dodo webhook handler the moment a clinic's subscription becomes
 * active (see api/webhooks/dodo/route.ts) — this is what makes the
 * onboarding flow "minimal backend setup for the admin" rather than
 * fully manual.
 *
 * VERIFIED against the installed `retell-sdk` package's .d.ts files
 * directly (not just docs/search results) — several field names
 * here differ from older guides/PDFs you may have seen:
 *   - LLM tools live under `general_tools`, not `tools`.
 *   - Transfer tool uses `transfer_destination` (predefined/inferred)
 *     + `transfer_option` (cold/warm/agentic warm), not a flat
 *     `number` field.
 *   - Phone number binding uses `inbound_agents: [{agent_id, weight}]`
 *     (supports weighted multi-agent routing), NOT a single
 *     `inbound_agent_id` string — that field has been removed from
 *     the current API.
 *   - `transfer_option: { type: "warm_transfer" }` — every other
 *     warm-transfer field is optional; there is no `public_event_type`
 *     field (an earlier draft of this file invented one).
 *
 * DESIGN NOTE — escalation number, not the clinic's main line:
 * In the CCF "shadow number" architecture (clinic's main line →
 * conditionally forwards to this agent's number), transferring an
 * escalated call back to that SAME main line risks a forwarding
 * loop: if staff don't pick up, the clinic's own CCF rule forwards
 * it right back to the agent. `clinic.escalation_phone_number`
 * (collected separately — a direct back-line or staff cell, set by
 * the admin during setup) is used for the transfer destination
 * instead. If it's not set yet, provisioning still succeeds but
 * uses the main line as a temporary fallback and logs a warning —
 * the admin should fill in a real escalation number via
 * /admin/clients/[id] before the agent goes live with patients.
 *
 * FAILURE HANDLING: every step is wrapped so a failure midway (e.g.
 * LLM created but agent creation fails) doesn't leave the clinic in
 * a broken, unrecoverable state — it's recorded via
 * `agent_provisioning_status = 'failed'` with the error message
 * saved, and the admin can retry from /admin/clients/[id] (manual
 * fallback path, not the default — see ClientSetupForm.tsx).
 */
import Retell from "retell-sdk";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Clinic = Database["public"]["Tables"]["clinics"]["Row"];

function getClient() {
  return new Retell({ apiKey: process.env.RETELL_API_KEY! });
}

/** Default voice if the clinic didn't pick one during onboarding (US English, warm/professional). */
const DEFAULT_VOICE_ID = "11labs-Cimo";

function buildSystemPrompt(clinic: Clinic): string {
  const crmLine =
    clinic.crm_provider === "none"
      ? "This clinic does not yet use scheduling software — take a message and confirm a callback time instead of attempting to book directly."
      : `This clinic uses ${clinic.crm_other_name || clinic.crm_provider} for scheduling. Booking/availability tools will be attached separately by the agency once CRM credentials are configured.`;

  return `You are ${clinic.receptionist_name}, the AI phone receptionist for ${clinic.name}.

Your job is to answer inbound calls professionally and warmly, the way an excellent in-person front-desk receptionist would. Greet callers as: "Thank you for calling ${clinic.name}, this is ${clinic.receptionist_name}, how can I help you today?"

${crmLine}

If a caller describes a medical emergency or anything requiring urgent human attention, use the transfer_to_staff tool immediately rather than continuing to gather information.

Keep responses concise and natural for a phone conversation — avoid long lists or written-style formatting. Confirm important details (names, phone numbers, requested services, appointment times) by repeating them back before ending the call.`;
}

export interface ProvisionResult {
  success: boolean;
  agentId?: string;
  phoneNumber?: string;
  llmId?: string;
  error?: string;
}

/**
 * Full provisioning pipeline for one clinic:
 *   1. Create the Retell LLM (Response Engine) with a clinic-
 *      templated system prompt and a transfer-to-staff tool.
 *   2. Create the Agent, attaching that LLM + a default voice.
 *   3. Purchase a Retell-hosted "shadow" phone number and bind it
 *      to the new agent for inbound calls.
 *   4. Write agent_id / agent_phone_number back to the clinic row
 *      and mark agent_provisioning_status = 'provisioned'.
 *
 * On any failure, marks the clinic 'failed' with the error message
 * recorded (rather than leaving it stuck at 'provisioning' forever)
 * and returns success: false — the caller (the Dodo webhook handler)
 * does NOT fail the webhook response over this, since billing
 * succeeded regardless; provisioning failure is a separate concern
 * surfaced to the admin.
 */
export async function provisionAiReceptionistAgent(
  clinic: Clinic
): Promise<ProvisionResult> {
  const supabase = createAdminClient();
  const client = getClient();

  await supabase
    .from("clinics")
    .update({ agent_provisioning_status: "provisioning", agent_provisioning_error: null })
    .eq("id", clinic.id);

  try {
    // 1. Create the LLM Response Engine.
    const escalationNumber = clinic.escalation_phone_number || clinic.phone_number;
    if (!clinic.escalation_phone_number) {
      console.warn(
        `Clinic ${clinic.id} has no escalation_phone_number set — using its main line as a transfer destination. ` +
        `This risks a forwarding loop under a CCF "shadow number" setup. Set a real back-line via /admin/clients/${clinic.id} before the agent handles live patient calls.`
      );
    }

    const llm = await client.llm.create({
      model: "gpt-4.1",
      general_prompt: buildSystemPrompt(clinic),
      general_tools: [
        {
          type: "transfer_call",
          name: "transfer_to_staff",
          description:
            "Use this when the caller has an urgent medical concern, explicitly asks for a human, or the request is something you cannot handle (e.g. complex billing disputes).",
          transfer_destination: {
            type: "predefined",
            number: escalationNumber,
          },
          transfer_option: { type: "warm_transfer" },
        },
      ],
      default_dynamic_variables: {
        clinic_name: clinic.name,
        receptionist_name: clinic.receptionist_name,
      },
    });

    // 2. Create the Agent, attaching the LLM above.
    const agent = await client.agent.create({
      agent_name: `${clinic.name} — ${clinic.receptionist_name}`,
      voice_id: DEFAULT_VOICE_ID,
      response_engine: { type: "retell-llm", llm_id: llm.llm_id },
    });

    // 3. Purchase a shadow phone number and bind it to the new agent.
    //    Area code is best-effort parsed from the clinic's submitted
    //    phone number (US numbers: +1XXXYYYYYYY → area code = XXX).
    const areaCodeMatch = clinic.phone_number.match(/^\+?1?(\d{3})/);
    const areaCode = areaCodeMatch ? parseInt(areaCodeMatch[1], 10) : undefined;

    const phoneNumber = await client.phoneNumber.create({
      area_code: areaCode,
      nickname: `${clinic.name} (Pyrexx shadow number)`,
      inbound_agents: [{ agent_id: agent.agent_id, weight: 1 }],
    });

    // 4. Persist results + mark provisioned.
    await supabase
      .from("clinics")
      .update({
        agent_id: agent.agent_id,
        agent_phone_number: phoneNumber.phone_number,
        agent_provisioning_status: "provisioned",
        agent_provisioning_error: null,
      })
      .eq("id", clinic.id);

    return {
      success: true,
      agentId: agent.agent_id,
      phoneNumber: phoneNumber.phone_number,
      llmId: llm.llm_id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown provisioning error";
    console.error(`Agent provisioning failed for clinic ${clinic.id}:`, message);

    await supabase
      .from("clinics")
      .update({ agent_provisioning_status: "failed", agent_provisioning_error: message })
      .eq("id", clinic.id);

    return { success: false, error: message };
  }
}