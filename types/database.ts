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
export type TaskPriority =
  "sem_prioridade" | "baixa" | "media" | "alta" | "urgente";
export type AttachmentKind = "file" | "link";
export type TaskTimeSource = "manual" | "pomodoro";
export type FinanceKind = "entrada" | "saida";
export type FinanceStatus = "previsto" | "confirmado" | "cancelado";
export type ContractStatus =
  "rascunho" | "enviado" | "assinado" | "ativo" | "encerrado" | "cancelado";
export type BillingPeriod = "unico" | "mensal" | "trimestral" | "anual";
export type GcalStatus = "active" | "expired" | "revoked";

// Cor da marca por empresa (0071). Espelha o `check` da migration e a lista
// em lib/branding/themes.ts — mudar um sem o outro passa no typecheck e
// estoura no insert.
export type BrandThemeId =
  "azul" | "indigo" | "lilas" | "teal" | "verde" | "magenta" | "grafite";

// Conta de recebimento da empresa (0067). Espelham o `check` da migration —
// mudar um lado sem o outro deixa o typecheck passar e o insert estourar.
export type PaymentProviderId = "mercado_pago" | "asaas";
export type PaymentEnvironment = "sandbox" | "producao";
export type ClientType = "pf" | "pj";
export type ClientStatus = "prospecto" | "ativo" | "pausado" | "encerrado";
/**
 * O que a etapa do funil significa para o negócio, independente do nome que
 * ela tenha. Renomear "Fechado" para "Assinado" não muda o comportamento.
 */
export type DealStageKind = "aberta" | "ganho" | "perdido";
/** Notificação de evento. Alerta de prazo é derivado, não tem linha. */
export type NotificationKind =
  "mencao" | "atribuicao" | "comentario" | "aprovacao";
/** A que o clique da notificação leva. */
export type NotificationEntity = "task" | "chat_channel";
export type ChatMessageKind = "humano" | "sistema";
export type ChatChannelKind = "geral" | "grupo" | "direta";
/** Trilha de auditoria do workspace. */
export type AuditAction = "criou" | "alterou" | "excluiu";
/** Periodicidade de lançamento recorrente. "unico" não é recorrência. */
export type RecurrenceFrequency = "mensal" | "trimestral" | "anual";
/** Situação da assinatura do próprio SaaS. */
export type SubscriptionStatus = "ativa" | "pendente" | "vencida" | "cancelada";
export type ChargeStatus = "aberta" | "paga" | "expirada" | "cancelada";

