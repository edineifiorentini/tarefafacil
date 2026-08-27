// Trilha administrativa (especificação 15). Só servidor.
//
// A tabela é a mesma `audit_log` que as empresas já usam; o que separa os
// dois mundos é `workspace_id`: null significa "evento de plataforma"
// (migration 0072). Ler os dois pela mesma consulta é de propósito — filtro
// escrito uma vez só.

import type { AuditAction, Json } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

export type EscopoAuditoria = "tudo" | "plataforma" | "empresas";

export type EventoAuditoria = {
  id: string;
  quando: string;
  /** Nome da empresa, ou null quando o evento é de plataforma. */
  empresa: string | null;
  /** Quem agiu. Sai de `app_user` ou do campo `ator` em `details`. */
  autor: string;
  acao: AuditAction;
  entidade: string;
  entidadeId: string | null;
  resumo: string;
  detalhes: Json | null;
};

export type FiltrosAuditoria = {
  escopo?: EscopoAuditoria;
  /** Busca no resumo. */
  q?: string;
  acao?: AuditAction;
  /** Quantos eventos trazer. A tela pagina; o banco não devolve tudo. */
  limite?: number;
  /** Deslocamento para a próxima página. */
  offset?: number;
};

export const AUDITORIA_POR_PAGINA = 50;

export async function listAudit(
  filtros: FiltrosAuditoria = {}
): Promise<{ eventos: EventoAuditoria[]; temMais: boolean }> {
  const db = createAdminClient();
  const limite = filtros.limite ?? AUDITORIA_POR_PAGINA;
  const offset = filtros.offset ?? 0;

  let consulta = db
    .from("audit_log")
    .select(
      "id, workspace_id, actor_id, action, entity_type, entity_id, summary, details, created_at"
    )
    .order("created_at", { ascending: false })
    // Uma linha a mais do que cabe na página: é assim que se sabe que existe
    // próxima sem pagar um `count` na tabela inteira.
    .range(offset, offset + limite);

  if (filtros.escopo === "plataforma")
    consulta = consulta.is("workspace_id", null);
  if (filtros.escopo === "empresas")
    consulta = consulta.not("workspace_id", "is", null);
  if (filtros.acao) consulta = consulta.eq("action", filtros.acao);
  if (filtros.q?.trim())
    consulta = consulta.ilike("summary", `%${filtros.q.trim()}%`);

  const { data } = await consulta;

  type Linha = {
    id: string;
    workspace_id: string | null;
    actor_id: string | null;
    action: AuditAction;
    entity_type: string;
    entity_id: string | null;
    summary: string;
    details: Json | null;
    created_at: string;
  };
  const linhas = (data ?? []) as Linha[];
  const temMais = linhas.length > limite;
  const pagina = temMais ? linhas.slice(0, limite) : linhas;

  // Nomes de empresa e de autor: duas consultas para a página inteira, não
  // uma por linha.
  const idsEmpresa = [
    ...new Set(
      pagina.map((l) => l.workspace_id).filter((v): v is string => !!v)
    ),
  ];
  const idsAutor = [
    ...new Set(pagina.map((l) => l.actor_id).filter((v): v is string => !!v)),
  ];

  const [empresas, autores] = await Promise.all([
    idsEmpresa.length
      ? db.from("workspace").select("id, name").in("id", idsEmpresa)
      : Promise.resolve({ data: [] }),
    idsAutor.length
      ? db.from("app_user").select("id, display_name, email").in("id", idsAutor)
      : Promise.resolve({ data: [] }),
  ]);

  const nomeEmpresa = new Map(
    ((empresas.data ?? []) as { id: string; name: string }[]).map((w) => [
      w.id,
      w.name,
    ])
  );
  const nomeAutor = new Map(
    (
      (autores.data ?? []) as {
        id: string;
        display_name: string | null;
        email: string;
      }[]
    ).map((u) => [u.id, u.display_name ?? u.email])
  );

  const eventos = pagina.map((l) => {
    const detalhes = l.details as { ator?: string } | null;
    return {
      id: l.id,
      quando: l.created_at,
      empresa: l.workspace_id
        ? (nomeEmpresa.get(l.workspace_id) ?? null)
        : null,
      autor:
        (l.actor_id ? nomeAutor.get(l.actor_id) : undefined) ??
        detalhes?.ator ??
        "Sistema",
      acao: l.action,
      entidade: l.entity_type,
      entidadeId: l.entity_id,
      resumo: l.summary,
      detalhes: l.details,
    };
  });

  return { eventos, temMais };
}

/**
 * Registra uma ação da plataforma.
 *
 * Chamar SEMPRE depois de a ação ter dado certo — auditoria não é intenção,
 * é registro do que aconteceu. Se a gravação do evento falhar, a ação em si
 * não é desfeita: perder a linha do log é ruim, desfazer uma suspensão já
 * aplicada por causa do log é pior.
 */
export async function registrarEventoDePlataforma(params: {
  autor: string;
  acao: AuditAction;
  entidade: string;
  entidadeId?: string | null;
  resumo: string;
  detalhes?: Json | null;
}): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.rpc("write_platform_audit", {
    autor: params.autor,
    acao: params.acao,
    tipo: params.entidade,
    id_entidade: params.entidadeId ?? null,
    resumo: params.resumo,
    detalhes: params.detalhes ?? null,
  });
  if (error) {
    console.error("[admin] falha ao registrar auditoria de plataforma", error);
  }
}
