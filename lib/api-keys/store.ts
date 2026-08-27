// Armazenamento e autenticação de chave de API. Só servidor.

import { createAdminClient } from "@/lib/supabase/admin";

import { chaveDoCabecalho, gerarChave, hashDeChave } from "./key";

export type ChaveResumo = {
  id: string;
  nome: string;
  /** Começo da chave. O resto não existe em lugar nenhum. */
  prefixo: string;
  criadaEm: string;
  ultimoUso: string | null;
  revogadaEm: string | null;
};

/** Teto de chaves ativas por empresa. */
export const MAXIMO_POR_EMPRESA = 10;

/**
 * Quem pode criar e revogar chave: **só o dono**.
 *
 * Mais restrito que o resto das integrações, onde `admin` também gerencia
 * (ver `lib/payments/store.ts`). Não é descuido: uma chave de API age em
 * nome da empresa inteira e não expira sozinha, enquanto uma credencial de
 * gateway serve a um provedor só. Foi o que o dono pediu — "solicitada pelo
 * usuário (dono) de cada conta" — e é a escolha conservadora para a
 * credencial mais poderosa do sistema.
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

export async function listarChaves(
  workspaceId: string
): Promise<ChaveResumo[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("api_key")
    .select("id, nome, prefixo, created_at, ultimo_uso, revogada_em")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  return (
    (data ?? []) as {
      id: string;
      nome: string;
      prefixo: string;
      created_at: string;
      ultimo_uso: string | null;
      revogada_em: string | null;
    }[]
  ).map((k) => ({
    id: k.id,
    nome: k.nome,
    prefixo: k.prefixo,
    criadaEm: k.created_at,
    ultimoUso: k.ultimo_uso,
    revogadaEm: k.revogada_em,
  }));
}

export type ResultadoDaCriacao =
  | { ok: true; id: string; valor: string; prefixo: string }
  | { ok: false; erro: string; mensagem: string };

/**
 * Cria uma chave e devolve o valor UMA vez.
 *
 * Quem chama precisa entregá-lo na resposta e esquecê-lo. Não há como
 * recuperar depois — é o ponto de guardar só o hash.
 */
export async function criarChave(params: {
  workspaceId: string;
  nome: string;
  criadaPor: string;
}): Promise<ResultadoDaCriacao> {
  const db = createAdminClient();

  const nome = params.nome.trim();
  if (nome.length === 0) {
    return { ok: false, erro: "nome", mensagem: "Dê um nome à chave" };
  }
  if (nome.length > 60) {
    return { ok: false, erro: "nome", mensagem: "Nome muito longo" };
  }

  // O teto conta só as ativas: chave revogada continua na tabela para o
  // histórico e não deve ocupar vaga.
  const { count } = await db
    .from("api_key")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", params.workspaceId)
    .is("revogada_em", null);

  if ((count ?? 0) >= MAXIMO_POR_EMPRESA) {
    return {
      ok: false,
      erro: "limite",
      mensagem: `Máximo de ${MAXIMO_POR_EMPRESA} chaves ativas. Revogue uma antes.`,
    };
  }

  const chave = gerarChave();
  const { data, error } = await db
    .from("api_key")
    .insert({
      workspace_id: params.workspaceId,
      nome,
      key_hash: chave.hash,
      prefixo: chave.prefixo,
      criada_por: params.criadaPor,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, erro: "falhou", mensagem: "Não foi possível criar" };
  }

  await auditar(
    params.workspaceId,
    params.criadaPor,
    "criou",
    `Gerou a chave de API "${nome}"`
  );

  return { ok: true, id: data.id, valor: chave.valor, prefixo: chave.prefixo };
}

export async function revogarChave(
  workspaceId: string,
  id: string,
  autorId: string
): Promise<boolean> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("api_key")
    .update({ revogada_em: new Date().toISOString() })
    .eq("id", id)
    // O workspace entra no WHERE, não só na checagem de permissão: sem isto,
    // o dono de uma empresa revogaria a chave de outra mandando o id dela.
    .eq("workspace_id", workspaceId)
    .is("revogada_em", null)
    .select("id");

  const revogou = !error && (data ?? []).length > 0;
  if (revogou) {
    await auditar(workspaceId, autorId, "excluiu", "Revogou uma chave de API");
  }
  return revogou;
}

/**
 * Registra na auditoria DA EMPRESA (não na da plataforma).
 *
 * Criar uma chave é a ação mais poderosa que um dono faz na própria conta:
 * quem a tem age em nome da empresa e ela não expira sozinha. Sem esta
 * linha, um sócio gera uma chave, algo vaza meses depois, e não há como
 * saber quem gerou nem quando.
 *
 * `write_audit_as` e não `write_audit`: a rota roda com a chave secreta, onde
 * `auth.uid()` é nulo, então o autor entra por parâmetro. Mesmo caminho do
 * gateway de pagamento (0067).
 *
 * O resumo NUNCA leva a chave nem o prefixo dela — auditoria é lida por mais
 * gente e guardada por mais tempo do que a credencial dura.
 */
async function auditar(
  workspaceId: string,
  autorId: string,
  acao: "criou" | "excluiu",
  resumo: string
): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.rpc("write_audit_as", {
    ws: workspaceId,
    autor: autorId,
    acao,
    tipo: "api_key",
    id_entidade: null,
    resumo,
  });
  if (error) {
    console.error("[api-key] falha ao registrar auditoria", error);
  }
}

export type ChaveAutenticada = {
  keyId: string;
  workspaceId: string;
};

/**
 * Autentica uma requisição pelo cabeçalho `Authorization`.
 *
 * Ainda não há rota de API pública que a use — ela nasce junto com a
 * primeira. Está aqui porque é o par de `criarChave`: escrever as duas
 * juntas é o que garante que o formato gerado é o formato aceito.
 *
 * O `ultimo_uso` é gravado sem esperar: quem chama não deve ficar mais lento
 * por causa de um carimbo de estatística, e perder um deles numa falha de
 * rede não muda nada.
 */
export async function autenticarChave(
  cabecalho: string | null | undefined
): Promise<ChaveAutenticada | null> {
  const valor = chaveDoCabecalho(cabecalho);
  if (!valor) return null;

  const db = createAdminClient();
  const { data } = await db
    .from("api_key")
    .select("id, workspace_id, revogada_em")
    .eq("key_hash", hashDeChave(valor))
    .maybeSingle();

  if (!data || data.revogada_em) return null;

  void db
    .from("api_key")
    .update({ ultimo_uso: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => undefined);

  return { keyId: data.id, workspaceId: data.workspace_id };
}
