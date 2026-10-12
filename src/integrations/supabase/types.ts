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
      calendar_entries: {
        Row: {
          created_at: string
          entry_date: string
          external_link: string | null
          id: string
          media_url: string | null
          site_id: string
          text_content: string | null
          type: string
        }
        Insert: {
          created_at?: string
          entry_date: string
          external_link?: string | null
          id?: string
          media_url?: string | null
          site_id: string
          text_content?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          external_link?: string | null
          id?: string
          media_url?: string | null
          site_id?: string
          text_content?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_entries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "gift_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          author_name: string
          created_at: string
          edit_token: string | null
          external_link: string | null
          id: string
          media_url: string | null
          module_type: string
          ornament_key: string | null
          site_id: string
          status: string
          text_content: string | null
          visibility: string
        }
        Insert: {
          author_name: string
          created_at?: string
          edit_token?: string | null
          external_link?: string | null
          id?: string
          media_url?: string | null
          module_type: string
          ornament_key?: string | null
          site_id: string
          status?: string
          text_content?: string | null
          visibility?: string
        }
        Update: {
          author_name?: string
          created_at?: string
          edit_token?: string | null
          external_link?: string | null
          id?: string
          media_url?: string | null
          module_type?: string
          ornament_key?: string | null
          site_id?: string
          status?: string
          text_content?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "gift_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_sites: {
        Row: {
          background_style: string
          calendar_locked: boolean
          countdown_date: string | null
          created_at: string
          creator_id: string
          custom_colors: Json
          custom_text: Json
          font_choice: string
          format: string
          format_settings: Json
          id: string
          intro_text: string | null
          palette_id: string | null
          share_notes: boolean
          slug: string
          status: string
          theme_id: string | null
          title: string
          tree_reveal_date: string | null
        }
        Insert: {
          background_style?: string
          calendar_locked?: boolean
          countdown_date?: string | null
          created_at?: string
          creator_id: string
          custom_colors?: Json
          custom_text?: Json
          font_choice?: string
          format?: string
          format_settings?: Json
          id?: string
          intro_text?: string | null
          palette_id?: string | null
          share_notes?: boolean
          slug: string
          status?: string
          theme_id?: string | null
          title: string
          tree_reveal_date?: string | null
        }
        Update: {
          background_style?: string
          calendar_locked?: boolean
          countdown_date?: string | null
          created_at?: string
          creator_id?: string
          custom_colors?: Json
          custom_text?: Json
          font_choice?: string
          format?: string
          format_settings?: Json
          id?: string
          intro_text?: string | null
          palette_id?: string | null
          share_notes?: boolean
          slug?: string
          status?: string
          theme_id?: string | null
          title?: string
          tree_reveal_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_sites_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_sites_palette_id_fkey"
            columns: ["palette_id"]
            isOneToOne: false
            referencedRelation: "palettes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_sites_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      palettes: {
        Row: {
          accent: string
          background: string
          created_at: string
          group_name: string
          id: string
          name: string
          primary_color: string
          sort_order: number
        }
        Insert: {
          accent: string
          background: string
          created_at?: string
          group_name: string
          id?: string
          name: string
          primary_color: string
          sort_order?: number
        }
        Update: {
          accent?: string
          background?: string
          created_at?: string
          group_name?: string
          id?: string
          name?: string
          primary_color?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
        }
        Relationships: []
      }
      site_modules: {
        Row: {
          enabled: boolean
          id: string
          module_type: string
          price: number
          site_id: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          module_type: string
          price?: number
          site_id: string
        }
        Update: {
          enabled?: boolean
          id?: string
          module_type?: string
          price?: number
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_modules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "gift_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          category: string
          created_at: string
          default_modules: string[]
          description: string | null
          id: string
          name: string
          palettes: Json
          preview_image_url: string | null
          status: string
          suggested_palette_ids: string[]
        }
        Insert: {
          category: string
          created_at?: string
          default_modules?: string[]
          description?: string | null
          id?: string
          name: string
          palettes?: Json
          preview_image_url?: string | null
          status?: string
          suggested_palette_ids?: string[]
        }
        Update: {
          category?: string
          created_at?: string
          default_modules?: string[]
          description?: string | null
          id?: string
          name?: string
          palettes?: Json
          preview_image_url?: string | null
          status?: string
          suggested_palette_ids?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      public_tree_ornaments: {
        Row: {
          author_name: string | null
          created_at: string | null
          id: string | null
          ornament_key: string | null
          site_id: string | null
          status: string | null
          text_content: string | null
          visibility: string | null
        }
        Insert: {
          author_name?: string | null
          created_at?: string | null
          id?: string | null
          ornament_key?: string | null
          site_id?: string | null
          status?: string | null
          text_content?: never
          visibility?: string | null
        }
        Update: {
          author_name?: string | null
          created_at?: string | null
          id?: string | null
          ornament_key?: string | null
          site_id?: string | null
          status?: string | null
          text_content?: never
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "gift_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sealed_contributions: {
        Row: {
          author_name: string | null
          created_at: string | null
          id: string | null
          module_type: string | null
          ornament_key: string | null
          site_id: string | null
          status: string | null
          visibility: string | null
        }
        Insert: {
          author_name?: string | null
          created_at?: string | null
          id?: string | null
          module_type?: string | null
          ornament_key?: string | null
          site_id?: string | null
          status?: string | null
          visibility?: string | null
        }
        Update: {
          author_name?: string | null
          created_at?: string | null
          id?: string | null
          module_type?: string | null
          ornament_key?: string | null
          site_id?: string | null
          status?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "gift_sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      delete_own_contribution: {
        Args: { p_id: string; p_token: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      update_own_contribution: {
        Args: {
          p_id: string
          p_link: string
          p_media: string
          p_text: string
          p_token: string
          p_visibility: string
        }
        Returns: boolean
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
