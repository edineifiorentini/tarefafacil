import { createAdminClient } from "@/lib/supabase/admin";

import type { Environment, ProviderId } from "./provider";

/**
 * Acesso à `payment_gateway`.
 *
 * Sempre pela chave secreta: a tabela tem RLS ligada e nenhuma policy, então
 * o cliente não lê nem escreve. Este módulo é a única porta.
 *
 * **O token não sai daqui.** `listStatus` devolve só o que a tela pode
 * mostrar. Não existe função que devolva a credencial para o navegador, e
 * não deve passar a existir: a emissão de cobrança, quando chegar, acontece
 * no servidor.
 */
export type GatewayStatus = {
  provider: ProviderId;
  environment: Environment;
  label: string | null;
  active: boolean;
  lastVerifiedAt: string | null;
};

export async function listStatus(
  workspaceId: string
): Promise<GatewayStatus[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("payment_gateway")
    .select("provider, environment, account_label, active, last_verified_at")
    .eq("workspace_id", workspaceId);

  return (data ?? []).map((linha) => ({
    provider: linha.provider as ProviderId,
    environment: linha.environment as Environment,
    label: linha.account_label,
    active: linha.active,
    lastVerifiedAt: linha.last_verified_at,
  }));
}

/**
 * Só dono e admin mexem em conta de recebimento.
 *
 * A checagem é explícita porque a chave secreta ignora RLS — aqui não há
 * policy para cair de volta. Membro comum que descobrir a rota recebe 403.
 */
export async function canManage(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const db = createAdminClient();
  const { data } = await db
    .from("workspace_member")
    .select("role, status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  return (
    !!data && data.status === "active" && ["owner", "admin"].includes(data.role)
  );
}

/**
 * Trilha de auditoria escrita pela rota, com o autor de verdade.
 *
 * `write_audit` não serve aqui: ela lê `auth.uid()`, que é nulo na conexão
 * da chave secreta (ver o comentário da 0067). Nunca leva token, nem parte
 * dele — §15.
 */
export async function auditGateway(
  workspaceId: string,
  actorId: string,
  action: "criou" | "alterou" | "excluiu",
  resumo: string
): Promise<void> {
  const db = createAdminClient();
  await db.rpc("write_audit_as", {
    ws: workspaceId,
    autor: actorId,
    acao: action,
    tipo: "payment_gateway",
    id_entidade: null,
    resumo,
  });
}
