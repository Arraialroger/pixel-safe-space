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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          workspace_id: string | null
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          workspace_id?: string | null
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: string
          content_deliverables: string | null
          content_exclusions: string | null
          content_revisions: string | null
          contract_template: string
          created_at: string
          custom_contract_text: string | null
          deadline: string | null
          down_payment: number | null
          execution_status: string
          final_deliverable_url: string | null
          id: string
          is_fully_paid: boolean
          payment_link: string | null
          payment_terms: string | null
          payment_value: number | null
          proposal_id: string | null
          signed_at: string | null
          signed_by_email: string | null
          signed_by_name: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          client_id: string
          content_deliverables?: string | null
          content_exclusions?: string | null
          content_revisions?: string | null
          contract_template?: string
          created_at?: string
          custom_contract_text?: string | null
          deadline?: string | null
          down_payment?: number | null
          execution_status?: string
          final_deliverable_url?: string | null
          id?: string
          is_fully_paid?: boolean
          payment_link?: string | null
          payment_terms?: string | null
          payment_value?: number | null
          proposal_id?: string | null
          signed_at?: string | null
          signed_by_email?: string | null
          signed_by_name?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          client_id?: string
          content_deliverables?: string | null
          content_exclusions?: string | null
          content_revisions?: string | null
          contract_template?: string
          created_at?: string
          custom_contract_text?: string | null
          deadline?: string | null
          down_payment?: number | null
          execution_status?: string
          final_deliverable_url?: string | null
          id?: string
          is_fully_paid?: boolean
          payment_link?: string | null
          payment_terms?: string | null
          payment_value?: number | null
          proposal_id?: string | null
          signed_at?: string | null
          signed_by_email?: string | null
          signed_by_name?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          amount_received: number | null
          contract_id: string | null
          contract_status_after: string | null
          contract_status_before: string | null
          error_message: string | null
          event_type: string
          execution_status_after: string | null
          execution_status_before: string | null
          id: string
          inferred_phase: string | null
          payment_id: string | null
          processed_at: string
          processing_result: string | null
          provider: string
          query_phase: string | null
          raw_payload: Json | null
          session_id: string | null
        }
        Insert: {
          amount_received?: number | null
          contract_id?: string | null
          contract_status_after?: string | null
          contract_status_before?: string | null
          error_message?: string | null
          event_type: string
          execution_status_after?: string | null
          execution_status_before?: string | null
          id?: string
          inferred_phase?: string | null
          payment_id?: string | null
          processed_at?: string
          processing_result?: string | null
          provider?: string
          query_phase?: string | null
          raw_payload?: Json | null
          session_id?: string | null
        }
        Update: {
          amount_received?: number | null
          contract_id?: string | null
          contract_status_after?: string | null
          contract_status_before?: string | null
          error_message?: string | null
          event_type?: string
          execution_status_after?: string | null
          execution_status_before?: string | null
          id?: string
          inferred_phase?: string | null
          payment_id?: string | null
          processed_at?: string
          processing_result?: string | null
          provider?: string
          query_phase?: string | null
          raw_payload?: Json | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "payment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_sessions: {
        Row: {
          contract_id: string
          created_at: string
          expected_amount: number
          external_reference: string | null
          id: string
          paid_at: string | null
          phase: string
          preference_id: string | null
          provider: string
          status: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          expected_amount: number
          external_reference?: string | null
          id?: string
          paid_at?: string | null
          phase: string
          preference_id?: string | null
          provider?: string
          status?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          expected_amount?: number
          external_reference?: string | null
          id?: string
          paid_at?: string | null
          phase?: string
          preference_id?: string | null
          provider?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          language_preference: string
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          language_preference?: string
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          language_preference?: string
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          accepted_at: string | null
          accepted_by_email: string | null
          accepted_by_name: string | null
          ai_generated_scope: string | null
          client_id: string
          created_at: string
          id: string
          status: string
          summary: string | null
          title: string
          workspace_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_email?: string | null
          accepted_by_name?: string | null
          ai_generated_scope?: string | null
          client_id: string
          created_at?: string
          id?: string
          status?: string
          summary?: string | null
          title: string
          workspace_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by_email?: string | null
          accepted_by_name?: string | null
          ai_generated_scope?: string | null
          client_id?: string
          created_at?: string
          id?: string
          status?: string
          summary?: string | null
          title?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          company_address: string | null
          company_document: string | null
          created_at: string
          id: string
          logo_url: string | null
          mercado_pago_token: string | null
          name: string
          owner_id: string
          stripe_token: string | null
          subscription_plan: string | null
          subscription_status: string
          trial_ends_at: string | null
          whatsapp: string | null
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          company_address?: string | null
          company_document?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          mercado_pago_token?: string | null
          name: string
          owner_id: string
          stripe_token?: string | null
          subscription_plan?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          company_address?: string | null
          company_document?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          mercado_pago_token?: string | null
          name?: string
          owner_id?: string
          stripe_token?: string | null
          subscription_plan?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_proposal: {
        Args: { _email: string; _name: string; _proposal_id: string }
        Returns: undefined
      }
      get_dashboard_metrics: { Args: { _workspace_id: string }; Returns: Json }
      get_public_contract: {
        Args: { _contract_id: string }
        Returns: {
          client_address: string
          client_company: string
          client_document: string
          client_name: string
          content_deliverables: string
          content_exclusions: string
          content_revisions: string
          contract_template: string
          custom_contract_text: string
          deadline: string
          down_payment: number
          has_deliverable: boolean
          id: string
          is_fully_paid: boolean
          payment_link: string
          payment_terms: string
          payment_value: number
          signed_at: string
          signed_by_email: string
          signed_by_name: string
          status: string
          workspace_id: string
        }[]
      }
      get_public_contract_status: {
        Args: { _contract_id: string }
        Returns: {
          is_fully_paid: boolean
          status: string
        }[]
      }
      get_public_proposal: {
        Args: { _proposal_id: string }
        Returns: {
          ai_generated_scope: string
          client_name: string
          id: string
          status: string
          title: string
          workspace_id: string
        }[]
      }
      get_workspace_contract_info: {
        Args: { _workspace_id: string }
        Returns: {
          company_address: string
          company_document: string
          id: string
          logo_url: string
          name: string
          subscription_plan: string
          whatsapp: string
        }[]
      }
      get_workspace_members: {
        Args: { _workspace_id: string }
        Returns: {
          email: string
          full_name: string
          role: string
          user_id: string
        }[]
      }
      get_workspace_public: {
        Args: { _workspace_id: string }
        Returns: {
          id: string
          logo_url: string
          name: string
          subscription_plan: string
        }[]
      }
      invite_workspace_member: {
        Args: { _email: string; _workspace_id: string }
        Returns: string
      }
      is_workspace_admin: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      sign_contract: {
        Args: { _contract_id: string; _email: string; _name: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
