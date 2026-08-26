export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          after_digest: string | null;
          before_digest: string | null;
          created_at: string;
          id: string;
          request_id: string | null;
          target_id: string | null;
          target_type: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          after_digest?: string | null;
          before_digest?: string | null;
          created_at?: string;
          id?: string;
          request_id?: string | null;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after_digest?: string | null;
          before_digest?: string | null;
          created_at?: string;
          id?: string;
          request_id?: string | null;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [];
      };
      availability_snapshots: {
        Row: {
          archived_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          next_available_on: string | null;
          profile_id: string;
          updated_at: string;
          weekly_hours: number;
          work_mode: string | null;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          expires_at: string;
          id?: string;
          next_available_on?: string | null;
          profile_id: string;
          updated_at?: string;
          weekly_hours: number;
          work_mode?: string | null;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          next_available_on?: string | null;
          profile_id?: string;
          updated_at?: string;
          weekly_hours?: number;
          work_mode?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "availability_snapshots_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      cms_pages: {
        Row: {
          archived_at: string | null;
          author_id: string;
          created_at: string;
          current_revision_id: string | null;
          id: string;
          locale: string;
          published_at: string | null;
          slug: string;
          stable_key: string;
          state: Database["public"]["Enums"]["cms_state"];
          translation_group_id: string;
          updated_at: string;
          updated_by_id: string;
        };
        Insert: {
          archived_at?: string | null;
          author_id: string;
          created_at?: string;
          current_revision_id?: string | null;
          id?: string;
          locale: string;
          published_at?: string | null;
          slug: string;
          stable_key: string;
          state?: Database["public"]["Enums"]["cms_state"];
          translation_group_id: string;
          updated_at?: string;
          updated_by_id: string;
        };
        Update: {
          archived_at?: string | null;
          author_id?: string;
          created_at?: string;
          current_revision_id?: string | null;
          id?: string;
          locale?: string;
          published_at?: string | null;
          slug?: string;
          stable_key?: string;
          state?: Database["public"]["Enums"]["cms_state"];
          translation_group_id?: string;
          updated_at?: string;
          updated_by_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cms_pages_current_revision_fk";
            columns: ["current_revision_id"];
            isOneToOne: false;
            referencedRelation: "cms_revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      cms_revisions: {
        Row: {
          author_id: string;
          blocks: Json;
          change_summary: string;
          created_at: string;
          id: string;
          page_id: string;
          published_at: string | null;
          revision_number: number;
          seo_description: string | null;
          seo_title: string | null;
          state: Database["public"]["Enums"]["cms_state"];
          title: string;
        };
        Insert: {
          author_id: string;
          blocks: Json;
          change_summary?: string;
          created_at?: string;
          id?: string;
          page_id: string;
          published_at?: string | null;
          revision_number: number;
          seo_description?: string | null;
          seo_title?: string | null;
          state: Database["public"]["Enums"]["cms_state"];
          title: string;
        };
        Update: {
          author_id?: string;
          blocks?: Json;
          change_summary?: string;
          created_at?: string;
          id?: string;
          page_id?: string;
          published_at?: string | null;
          revision_number?: number;
          seo_description?: string | null;
          seo_title?: string | null;
          state?: Database["public"]["Enums"]["cms_state"];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cms_revisions_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "cms_pages";
            referencedColumns: ["id"];
          },
        ];
      };
      membership_history: {
        Row: {
          approved_by: string | null;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          evidence_digest: string | null;
          id: string;
          tier: Database["public"]["Enums"]["membership_tier"];
          user_id: string;
        };
        Insert: {
          approved_by?: string | null;
          created_at?: string;
          effective_from: string;
          effective_to?: string | null;
          evidence_digest?: string | null;
          id?: string;
          tier: Database["public"]["Enums"]["membership_tier"];
          user_id: string;
        };
        Update: {
          approved_by?: string | null;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          evidence_digest?: string | null;
          id?: string;
          tier?: Database["public"]["Enums"]["membership_tier"];
          user_id?: string;
        };
        Relationships: [];
      };
      portfolio_items: {
        Row: {
          archived_at: string | null;
          created_at: string;
          external_url: string | null;
          id: string;
          profile_id: string;
          public_consent_at: string | null;
          role_summary: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          external_url?: string | null;
          id?: string;
          profile_id: string;
          public_consent_at?: string | null;
          role_summary: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          external_url?: string | null;
          id?: string;
          profile_id?: string;
          public_consent_at?: string | null;
          role_summary?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_items_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      private_profile_details: {
        Row: {
          archived_at: string | null;
          consent_at: string;
          created_at: string;
          encrypted_payload: string;
          encryption_key_version: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          consent_at: string;
          created_at?: string;
          encrypted_payload: string;
          encryption_key_version: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          consent_at?: string;
          created_at?: string;
          encrypted_payload?: string;
          encryption_key_version?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "private_profile_details_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      profile_skills: {
        Row: {
          created_at: string;
          last_used_on: string | null;
          level: number;
          profile_id: string;
          skill_id: string;
          updated_at: string;
          verification: Database["public"]["Enums"]["skill_verification"];
          years_experience: number | null;
        };
        Insert: {
          created_at?: string;
          last_used_on?: string | null;
          level: number;
          profile_id: string;
          skill_id: string;
          updated_at?: string;
          verification?: Database["public"]["Enums"]["skill_verification"];
          years_experience?: number | null;
        };
        Update: {
          created_at?: string;
          last_used_on?: string | null;
          level?: number;
          profile_id?: string;
          skill_id?: string;
          updated_at?: string;
          verification?: Database["public"]["Enums"]["skill_verification"];
          years_experience?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "profile_skills_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "profile_skills_skill_id_fkey";
            columns: ["skill_id"];
            isOneToOne: false;
            referencedRelation: "skills";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          archived_at: string | null;
          consent_version: string | null;
          country_code: string | null;
          created_at: string;
          locale: string;
          professional_name: string;
          public_bio: string | null;
          public_consent_at: string | null;
          public_slug: string | null;
          timezone: string | null;
          updated_at: string;
          user_id: string;
          visibility: Database["public"]["Enums"]["profile_visibility"];
        };
        Insert: {
          archived_at?: string | null;
          consent_version?: string | null;
          country_code?: string | null;
          created_at?: string;
          locale: string;
          professional_name: string;
          public_bio?: string | null;
          public_consent_at?: string | null;
          public_slug?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id: string;
          visibility?: Database["public"]["Enums"]["profile_visibility"];
        };
        Update: {
          archived_at?: string | null;
          consent_version?: string | null;
          country_code?: string | null;
          created_at?: string;
          locale?: string;
          professional_name?: string;
          public_bio?: string | null;
          public_consent_at?: string | null;
          public_slug?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id?: string;
          visibility?: Database["public"]["Enums"]["profile_visibility"];
        };
        Relationships: [];
      };
      project_intakes: {
        Row: {
          applicant_id: string | null;
          archived_at: string | null;
          assigned_reviewer_id: string | null;
          attachment_count: number;
          consent_at: string;
          created_at: string;
          email_lookup: string;
          encrypted_internal_notes: string | null;
          encrypted_payload: string;
          encryption_key_version: string;
          id: string;
          idempotency_key_hash: string;
          locale: string;
          policy_version: string;
          service_areas: string[];
          status: Database["public"]["Enums"]["intake_status"];
          submission_id: string;
          updated_at: string;
        };
        Insert: {
          applicant_id?: string | null;
          archived_at?: string | null;
          assigned_reviewer_id?: string | null;
          attachment_count?: number;
          consent_at: string;
          created_at?: string;
          email_lookup: string;
          encrypted_internal_notes?: string | null;
          encrypted_payload: string;
          encryption_key_version: string;
          id?: string;
          idempotency_key_hash: string;
          locale: string;
          policy_version: string;
          service_areas: string[];
          status?: Database["public"]["Enums"]["intake_status"];
          submission_id: string;
          updated_at?: string;
        };
        Update: {
          applicant_id?: string | null;
          archived_at?: string | null;
          assigned_reviewer_id?: string | null;
          attachment_count?: number;
          consent_at?: string;
          created_at?: string;
          email_lookup?: string;
          encrypted_internal_notes?: string | null;
          encrypted_payload?: string;
          encryption_key_version?: string;
          id?: string;
          idempotency_key_hash?: string;
          locale?: string;
          policy_version?: string;
          service_areas?: string[];
          status?: Database["public"]["Enums"]["intake_status"];
          submission_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      skills: {
        Row: {
          archived_at: string | null;
          canonical_name: string;
          category: string;
          created_at: string;
          id: string;
        };
        Insert: {
          archived_at?: string | null;
          canonical_name: string;
          category: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          archived_at?: string | null;
          canonical_name?: string;
          category?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [];
      };
      talent_intakes: {
        Row: {
          applicant_id: string | null;
          application_consent_at: string;
          archived_at: string | null;
          assigned_reviewer_id: string | null;
          attachment_count: number;
          created_at: string;
          data_processing_consent_at: string;
          email_lookup: string;
          encrypted_internal_notes: string | null;
          encrypted_payload: string;
          encryption_key_version: string;
          experience_band: string;
          id: string;
          idempotency_key_hash: string;
          locale: string;
          policy_version: string;
          public_profile_consent: boolean;
          skill_areas: string[];
          status: Database["public"]["Enums"]["intake_status"];
          submission_id: string;
          updated_at: string;
        };
        Insert: {
          applicant_id?: string | null;
          application_consent_at: string;
          archived_at?: string | null;
          assigned_reviewer_id?: string | null;
          attachment_count?: number;
          created_at?: string;
          data_processing_consent_at: string;
          email_lookup: string;
          encrypted_internal_notes?: string | null;
          encrypted_payload: string;
          encryption_key_version: string;
          experience_band: string;
          id?: string;
          idempotency_key_hash: string;
          locale: string;
          policy_version: string;
          public_profile_consent?: boolean;
          skill_areas: string[];
          status?: Database["public"]["Enums"]["intake_status"];
          submission_id: string;
          updated_at?: string;
        };
        Update: {
          applicant_id?: string | null;
          application_consent_at?: string;
          archived_at?: string | null;
          assigned_reviewer_id?: string | null;
          attachment_count?: number;
          created_at?: string;
          data_processing_consent_at?: string;
          email_lookup?: string;
          encrypted_internal_notes?: string | null;
          encrypted_payload?: string;
          encryption_key_version?: string;
          experience_band?: string;
          id?: string;
          idempotency_key_hash?: string;
          locale?: string;
          policy_version?: string;
          public_profile_consent?: boolean;
          skill_areas?: string[];
          status?: Database["public"]["Enums"]["intake_status"];
          submission_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          revoked_at: string | null;
          role: Database["public"]["Enums"]["umoja_role"];
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          revoked_at?: string | null;
          role: Database["public"]["Enums"]["umoja_role"];
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["umoja_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      publish_cms_page: {
        Args: { change_summary?: string; page_id: string };
        Returns: {
          archived_at: string | null;
          author_id: string;
          created_at: string;
          current_revision_id: string | null;
          id: string;
          locale: string;
          published_at: string | null;
          slug: string;
          stable_key: string;
          state: Database["public"]["Enums"]["cms_state"];
          translation_group_id: string;
          updated_at: string;
          updated_by_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "cms_pages";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      cms_state: "draft" | "review" | "published" | "archived";
      intake_status:
        "new" | "triage" | "in_review" | "contacted" | "accepted" | "closed" | "duplicate";
      membership_tier: "applicant" | "extended" | "core" | "lead";
      profile_visibility: "private" | "public";
      skill_verification: "self_reported" | "verified";
      umoja_role: "admin" | "cms-editor" | "reviewer" | "core" | "extended" | "project-manager";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cms_state: ["draft", "review", "published", "archived"],
      intake_status: ["new", "triage", "in_review", "contacted", "accepted", "closed", "duplicate"],
      membership_tier: ["applicant", "extended", "core", "lead"],
      profile_visibility: ["private", "public"],
      skill_verification: ["self_reported", "verified"],
      umoja_role: ["admin", "cms-editor", "reviewer", "core", "extended", "project-manager"],
    },
  },
} as const;
