// Faturas emitidas, para o painel. Só servidor.

import { createAdminClient } from "@/lib/supabase/admin";

export type FaturaResumo = {
  id: string;
  workspaceId: string;
  empresa: string;
  planoNome: string;
  valorCents: number;
  pagoCents: number | null;
  periodoInicio: string;
  periodoFim: string;
  situacao: string;
  provedor: string;
  vencimento: string | null;
  pagoEm: string | null;
  criadaEm: string;
};

export const FATURA_TOM: Record<string, string> = {
  paga: "var(--positive)",
  aberta: "var(--status-due-soon-fg)",
  expirada: "var(--negative)",
  cancelada: "var(--text-muted)",
};

export async function listCharges(limite = 50): Promise<FaturaResumo[]> {
  const db = createAdminClient();

  const { data } = await db
    .from("subscription_charge")
    .select(
      "id, workspace_id, plan_name, amount_cents, paid_amount_cents, period_start, period_end, status, provider, expires_at, paid_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limite);

  const linhas = (data ?? []) as {
    id: string;
    workspace_id: string;
    plan_name: string;
    amount_cents: number;
    paid_amount_cents: number | null;
    period_start: string;
    period_end: string;
    status: string;
    provider: string;
    expires_at: string | null;
    paid_at: string | null;
    created_at: string;
  }[];

  if (linhas.length === 0) return [];

  // Nomes de empresa numa consulta, não uma por fatura.
  const ids = [...new Set(linhas.map((l) => l.workspace_id))];
  const { data: empresas } = await db
    .from("workspace")
    .select("id, name")
    .in("id", ids);
  const nome = new Map(
    ((empresas ?? []) as { id: string; name: string }[]).map((w) => [
      w.id,
      w.name,
    ])
  );

  return linhas.map((l) => ({
    id: l.id,
    workspaceId: l.workspace_id,
    empresa: nome.get(l.workspace_id) ?? "—",
    planoNome: l.plan_name,
    valorCents: l.amount_cents,
    pagoCents: l.paid_amount_cents,
    periodoInicio: l.period_start,
    periodoFim: l.period_end,
    situacao: l.status,
    provedor: l.provider,
    vencimento: l.expires_at,
    pagoEm: l.paid_at,
    criadaEm: l.created_at,
  }));
}
