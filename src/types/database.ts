export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      call_records: {
        Row: {
          booking_time: string | null
          clinic_id: string
          created_at: string
          duration_ms: number | null
          id: string
          outcome: string | null
          patient_name: string
          raw_payload: Json | null
          recording_url: string | null
          service_type: string
          started_at: string
          status: string
          transcript: string | null
          transcript_preview: string | null
          updated_at: string
        }
        Insert: {
          booking_time?: string | null
          clinic_id: string
          created_at?: string
          duration_ms?: number | null
          id: string
          outcome?: string | null
          patient_name?: string
          raw_payload?: Json | null
          recording_url?: string | null
          service_type?: string
          started_at: string
          status: string
          transcript?: string | null
          transcript_preview?: string | null
          updated_at?: string
        }
        Update: {
          booking_time?: string | null
          clinic_id?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          outcome?: string | null
          patient_name?: string
          raw_payload?: Json | null
          recording_url?: string | null
          service_type?: string
          started_at?: string
          status?: string
          transcript?: string | null
          transcript_preview?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_records_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          agent_id: string | null
          agent_phone_number: string | null
          agent_provisioning_status: Database["public"]["Enums"]["provisioning_status"]
          agent_provisioning_error: string | null
          contact_email: string
          created_at: string
          crm_other_name: string | null
          crm_provider: Database["public"]["Enums"]["crm_provider"]
          dodo_customer_id: string | null
          dodo_product_id: string | null
          dodo_subscription_id: string | null
          escalation_phone_number: string | null
          id: string
          name: string
          phone_number: string
          plan_price_cents: number
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          receptionist_name: string
          status: Database["public"]["Enums"]["clinic_status"]
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at: string
          website: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_phone_number?: string | null
          agent_provisioning_status?: Database["public"]["Enums"]["provisioning_status"]
          agent_provisioning_error?: string | null
          contact_email: string
          created_at?: string
          crm_other_name?: string | null
          crm_provider?: Database["public"]["Enums"]["crm_provider"]
          dodo_customer_id?: string | null
          dodo_product_id?: string | null
          dodo_subscription_id?: string | null
          escalation_phone_number?: string | null
          id?: string
          name: string
          phone_number: string
          plan_price_cents?: number
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          receptionist_name: string
          status?: Database["public"]["Enums"]["clinic_status"]
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_phone_number?: string | null
          agent_provisioning_status?: Database["public"]["Enums"]["provisioning_status"]
          agent_provisioning_error?: string | null
          contact_email?: string
          created_at?: string
          crm_other_name?: string | null
          crm_provider?: Database["public"]["Enums"]["crm_provider"]
          dodo_customer_id?: string | null
          dodo_product_id?: string | null
          dodo_subscription_id?: string | null
          escalation_phone_number?: string | null
          id?: string
          name?: string
          phone_number?: string
          plan_price_cents?: number
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          receptionist_name?: string
          status?: Database["public"]["Enums"]["clinic_status"]
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      integration_credentials: {
        Row: {
          clinic_id: string
          created_at: string
          credentials: Json
          id: string
          provider: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          credentials?: Json
          id?: string
          provider: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          credentials?: Json
          id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          clinic_id: string | null
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      signed_agreements: {
        Row: {
          id: string
          clinic_id: string
          document_type: string
          document_version: string
          signer_name: string
          signer_title: string | null
          ip_address: string | null
          signed_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          document_type: string
          document_version: string
          signer_name: string
          signer_title?: string | null
          ip_address?: string | null
          signed_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          document_type?: string
          document_version?: string
          signer_name?: string
          signer_title?: string | null
          ip_address?: string | null
          signed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signed_agreements_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_clinic_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      clinic_status: "onboarding" | "pending_setup" | "active" | "suspended"
      crm_provider:
        | "jane"
        | "cliniko"
        | "mindbody"
        | "vagaro"
        | "acuity"
        | "square_appointments"
        | "hubspot"
        | "other"
        | "none"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
      user_role: "admin" | "owner" | "staff"
      plan_tier: "overflow" | "full_time" | "usage_based"
      provisioning_status: "pending" | "provisioning" | "provisioned" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      clinic_status: ["onboarding", "pending_setup", "active", "suspended"],
      crm_provider: [
        "jane",
        "cliniko",
        "mindbody",
        "vagaro",
        "acuity",
        "square_appointments",
        "hubspot",
        "other",
        "none",
      ],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
      ],
      user_role: ["admin", "owner", "staff"],
      plan_tier: ["overflow", "full_time", "usage_based"],
      provisioning_status: ["pending", "provisioning", "provisioned", "failed"],
    },
  },
} as const

export type ClinicStatus = Database["public"]["Enums"]["clinic_status"];
export type CrmProvider = Database["public"]["Enums"]["crm_provider"];
export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];
export type UserRole = Database["public"]["Enums"]["user_role"];
export type PlanTier = Database["public"]["Enums"]["plan_tier"];
export type ProvisioningStatus = Database["public"]["Enums"]["provisioning_status"];