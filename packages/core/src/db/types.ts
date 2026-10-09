export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      competitors: {
        Row: {
          active: boolean
          id: string
          name: string
          project_id: string
          url: string
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          project_id: string
          url: string
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          project_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      diffs: {
        Row: {
          commit: string | null
          competitor_id: string | null
          created_at: string
          description: string
          id: string
          instruction: string
          new_screenshot_id: string | null
          old_screenshot_id: string | null
          project_id: string
          statement: string | null
          status: Database["public"]["Enums"]["diff_status"]
          title: string
          type: Database["public"]["Enums"]["diff_type"]
          updated_at: string
        }
        Insert: {
          commit?: string | null
          competitor_id?: string | null
          created_at?: string
          description: string
          id?: string
          instruction: string
          new_screenshot_id?: string | null
          old_screenshot_id?: string | null
          project_id: string
          statement?: string | null
          status?: Database["public"]["Enums"]["diff_status"]
          title: string
          type: Database["public"]["Enums"]["diff_type"]
          updated_at?: string
        }
        Update: {
          commit?: string | null
          competitor_id?: string | null
          created_at?: string
          description?: string
          id?: string
          instruction?: string
          new_screenshot_id?: string | null
          old_screenshot_id?: string | null
          project_id?: string
          statement?: string | null
          status?: Database["public"]["Enums"]["diff_status"]
          title?: string
          type?: Database["public"]["Enums"]["diff_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diffs_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diffs_new_screenshot_id_fkey"
            columns: ["new_screenshot_id"]
            isOneToOne: false
            referencedRelation: "screenshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diffs_old_screenshot_id_fkey"
            columns: ["old_screenshot_id"]
            isOneToOne: false
            referencedRelation: "screenshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diffs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          active: boolean
          created_at: string
          deployment_url: string | null
          id: string
          name: string
          repo_url: string
          user_id: string
          version: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          deployment_url?: string | null
          id?: string
          name: string
          repo_url: string
          user_id: string
          version?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          deployment_url?: string | null
          id?: string
          name?: string
          repo_url?: string
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      screenshots: {
        Row: {
          id: string
          screenshot_bucket_id: string
          screenshot_public_url: string
          snapshot_id: string
          title: string
        }
        Insert: {
          id?: string
          screenshot_bucket_id: string
          screenshot_public_url: string
          snapshot_id: string
          title: string
        }
        Update: {
          id?: string
          screenshot_bucket_id?: string
          screenshot_public_url?: string
          snapshot_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "screenshots_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      snapshots: {
        Row: {
          competitor_id: string
          created_at: string
          dom_hash: string
          dom_snapshot: string
          id: string
        }
        Insert: {
          competitor_id: string
          created_at?: string
          dom_hash: string
          dom_snapshot: string
          id?: string
        }
        Update: {
          competitor_id?: string
          created_at?: string
          dom_hash?: string
          dom_snapshot?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          email: string | null
          id: string
          name: string | null
        }
        Insert: {
          email?: string | null
          id: string
          name?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      diff_status: "created" | "approved" | "denied" | "implemented" | "failed"
      diff_type: "snapshot" | "analytic"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      diff_status: ["created", "approved", "denied", "implemented", "failed"],
      diff_type: ["snapshot", "analytic"],
    },
  },
} as const

