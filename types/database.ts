// =====================================================================
// TarefaFácil — tipos do banco
// Escrito à mão a partir de supabase/migrations (schema da seção 4.2).
// Compatível com createClient<Database>() do supabase-js.
// Manter em sincronia com as migrations ao alterar o schema.
// =====================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enums de domínio (checks no banco)
export type Plan = "free" | "pro" | "team";
export type MemberRole = "owner" | "admin" | "member" | "viewer";
export type SectorColor = "violeta" | "azul" | "coral" | "rosa" | "grafite";
export type ProjectStatus = "planejado" | "ativo" | "pausado" | "concluido";
export type TaskPriority = "baixa" | "media" | "alta";
export type AttachmentKind = "file" | "link";
export type GcalStatus = "active" | "expired" | "revoked";

export type Database = {
  public: {
    Tables: {
      workspace: {
        Row: {
          id: string;
          name: string;
          owner_user_id: string | null;
          plan: Plan;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_user_id?: string | null;
          plan?: Plan;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_user_id?: string | null;
          plan?: Plan;
          created_at?: string;
        };
        Relationships: [];
      };
      app_user: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          locale: string;
          timezone: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          locale?: string;
          timezone?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          locale?: string;
          timezone?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      workspace_member: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role: MemberRole;
          created_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          role?: MemberRole;
          created_at?: string;
        };
        Relationships: [];
      };
      sector: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          color: string; // hexadecimal livre (#RRGGBB) — ver migration 0005
          icon: string;
          position: number;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          color: string;
          icon?: string;
          position?: number;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          color?: string;
          icon?: string;
          position?: number;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      board_column: {
        Row: {
          id: string;
          workspace_id: string;
          sector_id: string;
          name: string;
          position: number;
          is_done_column: boolean;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          sector_id: string;
          name: string;
          position?: number;
          is_done_column?: boolean;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          sector_id?: string;
          name?: string;
          position?: number;
          is_done_column?: boolean;
        };
        Relationships: [];
      };
      project: {
        Row: {
          id: string;
          workspace_id: string;
          sector_id: string;
          name: string;
          description: string | null;
          starts_on: string | null;
          ends_on: string | null;
          status: ProjectStatus;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          sector_id: string;
          name: string;
          description?: string | null;
          starts_on?: string | null;
          ends_on?: string | null;
          status?: ProjectStatus;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          sector_id?: string;
          name?: string;
          description?: string | null;
          starts_on?: string | null;
          ends_on?: string | null;
          status?: ProjectStatus;
          archived_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      task: {
        Row: {
          id: string;
          workspace_id: string;
          sector_id: string;
          project_id: string | null;
          column_id: string | null;
          title: string;
          description: string | null;
          due_date: string | null;
          due_time: string | null;
          due_end_time: string | null;
          priority: TaskPriority;
          assignee_id: string | null;
          completed_at: string | null;
          position: number;
          gcal_sync: boolean;
          gcal_event_id: string | null;
          gcal_etag: string | null;
          gcal_synced_at: string | null;
          gcal_external_edit_at: string | null;
          gcal_undo: Json | null;
          recurrence_rule: string | null;
          recurrence_parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          sector_id: string;
          project_id?: string | null;
          column_id?: string | null;
          title: string;
          description?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          due_end_time?: string | null;
          priority?: TaskPriority;
          assignee_id?: string | null;
          completed_at?: string | null;
          position?: number;
          gcal_sync?: boolean;
          gcal_event_id?: string | null;
          gcal_etag?: string | null;
          gcal_synced_at?: string | null;
          gcal_external_edit_at?: string | null;
          gcal_undo?: Json | null;
          recurrence_rule?: string | null;
          recurrence_parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          sector_id?: string;
          project_id?: string | null;
          column_id?: string | null;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          due_end_time?: string | null;
          priority?: TaskPriority;
          assignee_id?: string | null;
          completed_at?: string | null;
          position?: number;
          gcal_sync?: boolean;
          gcal_event_id?: string | null;
          gcal_etag?: string | null;
          gcal_synced_at?: string | null;
          gcal_external_edit_at?: string | null;
          gcal_undo?: Json | null;
          recurrence_rule?: string | null;
          recurrence_parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subtask: {
        Row: {
          id: string;
          workspace_id: string;
          task_id: string;
          title: string;
          due_date: string | null;
          completed_at: string | null;
          position: number;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          task_id: string;
          title: string;
          due_date?: string | null;
          completed_at?: string | null;
          position?: number;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          task_id?: string;
          title?: string;
          due_date?: string | null;
          completed_at?: string | null;
          position?: number;
        };
        Relationships: [];
      };
      insight: {
        Row: {
          id: string;
          workspace_id: string;
          task_id: string;
          body: string;
          author_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          task_id: string;
          body: string;
          author_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          task_id?: string;
          body?: string;
          author_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      attachment: {
        Row: {
          id: string;
          workspace_id: string;
          task_id: string;
          kind: AttachmentKind;
          storage_key: string | null;
          external_url: string | null;
          filename: string;
          mime_type: string | null;
          size_bytes: number | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          task_id: string;
          kind: AttachmentKind;
          storage_key?: string | null;
          external_url?: string | null;
          filename: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          task_id?: string;
          kind?: AttachmentKind;
          storage_key?: string | null;
          external_url?: string | null;
          filename?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tag: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          color: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          color?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          color?: string | null;
        };
        Relationships: [];
      };
      task_tag: {
        Row: {
          task_id: string;
          tag_id: string;
        };
        Insert: {
          task_id: string;
          tag_id: string;
        };
        Update: {
          task_id?: string;
          tag_id?: string;
        };
        Relationships: [];
      };
      google_connection: {
        Row: {
          workspace_id: string;
          user_id: string;
          google_email: string | null;
          access_token: string | null;
          refresh_token: string;
          token_expiry: string | null;
          scope: string | null;
          status: GcalStatus;
          sync_token: string | null;
          channel_id: string | null;
          channel_resource_id: string | null;
          channel_expiration: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          google_email?: string | null;
          access_token?: string | null;
          refresh_token: string;
          token_expiry?: string | null;
          scope?: string | null;
          status?: GcalStatus;
          sync_token?: string | null;
          channel_id?: string | null;
          channel_resource_id?: string | null;
          channel_expiration?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          google_email?: string | null;
          access_token?: string | null;
          refresh_token?: string;
          token_expiry?: string | null;
          scope?: string | null;
          status?: GcalStatus;
          sync_token?: string | null;
          channel_id?: string | null;
          channel_resource_id?: string | null;
          channel_expiration?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_invite: {
        Row: {
          id: string;
          workspace_id: string;
          email: string | null;
          role: Exclude<MemberRole, "owner">;
          token: string;
          invited_by: string | null;
          status: "pending" | "accepted" | "revoked";
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          email?: string | null;
          role?: Exclude<MemberRole, "owner">;
          token?: string;
          invited_by?: string | null;
          status?: "pending" | "accepted" | "revoked";
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          email?: string | null;
          role?: Exclude<MemberRole, "owner">;
          token?: string;
          invited_by?: string | null;
          status?: "pending" | "accepted" | "revoked";
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_member: {
        Args: { ws: string };
        Returns: boolean;
      };
      search_tasks: {
        Args: {
          q?: string;
          p_sectors?: string[] | null;
          p_tags?: string[] | null;
          p_priorities?: string[] | null;
          p_status?: string | null;
          p_due_from?: string | null;
          p_due_to?: string | null;
        };
        Returns: Database["public"]["Tables"]["task"]["Row"][];
      };
      has_role: {
        Args: { ws: string; roles: string[] };
        Returns: boolean;
      };
      create_workspace: {
        Args: { p_name: string };
        Returns: string;
      };
      accept_invite: {
        Args: { p_token: string };
        Returns: string;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

// Atalhos de conveniência
type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Workspace = Tables<"workspace">;
export type AppUser = Tables<"app_user">;
export type WorkspaceMember = Tables<"workspace_member">;
export type Sector = Tables<"sector">;
export type BoardColumn = Tables<"board_column">;
export type Project = Tables<"project">;
export type Task = Tables<"task">;
export type Subtask = Tables<"subtask">;
export type Insight = Tables<"insight">;
export type Attachment = Tables<"attachment">;
export type Tag = Tables<"tag">;
export type TaskTag = Tables<"task_tag">;
export type GoogleConnection = Tables<"google_connection">;
export type WorkspaceInvite = Tables<"workspace_invite">;
