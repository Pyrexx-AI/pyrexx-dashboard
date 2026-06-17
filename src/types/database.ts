/**
 * Hand-written types matching supabase/migrations/0001_init_schema.sql
 * ───────────────────────────────────────────────────────────────
 * Once the project is linked to a live Supabase instance, replace
 * this file by running:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 *
 * Keeping this hand-written version in sync manually until then —
 * it covers every table/enum the app currently reads or writes.
 */

export type UserRole = "admin" | "owner" | "staff";

export type ClinicStatus =
  | "onboarding"
  | "pending_setup"
  | "active"
  | "suspended";

export type CrmProvider =
  | "jane"
  | "cliniko"
  | "mindbody"
  | "vagaro"
  | "acuity"
  | "square_appointments"
  | "hubspot"
  | "other"
  | "none";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

export interface Database {
  public: {
    Tables: {
      clinics: {
        Row: {
          id: string;
          name: string;
          website: string | null;
          phone_number: string;
          contact_email: string;
          crm_provider: CrmProvider;
          crm_other_name: string | null;
          receptionist_name: string;
          status: ClinicStatus;
          agent_id: string | null;
          agent_phone_number: string | null;
          dodo_customer_id: string | null;
          dodo_subscription_id: string | null;
          subscription_status: SubscriptionStatus | null;
          plan_price_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["clinics"]["Row"]> & {
          name: string;
          phone_number: string;
          contact_email: string;
          receptionist_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["clinics"]["Row"]>;
      };
      profiles: {
        Row: {
          id: string;
          clinic_id: string | null;
          role: UserRole;
          full_name: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      integration_credentials: {
        Row: {
          id: string;
          clinic_id: string;
          provider: string;
          credentials: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["integration_credentials"]["Row"]> & {
          clinic_id: string;
          provider: string;
        };
        Update: Partial<Database["public"]["Tables"]["integration_credentials"]["Row"]>;
      };
      call_records: {
        Row: {
          id: string;
          clinic_id: string;
          patient_name: string;
          service_type: string;
          status: string;
          outcome: string | null;
          started_at: string;
          duration_ms: number | null;
          transcript: string | null;
          transcript_preview: string | null;
          booking_time: string | null;
          recording_url: string | null;
          raw_payload: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["call_records"]["Row"]> & {
          id: string;
          clinic_id: string;
          status: string;
          started_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["call_records"]["Row"]>;
      };
    };
  };
}