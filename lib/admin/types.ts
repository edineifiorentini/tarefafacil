export type ClientRow = {
  id: string;
  name: string;
  /** Plano do cadastro (`billing_plan`). Null = ainda sem plano atribuído. */
  plan_id: string | null;
  /** Nome do plano no momento da leitura, só para exibir. */
  plan_name: string | null;
  /** Período de avaliação: usa o sistema, não entra na cobrança. */
  trial: boolean;
  seat_limit: number;
  access_expires_at: string | null;
  expired: boolean;
  suspended: boolean;
  member_count: number;
  owner_email: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
};

export type PlanRow = {
  id: string;
  name: string;
  price_cents: number;
  max_users: number;
  is_public: boolean;
  active: boolean;
  notes: string | null;
  /** Quantas empresas estão neste plano — é o que decide se dá pra excluir. */
  workspace_count: number;
};

export type AffiliateRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  /** Trecho do link de indicação: /r/<code>. */
  code: string;
  commission_percent: number;
  active: boolean;
  notes: string | null;
  click_count: number;
  /** Empresas que chegaram por este afiliado. */
  workspace_count: number;
  /** Comissão sobre cobrança já paga, em centavos. */
  commission_cents: number;
  created_at: string;
};
