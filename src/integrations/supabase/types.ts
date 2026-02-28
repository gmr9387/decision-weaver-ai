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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_request_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          organization_id: string
          request_body: Json | null
          response_summary: string | null
          status_code: number
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          endpoint: string
          id?: string
          ip_address?: string | null
          method: string
          organization_id: string
          request_body?: Json | null
          response_summary?: string | null
          status_code: number
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          organization_id?: string
          request_body?: Json | null
          response_summary?: string | null
          status_code?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_assignments: {
        Row: {
          assigned_at: string
          assigned_to: string | null
          case_id: string
          id: string
          notes: string | null
          queue_id: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_to?: string | null
          case_id: string
          id?: string
          notes?: string | null
          queue_id?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_to?: string | null
          case_id?: string
          id?: string
          notes?: string | null
          queue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_assignments_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      case_facts: {
        Row: {
          case_id: string
          created_at: string
          fact_key: string
          fact_value: Json
          id: string
          is_derived: boolean | null
          quality: string
          source: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          fact_key: string
          fact_value: Json
          id?: string
          is_derived?: boolean | null
          quality?: string
          source?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          fact_key?: string
          fact_value?: Json
          id?: string
          is_derived?: boolean | null
          quality?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_facts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          amount: number | null
          case_number: string
          category: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          organization_id: string
          owner: string | null
          review_state: Database["public"]["Enums"]["review_state"]
          severity: Database["public"]["Enums"]["severity_level"]
          source: string
          status: Database["public"]["Enums"]["case_status"]
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          case_number: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          owner?: string | null
          review_state?: Database["public"]["Enums"]["review_state"]
          severity?: Database["public"]["Enums"]["severity_level"]
          source?: string
          status?: Database["public"]["Enums"]["case_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          case_number?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          owner?: string | null
          review_state?: Database["public"]["Enums"]["review_state"]
          severity?: Database["public"]["Enums"]["severity_level"]
          source?: string
          status?: Database["public"]["Enums"]["case_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_metrics: {
        Row: {
          auto_resolved: number | null
          avg_confidence: number | null
          avg_time_to_decision: number | null
          date: string
          escalated: number | null
          id: string
          organization_id: string
          processed: number | null
        }
        Insert: {
          auto_resolved?: number | null
          avg_confidence?: number | null
          avg_time_to_decision?: number | null
          date: string
          escalated?: number | null
          id?: string
          organization_id: string
          processed?: number | null
        }
        Update: {
          auto_resolved?: number | null
          avg_confidence?: number | null
          avg_time_to_decision?: number | null
          date?: string
          escalated?: number | null
          id?: string
          organization_id?: string
          processed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inference_runs: {
        Row: {
          candidate_decisions: Json | null
          case_id: string
          confidence: number | null
          confidence_band: Database["public"]["Enums"]["confidence_band"] | null
          confidence_breakdown: Json | null
          contradictions: string[] | null
          created_at: string
          decision: Database["public"]["Enums"]["decision_type"] | null
          evidence_refs: string[] | null
          explanation: string | null
          fired_rules: Json | null
          id: string
          input_snapshot: Json | null
          missing_facts: string[] | null
          mode: Database["public"]["Enums"]["inference_mode"]
          normalized_facts: Json | null
          organization_id: string
          severity: Database["public"]["Enums"]["severity_level"] | null
          version_metadata: Json | null
        }
        Insert: {
          candidate_decisions?: Json | null
          case_id: string
          confidence?: number | null
          confidence_band?:
            | Database["public"]["Enums"]["confidence_band"]
            | null
          confidence_breakdown?: Json | null
          contradictions?: string[] | null
          created_at?: string
          decision?: Database["public"]["Enums"]["decision_type"] | null
          evidence_refs?: string[] | null
          explanation?: string | null
          fired_rules?: Json | null
          id?: string
          input_snapshot?: Json | null
          missing_facts?: string[] | null
          mode?: Database["public"]["Enums"]["inference_mode"]
          normalized_facts?: Json | null
          organization_id: string
          severity?: Database["public"]["Enums"]["severity_level"] | null
          version_metadata?: Json | null
        }
        Update: {
          candidate_decisions?: Json | null
          case_id?: string
          confidence?: number | null
          confidence_band?:
            | Database["public"]["Enums"]["confidence_band"]
            | null
          confidence_breakdown?: Json | null
          contradictions?: string[] | null
          created_at?: string
          decision?: Database["public"]["Enums"]["decision_type"] | null
          evidence_refs?: string[] | null
          explanation?: string | null
          fired_rules?: Json | null
          id?: string
          input_snapshot?: Json | null
          missing_facts?: string[] | null
          mode?: Database["public"]["Enums"]["inference_mode"]
          normalized_facts?: Json | null
          organization_id?: string
          severity?: Database["public"]["Enums"]["severity_level"] | null
          version_metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "inference_runs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inference_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      queues: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          priority: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          priority?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "queues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          created_at: string
          expected_impact: string | null
          id: string
          inference_run_id: string
          reason: string | null
          suggested_owner: string | null
          title: string
          urgency: Database["public"]["Enums"]["severity_level"] | null
        }
        Insert: {
          created_at?: string
          expected_impact?: string | null
          id?: string
          inference_run_id: string
          reason?: string | null
          suggested_owner?: string | null
          title: string
          urgency?: Database["public"]["Enums"]["severity_level"] | null
        }
        Update: {
          created_at?: string
          expected_impact?: string | null
          id?: string
          inference_run_id?: string
          reason?: string | null
          suggested_owner?: string | null
          title?: string
          urgency?: Database["public"]["Enums"]["severity_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_inference_run_id_fkey"
            columns: ["inference_run_id"]
            isOneToOne: false
            referencedRelation: "inference_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      rules: {
        Row: {
          category: string
          conditions: Json
          confidence_impact: number | null
          created_at: string
          description: string | null
          effective_from: string | null
          effective_to: string | null
          enabled: boolean
          explanation_template: string | null
          hit_count: number
          id: string
          name: string
          organization_id: string
          output: Json
          priority: number
          rule_type: Database["public"]["Enums"]["rule_type"]
          updated_at: string
          version: number
        }
        Insert: {
          category?: string
          conditions?: Json
          confidence_impact?: number | null
          created_at?: string
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          enabled?: boolean
          explanation_template?: string | null
          hit_count?: number
          id?: string
          name: string
          organization_id: string
          output?: Json
          priority?: number
          rule_type?: Database["public"]["Enums"]["rule_type"]
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          conditions?: Json
          confidence_impact?: number | null
          created_at?: string
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          enabled?: boolean
          explanation_template?: string | null
          hit_count?: number
          id?: string
          name?: string
          organization_id?: string
          output?: Json
          priority?: number
          rule_type?: Database["public"]["Enums"]["rule_type"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          organization_id: string
          signing_secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          organization_id: string
          signing_secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          organization_id?: string
          signing_secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_api_logs: { Args: never; Returns: number }
      generate_org_api_key: { Args: { org_id: string }; Returns: string }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_rule_hit_count: {
        Args: { rule_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "reviewer" | "analyst" | "executive"
      case_status:
        | "open"
        | "processing"
        | "resolved"
        | "escalated"
        | "pending_info"
      confidence_band: "low" | "medium" | "high" | "very_high"
      decision_type:
        | "approve"
        | "deny"
        | "flag"
        | "escalate"
        | "review"
        | "request_info"
        | "route"
        | "monitor"
        | "unresolved"
      inference_mode: "instant" | "deep" | "assisted"
      review_state: "pending" | "in_review" | "completed" | "reopened"
      rule_type:
        | "deterministic"
        | "heuristic"
        | "derived_fact"
        | "routing"
        | "explainability"
      severity_level: "low" | "medium" | "high" | "critical"
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
      app_role: ["admin", "reviewer", "analyst", "executive"],
      case_status: [
        "open",
        "processing",
        "resolved",
        "escalated",
        "pending_info",
      ],
      confidence_band: ["low", "medium", "high", "very_high"],
      decision_type: [
        "approve",
        "deny",
        "flag",
        "escalate",
        "review",
        "request_info",
        "route",
        "monitor",
        "unresolved",
      ],
      inference_mode: ["instant", "deep", "assisted"],
      review_state: ["pending", "in_review", "completed", "reopened"],
      rule_type: [
        "deterministic",
        "heuristic",
        "derived_fact",
        "routing",
        "explainability",
      ],
      severity_level: ["low", "medium", "high", "critical"],
    },
  },
} as const
