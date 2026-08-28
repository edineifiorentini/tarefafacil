// Inscrições de webhook: cadastro, rotação de segredo e histórico de
// entregas. Só servidor.

import { randomBytes } from "node:crypto";

import { encryptSecret, secretBoxConfigured } from "@/lib/crypto/secretBox";
import { createAdminClient } from "@/lib/supabase/admin";

import { ehEvento, type Evento } from "./events";
import { verificarDestino } from "./ssrf";

/**
 * Prefixo do segredo de assinatura.
 *
 * Marcado para quem vir a string num arquivo de configuração saber o que é —
 * e para varredor de segredo em repositório poder aprender o padrão.
 */
const PREFIXO_SEGREDO = "whsec_";

/** Teto de inscrições ativas por empresa. */
export const MAXIMO_DE_INSCRICOES = 5;

export type InscricaoResumo = {
  id: string;
  url: string;
  eventos: Evento[];
  ativo: boolean;
  apiKeyId: string | null;
  falhasSeguidas: number;
  desativadoEm: string | null;
  criadaEm: string;
};

export type EntregaResumo = {
  id: string;
  evento: string;
  status: string;
  tentativas: number;
  ultimoStatusHttp: number | null;
  ultimoErro: string | null;
  proximaTentativa: string;
  entregueEm: string | null;
  criadaEm: string;
};

function gerarSegredo(): string {
  return PREFIXO_SEGREDO + randomBytes(32).toString("base64url");
}

/**
 * Quem gerencia: **só o dono**, a mesma regra da chave de API.
 *
 * Cadastrar um destino é decidir para onde vai o que acontece dentro da
 * empresa. Não é configuração de aparência.
 */
export async function podeGerenciar(
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

  return !!data && data.status === "active" && data.role === "owner";
}