export type Database = {
  public: {
    Tables: {
      workspace: {
        Row: {
          id: string;
          name: string;
          owner_user_id: string | null;
          plan: Plan;
          /** Plano atribuído. Fonte de verdade desde a 0050. */
          plan_id: string | null;
          /** Período de avaliação — sem cobrança. */
          trial: boolean;
          /** Fim do teste. Informativo: quem barra acesso é access_expires_at. */
          trial_ends_at: string | null;
          /** Contato de cobrança, que nem sempre é o de quem usa. */
          contact_email: string | null;
          contact_phone: string | null;
          seat_limit: number;
          access_expires_at: string | null;
          suspended: boolean;
          /** Indicação: null quando a empresa chegou sozinha. */
          affiliate_id: string | null;
          /** Cópia do percentual do afiliado no momento da indicação. */
          affiliate_percent: number | null;
          /** Cor da marca da empresa (0071). Lista fechada; rampas em tokens.css. */
          brand_theme: BrandThemeId;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_user_id?: string | null;
          plan?: Plan;
          plan_id?: string | null;
          trial?: boolean;
          trial_ends_at?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          seat_limit?: number;
          access_expires_at?: string | null;
          suspended?: boolean;
          affiliate_id?: string | null;
          affiliate_percent?: number | null;
          brand_theme?: BrandThemeId;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_user_id?: string | null;
          plan?: Plan;
          plan_id?: string | null;
          trial?: boolean;
          trial_ends_at?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          seat_limit?: number;
          access_expires_at?: string | null;
          suspended?: boolean;
          /** Indicação: afiliado e o percentual combinado na época. */
          affiliate_id?: string | null;
          affiliate_percent?: number | null;
          /** A 0071 devolveu ao cliente o UPDATE só desta coluna e de `name`. */
          brand_theme?: BrandThemeId;
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
          /** Quando a pessoa terminou o cadastro. Null = falta preencher. */
          onboarding_completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          locale?: string;
          timezone?: string;
          onboarding_completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          locale?: string;
          timezone?: string;
          onboarding_completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workspace_member: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: MemberRole;
          status: "active" | "pending";
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role: MemberRole;
          status?: "active" | "pending";
          created_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          role?: MemberRole;
          status?: "active" | "pending";
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
          wip_limit: number | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          sector_id: string;
          name: string;
          position?: number;
          is_done_column?: boolean;
          wip_limit?: number | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          sector_id?: string;
          name?: string;
          position?: number;
          is_done_column?: boolean;
          wip_limit?: number | null;
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
          client_id: string | null;
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
          gcal_add_meet: boolean;
          gcal_meet_url: string | null;
          recurrence_rule: string | null;
          recurrence_parent_id: string | null;
          cancelled_at: string | null;
          service: string | null;
          estimate_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          sector_id: string;
          project_id?: string | null;
          column_id?: string | null;
          client_id?: string | null;
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
          gcal_add_meet?: boolean;
          gcal_meet_url?: string | null;
          recurrence_rule?: string | null;
          recurrence_parent_id?: string | null;
          cancelled_at?: string | null;
          service?: string | null;
          estimate_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          sector_id?: string;
          project_id?: string | null;
          column_id?: string | null;
          client_id?: string | null;
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
          gcal_add_meet?: boolean;
          gcal_meet_url?: string | null;
          recurrence_rule?: string | null;
          recurrence_parent_id?: string | null;
          cancelled_at?: string | null;
          service?: string | null;
          estimate_minutes?: number | null;
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
      task_participant: {
        Row: {
          task_id: string;
          user_id: string;
          workspace_id: string;
          created_at: string;
        };
        Insert: {
          task_id: string;
          user_id: string;
          workspace_id: string;
          created_at?: string;
        };
        Update: {
          task_id?: string;
          user_id?: string;
          workspace_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      task_activity: {
        Row: {
          id: string;
          workspace_id: string;
          task_id: string;
          changed_by: string | null;
          field: string;
          old_value: string | null;
          new_value: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          task_id: string;
          changed_by?: string | null;
          field: string;
          old_value?: string | null;
          new_value?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          task_id?: string;
          changed_by?: string | null;
          field?: string;
          old_value?: string | null;
          new_value?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      task_comment: {
        Row: {
          id: string;
          workspace_id: string;
          task_id: string;
          author_id: string;
          body: string;
          mentioned_user_ids: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          task_id: string;
          author_id: string;
          body: string;
          mentioned_user_ids?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          task_id?: string;
          author_id?: string;
          body?: string;
          mentioned_user_ids?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      task_time_entry: {
        Row: {
          id: string;
          workspace_id: string;
          task_id: string;
          user_id: string;
          minutes: number;
          note: string | null;
          logged_on: string;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          task_id: string;
          user_id: string;
          minutes: number;
          note?: string | null;
          logged_on?: string;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          task_id?: string;
          user_id?: string;
          minutes?: number;
          note?: string | null;
          logged_on?: string;
          source?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      task_dependency: {
        Row: {
          task_id: string;
          depends_on_id: string;
          workspace_id: string;
          created_at: string;
        };
        Insert: {
          task_id: string;
          depends_on_id: string;
          workspace_id: string;
          created_at?: string;
        };
        Update: {
          task_id?: string;
          depends_on_id?: string;
          workspace_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      finance_entry: {
        Row: {
          id: string;
          workspace_id: string;
          kind: FinanceKind;
          description: string;
          amount_cents: number;
          status: FinanceStatus;
          due_date: string;
          confirmed_at: string | null;
          category: string | null;
          client_id: string | null;
          notes: string | null;
          source_type: string | null;
          source_id: string | null;
          installment_number: number | null;
          needs_invoice: boolean;
          invoice_number: string | null;
          invoice_issued_at: string | null;
          invoice_file_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          kind: FinanceKind;
          description: string;
          amount_cents: number;
          status?: FinanceStatus;
          due_date: string;
          confirmed_at?: string | null;
          category?: string | null;
          client_id?: string | null;
          notes?: string | null;
          source_type?: string | null;
          source_id?: string | null;
          installment_number?: number | null;
          needs_invoice?: boolean;
          invoice_number?: string | null;
          invoice_issued_at?: string | null;
          invoice_file_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          kind?: FinanceKind;
          description?: string;
          amount_cents?: number;
          status?: FinanceStatus;
          due_date?: string;
          confirmed_at?: string | null;
          category?: string | null;
          client_id?: string | null;
          notes?: string | null;
          source_type?: string | null;
          source_id?: string | null;
          installment_number?: number | null;
          needs_invoice?: boolean;
          invoice_number?: string | null;
          invoice_issued_at?: string | null;
          invoice_file_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      finance_goal: {
        Row: {
          id: string;
          workspace_id: string;
          month: string;
          target_cents: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          month: string;
          target_cents: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          month?: string;
          target_cents?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contract: {
        Row: {
          id: string;
          workspace_id: string;
          number: string | null;
          client_id: string;
          responsible_id: string | null;
          title: string;
          description: string | null;
          status: ContractStatus;
          issued_on: string | null;
          starts_on: string | null;
          ends_on: string | null;
          auto_renew: boolean;
          renew_notice_days: number | null;
          amount_cents: number | null;
          billing_period: BillingPeriod | null;
          payment_method: string | null;
          notes: string | null;
          signed_at: string | null;
          signed_document_url: string | null;
          template_id: string | null;
          template_version: number | null;
          body_snapshot: string | null;
          snapshot_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          number?: string | null;
          client_id: string;
          responsible_id?: string | null;
          title: string;
          description?: string | null;
          status?: ContractStatus;
          issued_on?: string | null;
          starts_on?: string | null;
          ends_on?: string | null;
          auto_renew?: boolean;
          renew_notice_days?: number | null;
          amount_cents?: number | null;
          billing_period?: BillingPeriod | null;
          payment_method?: string | null;
          notes?: string | null;
          signed_at?: string | null;
          signed_document_url?: string | null;
          template_id?: string | null;
          template_version?: number | null;
          body_snapshot?: string | null;
          snapshot_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          number?: string | null;
          client_id?: string;
          responsible_id?: string | null;
          title?: string;
          description?: string | null;
          status?: ContractStatus;
          issued_on?: string | null;
          starts_on?: string | null;
          ends_on?: string | null;
          auto_renew?: boolean;
          renew_notice_days?: number | null;
          amount_cents?: number | null;
          billing_period?: BillingPeriod | null;
          payment_method?: string | null;
          notes?: string | null;
          signed_at?: string | null;
          signed_document_url?: string | null;
          template_id?: string | null;
          template_version?: number | null;
          body_snapshot?: string | null;
          snapshot_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contract_template: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          body: string;
          version: number;
          archived_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          body?: string;
          version?: number;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          body?: string;
          version?: number;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      finance_recurrence: {
        Row: {
          id: string;
          workspace_id: string;
          kind: FinanceKind;
          description: string;
          amount_cents: number;
          category: string | null;
          client_id: string | null;
          frequency: RecurrenceFrequency;
          starts_on: string;
          ends_on: string | null;
          active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          kind: FinanceKind;
          description: string;
          amount_cents: number;
          category?: string | null;
          client_id?: string | null;
          frequency: RecurrenceFrequency;
          starts_on: string;
          ends_on?: string | null;
          active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          description?: string;
          amount_cents?: number;
          category?: string | null;
          client_id?: string | null;
          frequency?: RecurrenceFrequency;
          starts_on?: string;
          ends_on?: string | null;
          active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      share_link: {
        Row: {
          id: string;
          workspace_id: string;
          entity_type: "task";
          entity_id: string;
          token: string;
          label: string | null;
          expires_at: string;
          revoked_at: string | null;
          view_count: number;
          last_viewed_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          entity_type: "task";
          entity_id: string;
          label?: string | null;
          expires_at?: string;
          created_by?: string | null;
        };
        Update: { revoked_at?: string | null; label?: string | null };
        Relationships: [];
      };
      billing_plan: {
        Row: {
          id: string;
          name: string;
          price_cents: number;
          /** Assentos concedidos. Vira `workspace.seat_limit` ao atribuir. */
          max_users: number;
          /** Aparece para quem se cadastra sozinho. */
          is_public: boolean;
          active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price_cents: number;
          max_users: number;
          is_public?: boolean;
          active?: boolean;
          notes?: string | null;
        };
        Update: {
          name?: string;
          price_cents?: number;
          max_users?: number;
          is_public?: boolean;
          active?: boolean;
          notes?: string | null;
        };
        Relationships: [];
      };
      subscription: {
        Row: {
          workspace_id: string;
          plan_id: string | null;
          status: SubscriptionStatus;
          billing_day: number;
          provider: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          plan_id?: string | null;
          status?: SubscriptionStatus;
          billing_day?: number;
          provider?: string;
        };
        Update: {
          plan_id?: string | null;
          status?: SubscriptionStatus;
          billing_day?: number;
        };
        Relationships: [];
      };
      subscription_charge: {
        Row: {
          id: string;
          workspace_id: string;
          plan_id: string | null;
          /** Cópia do nome do plano na emissão — fatura não muda de valor. */
          plan_name: string;
          amount_cents: number;
          period_start: string;
          period_end: string;
          status: ChargeStatus;
          provider: string;
          provider_charge_id: string | null;
          qr_code: string | null;
          copia_e_cola: string | null;
          expires_at: string | null;
          paid_at: string | null;
          paid_amount_cents: number | null;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          plan_id?: string | null;
          plan_name: string;
          amount_cents: number;
          period_start: string;
          period_end: string;
          status?: ChargeStatus;
          provider?: string;
          provider_charge_id?: string | null;
          qr_code?: string | null;
          copia_e_cola?: string | null;
          expires_at?: string | null;
        };
        Update: {
          status?: ChargeStatus;
          provider_charge_id?: string | null;
          qr_code?: string | null;
          copia_e_cola?: string | null;
          paid_at?: string | null;
          paid_amount_cents?: number | null;
        };
        Relationships: [];
      };
      payment_event: {
        Row: {
          id: string;
          provider: string;
          external_id: string;
          payload: Json | null;
          received_at: string;
        };
        Insert: {
          provider?: string;
          external_id: string;
          payload?: Json | null;
        };
        Update: never;
        Relationships: [];
      };
      affiliate: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          /** Trecho do link: /r/<code>. */
          code: string;
          commission_percent: number;
          active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          code: string;
          commission_percent?: number;
          active?: boolean;
          notes?: string | null;
        };
        Update: {
          name?: string;
          email?: string | null;
          phone?: string | null;
          code?: string;
          commission_percent?: number;
          active?: boolean;
          notes?: string | null;
        };
        Relationships: [];
      };
      affiliate_click: {
        Row: {
          id: string;
          affiliate_id: string;
          referrer: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          affiliate_id: string;
          referrer?: string | null;
          user_agent?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          /** Null = evento de plataforma, fora de qualquer empresa (0072). */
          workspace_id: string | null;
          actor_id: string | null;
          action: AuditAction;
          entity_type: string;
          entity_id: string | null;
          summary: string;
          details: Json | null;
          created_at: string;
        };
        // Só os triggers escrevem, e a tabela é imutável: sem Insert nem
        // Update utilizáveis pelo cliente.
        Insert: never;
        Update: never;
        Relationships: [];
      };
      chat_channel: {
        Row: {
          id: string;
          workspace_id: string;
          sector_id: string | null;
          kind: ChatChannelKind;
          /** Par canônico dos participantes numa conversa direta. */
          dm_key: string | null;
          name: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          sector_id?: string | null;
          name: string;
          created_at?: string;
        };
        Update: { name?: string };
        Relationships: [];
      };
      chat_message: {
        Row: {
          id: string;
          workspace_id: string;
          channel_id: string;
          author_id: string | null;
          kind: ChatMessageKind;
          body: string;
          mentioned_user_ids: string[];
          entity_type: "task" | null;
          entity_id: string | null;
          reply_to_id: string | null;
          /** Etiqueta de assunto — o setor de que a mensagem trata. */
          sector_id: string | null;
          /** Arquivo da mensagem. Ou os quatro campos, ou nenhum. */
          storage_key: string | null;
          file_name: string | null;
          file_size_bytes: number | null;
          mime_type: string | null;
          /**
           * Duração do recado de voz, medida na gravação. WebM do
           * MediaRecorder não traz duração no cabeçalho, e o tocador
           * precisa dela antes de baixar o arquivo.
           */
          audio_duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          channel_id: string;
          author_id?: string | null;
          kind?: ChatMessageKind;
          body: string;
          mentioned_user_ids?: string[];
          entity_type?: "task" | null;
          entity_id?: string | null;
          reply_to_id?: string | null;
          sector_id?: string | null;
          storage_key?: string | null;
          file_name?: string | null;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          audio_duration_ms?: number | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      chat_message_reaction: {
        Row: {
          message_id: string;
          user_id: string;
          /** Um dos sete de `lib/chat/reactions.ts` — o banco recusa outros. */
          emoji: string;
          workspace_id: string;
          channel_id: string;
          created_at: string;
        };
        Insert: {
          message_id: string;
          user_id: string;
          emoji: string;
          workspace_id: string;
          channel_id: string;
        };
        // Trocar de reação é tirar e pôr; não há o que atualizar.
        Update: never;
        Relationships: [];
      };
      chat_channel_member: {
        Row: { channel_id: string; user_id: string };
        Insert: { channel_id: string; user_id: string };
        Update: never;
        Relationships: [];
      };
      chat_read_state: {
        Row: {
          channel_id: string;
          user_id: string;
          last_read_at: string;
        };
        Insert: {
          channel_id: string;
          user_id: string;
          last_read_at?: string;
        };
        Update: { last_read_at?: string };
        Relationships: [];
      };
      notification: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          kind: NotificationKind;
          entity_type: NotificationEntity;
          entity_id: string;
          actor_id: string | null;
          title: string;
          body: string | null;
          read_at: string | null;
          created_at: string;
        };
        // Só os triggers escrevem (não há policy de insert para o cliente),
        // mas o tipo existe para o gerado bater com o banco.
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          kind: NotificationKind;
          entity_type: NotificationEntity;
          entity_id: string;
          actor_id?: string | null;
          title: string;
          body?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };
      task_approval: {
        Row: {
          id: string;
          workspace_id: string;
          task_id: string;
          share_link_id: string | null;
          decision: "aprovado" | "ajuste";
          comment: string | null;
          /** O nome digitado pelo visitante. Não é identificação. */
          author_name: string | null;
          created_at: string;
        };
        // Quem grava é `record_task_approval`, não o cliente.
        Insert: never;
        Update: never;
        Relationships: [];
      };
      terms_acceptance: {
        Row: {
          id: string;
          user_id: string;
          version: string;
          accepted_at: string;
        };
        Insert: { user_id: string; version: string };
        // Aceite que se edita não prova nada.
        Update: never;
        Relationships: [];
      };
      notification_preference: {
        Row: {
          user_id: string;
          mencao: boolean;
          atribuicao: boolean;
          comentario: boolean;
          /** Resposta do cliente no link público (0064). */
          aprovacao: boolean;
          prazos: boolean;
          contratos: boolean;
          financeiro: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          mencao?: boolean;
          atribuicao?: boolean;
          comentario?: boolean;
          aprovacao?: boolean;
          prazos?: boolean;
          contratos?: boolean;
          financeiro?: boolean;
        };
        Update: {
          mencao?: boolean;
          atribuicao?: boolean;
          comentario?: boolean;
          aprovacao?: boolean;
          prazos?: boolean;
          contratos?: boolean;
          financeiro?: boolean;
        };
        Relationships: [];
      };
      platform_setting: {
        Row: {
          id: boolean;
          signups_enabled: boolean;
          updated_at: string;
        };
        Insert: { id?: boolean; signups_enabled?: boolean };
        Update: { signups_enabled?: boolean };
        Relationships: [];
      };
      service: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          /** Preço de tabela, em centavos. Copiado no uso, não referenciado. */
          price_cents: number;
          /** "por mês", "por peça" — rótulo curto ao lado do preço. */
          unit: string | null;
          active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          price_cents?: number;
          unit?: string | null;
          active?: boolean;
          notes?: string | null;
        };
        Update: {
          name?: string;
          price_cents?: number;
          unit?: string | null;
          active?: boolean;
          notes?: string | null;
        };
        Relationships: [];
      };
      pipeline_stage: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          position: number;
          kind: DealStageKind;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          position?: number;
          kind?: DealStageKind;
        };
        Update: {
          name?: string;
          position?: number;
          kind?: DealStageKind;
        };
        Relationships: [];
      };
      deal: {
        Row: {
          id: string;
          workspace_id: string;
          client_id: string;
          stage_id: string;
          title: string;
          /** Centavos inteiros. Null = negociação ainda sem preço. */
          amount_cents: number | null;
          position: number;
          responsible_id: string | null;
          expected_close_on: string | null;
          won_at: string | null;
          lost_at: string | null;
          lost_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          client_id: string;
          stage_id: string;
          title: string;
          amount_cents?: number | null;
          position?: number;
          responsible_id?: string | null;
          expected_close_on?: string | null;
          won_at?: string | null;
          lost_at?: string | null;
          lost_reason?: string | null;
          notes?: string | null;
        };
        Update: {
          client_id?: string;
          stage_id?: string;
          title?: string;
          amount_cents?: number | null;
          position?: number;
          responsible_id?: string | null;
          expected_close_on?: string | null;
          won_at?: string | null;
          lost_at?: string | null;
          lost_reason?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      client: {
        Row: {
          id: string;
          workspace_id: string;
          type: ClientType;
          name: string;
          fantasy_name: string | null;
          document: string | null;
          email: string | null;
          phone: string | null;
          status: ClientStatus;
          entry_date: string | null;
          notes: string | null;
          address: string | null;
          /** Endereço em campos, desde a 0058 — o CEP preenche. */
          zip_code: string | null;
          street: string | null;
          number: string | null;
          complement: string | null;
          district: string | null;
          city: string | null;
          state: string | null;
          representative_name: string | null;
          representative_document: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          type?: ClientType;
          name: string;
          fantasy_name?: string | null;
          document?: string | null;
          email?: string | null;
          phone?: string | null;
          status?: ClientStatus;
          entry_date?: string | null;
          notes?: string | null;
          address?: string | null;
          zip_code?: string | null;
          street?: string | null;
          number?: string | null;
          complement?: string | null;
          district?: string | null;
          city?: string | null;
          state?: string | null;
          representative_name?: string | null;
          representative_document?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          type?: ClientType;
          name?: string;
          fantasy_name?: string | null;
          document?: string | null;
          email?: string | null;
          phone?: string | null;
          status?: ClientStatus;
          entry_date?: string | null;
          notes?: string | null;
          address?: string | null;
          zip_code?: string | null;
          street?: string | null;
          number?: string | null;
          complement?: string | null;
          district?: string | null;
          city?: string | null;
          state?: string | null;
          representative_name?: string | null;
          representative_document?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_profile: {
        Row: {
          workspace_id: string;
          legal_name: string | null;
          document: string | null;
          /** pf ou pj — desde a 0063, `document` guarda CPF ou CNPJ. */
          document_type: "pf" | "pj" | null;
          state_registration: string | null;
          address: string | null;
          email: string | null;
          phone: string | null;
          representative_name: string | null;
          representative_document: string | null;
          representative_role: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          legal_name?: string | null;
          document?: string | null;
          document_type?: "pf" | "pj" | null;
          state_registration?: string | null;
          address?: string | null;
          email?: string | null;
          phone?: string | null;
          zip_code?: string | null;
          street?: string | null;
          number?: string | null;
          complement?: string | null;
          district?: string | null;
          city?: string | null;
          state?: string | null;
          representative_name?: string | null;
          representative_document?: string | null;
          representative_role?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          legal_name?: string | null;
          document?: string | null;
          document_type?: "pf" | "pj" | null;
          state_registration?: string | null;
          address?: string | null;
          email?: string | null;
          phone?: string | null;
          zip_code?: string | null;
          street?: string | null;
          number?: string | null;
          complement?: string | null;
          district?: string | null;
          city?: string | null;
          state?: string | null;
          representative_name?: string | null;
          representative_document?: string | null;
          representative_role?: string | null;
          created_at?: string;
          updated_at?: string;
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
      payment_gateway: {
        Row: {
          workspace_id: string;
          provider: PaymentProviderId;
          environment: PaymentEnvironment;
          /** Cifrado pela aplicação. Nunca sai do servidor. */
          credentials: string;
          account_label: string | null;
          active: boolean;
          last_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          provider: PaymentProviderId;
          environment: PaymentEnvironment;
          credentials: string;
          account_label?: string | null;
          active?: boolean;
          last_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          provider?: PaymentProviderId;
          environment?: PaymentEnvironment;
          credentials?: string;
          account_label?: string | null;
          active?: boolean;
          last_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      support_session: {
        Row: {
          id: string;
          workspace_id: string;
          admin_email: string;
          admin_user_id: string | null;
          impersonated_user_id: string;
          reason: string;
          started_at: string;
          /** Nulo enquanto a sessão está aberta. */
          ended_at: string | null;
          expires_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          admin_email: string;
          admin_user_id?: string | null;
          impersonated_user_id: string;
          reason: string;
          started_at?: string;
          ended_at?: string | null;
          expires_at: string;
        };
        // Só o encerramento muda depois de criada — quem entrou, quando e
        // por quê não se reescrevem.
        Update: {
          ended_at?: string | null;
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
      create_group_channel: {
        Args: { ws: string; nome: string; membros: string[] };
        Returns: string;
      };
      add_group_members: {
        Args: { canal: string; membros: string[] };
        Returns: undefined;
      };
      rename_group_channel: {
        Args: { canal: string; nome: string };
        Returns: undefined;
      };
      leave_group_channel: {
        Args: { canal: string };
        Returns: undefined;
      };
      register_share_view: {
        Args: { p_token: string };
        Returns: undefined;
      };
      /**
       * Trilha escrita pelo servidor, com o autor por parâmetro.
       *
       * Existe porque `write_audit` lê `auth.uid()`, que é nulo na conexão da
       * chave secreta. Só `service_role` executa — se `authenticated`
       * pudesse, daria para forjar linha em nome de outra pessoa.
       */
      write_audit_as: {
        Args: {
          ws: string;
          autor: string;
          acao: AuditAction;
          tipo: string;
          id_entidade: string | null;
          resumo: string;
          detalhes?: Json | null;
        };
        Returns: undefined;
      };
      /**
       * Auditoria de plataforma (0072): evento fora de qualquer empresa.
       * `security definer`, só `service_role` executa — a rota administrativa
       * roda com a chave secreta, onde `auth.uid()` é nulo, então o autor
       * entra por parâmetro.
       */
      write_platform_audit: {
        Args: {
          autor: string;
          acao: AuditAction;
          tipo: string;
          id_entidade: string | null;
          resumo: string;
          detalhes?: Json | null;
        };
        Returns: undefined;
      };
      /** Resposta do cliente pelo link público. Devolve false se o link não vale. */
      record_task_approval: {
        Args: {
          p_token: string;
          p_decision: "aprovado" | "ajuste";
          p_comment?: string | null;
          p_author?: string | null;
        };
        Returns: boolean;
      };
      open_direct_channel: {
        Args: { ws: string; other: string };
        /** id do canal direto — reaproveita o existente ou cria. */
        Returns: string;
      };
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
          p_service?: string | null;
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
export type Client = Tables<"client">;
export type Deal = Tables<"deal">;
export type Service = Tables<"service">;
export type TaskApproval = Tables<"task_approval">;
export type NotificationPreference = Tables<"notification_preference">;
export type PipelineStage = Tables<"pipeline_stage">;
export type WorkspaceProfile = Tables<"workspace_profile">;
export type TaskParticipant = Tables<"task_participant">;
export type TaskActivity = Tables<"task_activity">;
export type TaskComment = Tables<"task_comment">;
export type TaskTimeEntry = Tables<"task_time_entry">;
export type TaskDependency = Tables<"task_dependency">;
export type FinanceEntry = Tables<"finance_entry">;
export type Contract = Tables<"contract">;
export type ContractTemplate = Tables<"contract_template">;
export type FinanceGoal = Tables<"finance_goal">;
export type Notification = Tables<"notification">;
export type ChatChannel = Tables<"chat_channel">;
export type ChatMessage = Tables<"chat_message">;
export type ChatReadState = Tables<"chat_read_state">;
export type ChatChannelMember = Tables<"chat_channel_member">;
export type ChatMessageReaction = Tables<"chat_message_reaction">;
export type AuditLog = Tables<"audit_log">;
export type ShareLink = Tables<"share_link">;
export type BillingPlan = Tables<"billing_plan">;
export type Subscription = Tables<"subscription">;
export type SubscriptionCharge = Tables<"subscription_charge">;
export type FinanceRecurrence = Tables<"finance_recurrence">;
export type Affiliate = Tables<"affiliate">;
export type AffiliateClick = Tables<"affiliate_click">;
