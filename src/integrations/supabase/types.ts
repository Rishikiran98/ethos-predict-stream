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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          created_at: string
          current_hash: string
          details: Json
          id: string
          message: string
          operation_type: string
          previous_hash: string | null
          sequence_number: number
          status: Database["public"]["Enums"]["audit_status"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_hash: string
          details?: Json
          id?: string
          message: string
          operation_type: string
          previous_hash?: string | null
          sequence_number?: number
          status: Database["public"]["Enums"]["audit_status"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_hash?: string
          details?: Json
          id?: string
          message?: string
          operation_type?: string
          previous_hash?: string | null
          sequence_number?: number
          status?: Database["public"]["Enums"]["audit_status"]
          user_id?: string | null
        }
        Relationships: []
      }
      community_feedback: {
        Row: {
          admin_notes: string | null
          community_area: string
          created_at: string
          description: string
          feedback_id: string
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          id: string
          prediction_id: string | null
          reporter_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          community_area: string
          created_at?: string
          description: string
          feedback_id: string
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          id?: string
          prediction_id?: string | null
          reporter_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          community_area?: string
          created_at?: string
          description?: string
          feedback_id?: string
          feedback_type?: Database["public"]["Enums"]["feedback_type"]
          id?: string
          prediction_id?: string | null
          reporter_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_feedback_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      crime_stream: {
        Row: {
          arrest: boolean | null
          case_number: string
          community_area: number | null
          date: string
          inserted_at: string
          latitude: number | null
          longitude: number | null
          primary_type: string
        }
        Insert: {
          arrest?: boolean | null
          case_number: string
          community_area?: number | null
          date: string
          inserted_at?: string
          latitude?: number | null
          longitude?: number | null
          primary_type: string
        }
        Update: {
          arrest?: boolean | null
          case_number?: string
          community_area?: number | null
          date?: string
          inserted_at?: string
          latitude?: number | null
          longitude?: number | null
          primary_type?: string
        }
        Relationships: []
      }
      fairness_evaluations: {
        Row: {
          calibration_error: number
          community_metrics: Json
          created_at: string
          created_by: string | null
          demographic_parity_diff: number
          equalized_odds_ratio: number
          evaluation_date: string
          f1_variance: number
          id: string
          model_version: string
          passed_thresholds: boolean
        }
        Insert: {
          calibration_error: number
          community_metrics?: Json
          created_at?: string
          created_by?: string | null
          demographic_parity_diff: number
          equalized_odds_ratio: number
          evaluation_date?: string
          f1_variance: number
          id?: string
          model_version: string
          passed_thresholds: boolean
        }
        Update: {
          calibration_error?: number
          community_metrics?: Json
          created_at?: string
          created_by?: string | null
          demographic_parity_diff?: number
          equalized_odds_ratio?: number
          evaluation_date?: string
          f1_variance?: number
          id?: string
          model_version?: string
          passed_thresholds?: boolean
        }
        Relationships: []
      }
      ingestion_log: {
        Row: {
          batch_id: string
          created_at: string
          duplicates: number | null
          end_time: string | null
          error_details: string | null
          errors: number | null
          id: string
          new_rows: number | null
          start_time: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          duplicates?: number | null
          end_time?: string | null
          error_details?: string | null
          errors?: number | null
          id?: string
          new_rows?: number | null
          start_time: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          duplicates?: number | null
          end_time?: string | null
          error_details?: string | null
          errors?: number | null
          id?: string
          new_rows?: number | null
          start_time?: string
        }
        Relationships: []
      }
      model_artifacts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          mae: number | null
          metadata: Json
          model_binary: string
          r2_score: number | null
          rmse: number | null
          training_time_seconds: number | null
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          mae?: number | null
          metadata?: Json
          model_binary: string
          r2_score?: number | null
          rmse?: number | null
          training_time_seconds?: number | null
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          mae?: number | null
          metadata?: Json
          model_binary?: string
          r2_score?: number | null
          rmse?: number | null
          training_time_seconds?: number | null
          version?: string
        }
        Relationships: []
      }
      performance_history: {
        Row: {
          created_at: string
          data_period_end: string | null
          data_period_start: string | null
          evaluated_at: string
          id: string
          metrics: Json
          model_id: string | null
        }
        Insert: {
          created_at?: string
          data_period_end?: string | null
          data_period_start?: string | null
          evaluated_at?: string
          id?: string
          metrics: Json
          model_id?: string | null
        }
        Update: {
          created_at?: string
          data_period_end?: string | null
          data_period_start?: string | null
          evaluated_at?: string
          id?: string
          metrics?: Json
          model_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_history_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "model_artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          community_area: string
          confidence: number
          contributing_factors: Json
          created_at: string
          created_by: string | null
          date_range_end: string
          date_range_start: string
          id: string
          model_version: string
          predicted_crimes: number
          prediction_id: string
          risk_level: string
          status: Database["public"]["Enums"]["prediction_status"] | null
        }
        Insert: {
          community_area: string
          confidence: number
          contributing_factors?: Json
          created_at?: string
          created_by?: string | null
          date_range_end: string
          date_range_start: string
          id?: string
          model_version: string
          predicted_crimes: number
          prediction_id: string
          risk_level: string
          status?: Database["public"]["Enums"]["prediction_status"] | null
        }
        Update: {
          community_area?: string
          confidence?: number
          contributing_factors?: Json
          created_at?: string
          created_by?: string | null
          date_range_end?: string
          date_range_start?: string
          id?: string
          model_version?: string
          predicted_crimes?: number
          prediction_id?: string
          risk_level?: string
          status?: Database["public"]["Enums"]["prediction_status"] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "public" | "analyst" | "admin"
      audit_status: "success" | "warning" | "error" | "info"
      feedback_type: "bias_report" | "accuracy_concern" | "general"
      prediction_status: "pending" | "completed" | "failed"
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
      app_role: ["public", "analyst", "admin"],
      audit_status: ["success", "warning", "error", "info"],
      feedback_type: ["bias_report", "accuracy_concern", "general"],
      prediction_status: ["pending", "completed", "failed"],
    },
  },
} as const