export async function listarInscricoes(
  workspaceId: string
): Promise<InscricaoResumo[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("webhook_endpoint")
    .select(
      "id, url, eventos, ativo, api_key_id, falhas_seguidas, desativado_em, created_at"
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  return (
    (data ?? []) as {
      id: string;
      url: string;
      eventos: string[];
      ativo: boolean;
      api_key_id: string | null;
      falhas_seguidas: number;
      desativado_em: string | null;
      created_at: string;
    }[]
  ).map((e) => ({
    id: e.id,
    url: e.url,
    eventos: e.eventos.filter(ehEvento),
    ativo: e.ativo,
    apiKeyId: e.api_key_id,
    falhasSeguidas: e.falhas_seguidas,
    desativadoEm: e.desativado_em,
    criadaEm: e.created_at,
  }));
}

export type Resultado<T> =
  ({ ok: true } & T) | { ok: false; erro: string; mensagem: string };

/**
 * Cria uma inscrição e devolve o segredo UMA vez.
 *
 * A URL passa pela verificação de SSRF AQUI, no servidor, e não só na tela:
 * a tela é sugestão, o servidor é a regra. Cadastrar um endereço interno é
 * exatamente o ataque de que `ssrf.ts` trata.
 */
export async function criarInscricao(params: {
  workspaceId: string;
  url: string;
  eventos: string[];
  apiKeyId: string | null;
  criadoPor: string;
}): Promise<Resultado<{ id: string; segredo: string }>> {
  if (!secretBoxConfigured()) {
    // Recusa em vez de guardar em claro. Mesma postura do gateway (0067).
    return {
      ok: false,
      erro: "sem_cifra",
      mensagem:
        "Este ambiente ainda não guarda segredos com segurança. Falta a chave de cifra no servidor.",
    };
  }

  const destino = await verificarDestino(params.url.trim());
  if (!destino.ok) {
    return { ok: false, erro: "url", mensagem: destino.motivo };
  }

  const eventos = params.eventos.filter(ehEvento);
  if (eventos.length === 0) {
    return {
      ok: false,
      erro: "eventos",
      mensagem: "Escolha pelo menos um evento",
    };
  }

  const db = createAdminClient();

  const { count } = await db
    .from("webhook_endpoint")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", params.workspaceId);

  if ((count ?? 0) >= MAXIMO_DE_INSCRICOES) {
    return {
      ok: false,
      erro: "limite",
      mensagem: `Máximo de ${MAXIMO_DE_INSCRICOES} destinos. Remova um antes.`,
    };
  }

  const segredo = gerarSegredo();
  const { data, error } = await db
    .from("webhook_endpoint")
    .insert({
      workspace_id: params.workspaceId,
      url: destino.url.toString(),
      segredo_cifrado: encryptSecret(segredo),
      eventos,
      api_key_id: params.apiKeyId,
      criado_por: params.criadoPor,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, erro: "falhou", mensagem: "Não foi possível criar" };
  }

  await auditar(
    params.workspaceId,
    params.criadoPor,
    "criou",
    `Cadastrou o destino de webhook ${destino.url.host}`
  );

  return { ok: true, id: data.id, segredo };
}

/**
 * Gera um segredo novo e devolve UMA vez.
 *
 * O antigo para de valer no mesmo instante: rotação que aceita os dois por um
 * tempo é conveniente e transforma "troquei a chave" em "a chave velha ainda
 * abre a porta". Quem rotaciona precisa atualizar o destino.
 */
export async function rotacionarSegredo(
  workspaceId: string,
  id: string,
  autorId: string
): Promise<Resultado<{ segredo: string }>> {
  if (!secretBoxConfigured()) {
    return {
      ok: false,
      erro: "sem_cifra",
      mensagem: "Falta a chave de cifra no servidor.",
    };
  }

  const db = createAdminClient();
  const segredo = gerarSegredo();

  const { data, error } = await db
    .from("webhook_endpoint")
    .update({ segredo_cifrado: encryptSecret(segredo) })
    .eq("id", id)
    // Empresa no WHERE, não só na permissão: sem isto o dono de uma empresa
    // rotacionaria o segredo de outra mandando o id dela.
    .eq("workspace_id", workspaceId)
    .select("id, url");

  const linha = (data ?? [])[0] as { url: string } | undefined;
  if (error || !linha) {
    return { ok: false, erro: "not_found", mensagem: "Destino não encontrado" };
  }

  await auditar(
    workspaceId,
    autorId,
    "alterou",
    `Trocou o segredo do destino de webhook ${new URL(linha.url).host}`
  );

  return { ok: true, segredo };
}

export async function alternarAtivo(
  workspaceId: string,
  id: string,
  ativo: boolean,
  autorId: string
): Promise<boolean> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("webhook_endpoint")
    .update({
      ativo,
      // Reativar zera a contagem: o dono está dizendo que consertou o
      // destino, e manter as falhas antigas o desligaria de novo na primeira.
      ...(ativo ? { falhas_seguidas: 0, desativado_em: null } : {}),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id, url");

  const linha = (data ?? [])[0] as { url: string } | undefined;
  if (error || !linha) return false;

  await auditar(
    workspaceId,
    autorId,
    "alterou",
    `${ativo ? "Reativou" : "Pausou"} o destino de webhook ${new URL(linha.url).host}`
  );
  return true;
}

export async function removerInscricao(
  workspaceId: string,
  id: string,
  autorId: string
): Promise<boolean> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("webhook_endpoint")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id, url");

  const linha = (data ?? [])[0] as { url: string } | undefined;
  if (error || !linha) return false;

  await auditar(
    workspaceId,
    autorId,
    "excluiu",
    `Removeu o destino de webhook ${new URL(linha.url).host}`
  );
  return true;
}

/** Últimas entregas, para o dono responder "por que não chegou?". */
export async function listarEntregas(
  workspaceId: string,
  limite = 20
): Promise<EntregaResumo[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("webhook_delivery")
    .select(
      "id, evento, status, tentativas, ultimo_status_http, ultimo_erro, proxima_tentativa, entregue_em, created_at"
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limite);

  return (
    (data ?? []) as {
      id: string;
      evento: string;
      status: string;
      tentativas: number;
      ultimo_status_http: number | null;
      ultimo_erro: string | null;
      proxima_tentativa: string;
      entregue_em: string | null;
      created_at: string;
    }[]
  ).map((d) => ({
    id: d.id,
    evento: d.evento,
    status: d.status,
    tentativas: d.tentativas,
    ultimoStatusHttp: d.ultimo_status_http,
    ultimoErro: d.ultimo_erro,
    proximaTentativa: d.proxima_tentativa,
    entregueEm: d.entregue_em,
    criadaEm: d.created_at,
  }));
}

/**
 * Auditoria da empresa. O segredo NUNCA entra no resumo — só o host do
 * destino, que é o que identifica a inscrição para quem lê depois.
 */
async function auditar(
  workspaceId: string,
  autorId: string,
  acao: "criou" | "alterou" | "excluiu",
  resumo: string
): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.rpc("write_audit_as", {
    ws: workspaceId,
    autor: autorId,
    acao,
    tipo: "webhook_endpoint",
    id_entidade: null,
    resumo,
  });
  if (error) {
    console.error("[webhook] falha ao registrar auditoria", error);
  }
}
