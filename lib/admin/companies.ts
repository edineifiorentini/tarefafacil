// Leitura consolidada de empresas para o painel. Só servidor.
//
// Uma consulta por entidade e a junção acontece aqui — nunca uma consulta por
// linha (especificação 29). O custo é O(1) em número de chamadas, não O(n) em
// número de empresas.

import { createAdminClient } from "@/lib/supabase/admin";

import { contaNoMrr } from "./metrics";
import { statusDaEmpresa, type StatusEmpresa } from "./status";

export type EmpresaResumo = {
  id: string;
  nome: string;
  /** E-mail do dono. Null quando o workspace ficou sem dono atribuído. */
  responsavel: string | null;
  status: StatusEmpresa;
  planoNome: string | null;
  membros: number;
  seatLimit: number;
  /** ISO do último login de qualquer membro, ou null se ninguém entrou. */
  ultimoAcesso: string | null;
  /** Receita recorrente atribuída a esta empresa, em centavos. */
  mrrCents: number;
  /** Nome do afiliado que trouxe a empresa, ou null. */
  origem: string | null;
  criadaEm: string;
  /**
   * Última alteração de demanda. Alimenta o filtro "conta parada" — sem ela,
   * o alerta da visão geral linkava para uma lista que não sabia filtrar.
   */
  ultimaAtividade: string | null;
  /** Convites pendentes cuja validade já passou. */
  convitesExpirados: number;
  /** A empresa está em teste? Copiado para o filtro não reabrir a consulta. */
  emTeste: boolean;
  /** Fim do teste, para o filtro "vencendo". */
  fimDoTeste: string | null;
};

/**
 * Teto de usuários lidos da API de autenticação.
 *
 * `listUsers` é paginada em 50. Para "último acesso" seria preciso varrer
 * todos os usuários; com este teto são no máximo 20 chamadas. Passando disso,
 * o caminho certo é uma coluna `last_seen_at` em `app_user` atualizada no
 * login — anotado como pendência em vez de varrer a base inteira a cada
 * abertura do painel.
 */
const TETO_USUARIOS = 1000;
const POR_PAGINA = 50;

async function ultimoLoginPorUsuario(): Promise<Map<string, string>> {
  const db = createAdminClient();
  const mapa = new Map<string, string>();

  for (let pagina = 1; pagina <= TETO_USUARIOS / POR_PAGINA; pagina++) {
    const { data, error } = await db.auth.admin.listUsers({
      page: pagina,
      perPage: POR_PAGINA,
    });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      if (u.last_sign_in_at) mapa.set(u.id, u.last_sign_in_at);
    }
    if (data.users.length < POR_PAGINA) break;
  }

  return mapa;
}

export async function listCompanies(): Promise<EmpresaResumo[]> {
  const db = createAdminClient();

  const [ws, assin, planos, membros, afiliados, logins, atividade, convites] =
    await Promise.all([
      db
        .from("workspace")
        .select(
          "id, name, owner_user_id, plan_id, trial, trial_ends_at, seat_limit, access_expires_at, suspended, affiliate_id, created_at"
        )
        .order("created_at", { ascending: false }),
      db.from("subscription").select("workspace_id, plan_id, status"),
      db.from("billing_plan").select("id, name, price_cents"),
      db
        .from("workspace_member")
        .select("workspace_id, user_id, role")
        .eq("status", "active"),
      db.from("affiliate").select("id, name"),
      ultimoLoginPorUsuario(),
      // Atividade e convites: duas leituras a mais para a lista poder responder
      // aos alertas da visão geral, em vez de ignorá-los.
      db.from("task_activity").select("workspace_id, created_at"),
      db
        .from("workspace_invite")
        .select("workspace_id, expires_at")
        .eq("status", "pending"),
    ]);

  type W = {
    id: string;
    name: string;
    owner_user_id: string | null;
    plan_id: string | null;
    trial: boolean;
    trial_ends_at: string | null;
    seat_limit: number;
    access_expires_at: string | null;
    suspended: boolean;
    affiliate_id: string | null;
    created_at: string;
  };

  const assinaturas = new Map(
    (
      (assin.data ?? []) as {
        workspace_id: string;
        plan_id: string | null;
        status: string;
      }[]
    ).map((a) => [a.workspace_id, a])
  );
  const planosPorId = new Map(
    (
      (planos.data ?? []) as { id: string; name: string; price_cents: number }[]
    ).map((p) => [p.id, p])
  );
  const afiliadosPorId = new Map(
    ((afiliados.data ?? []) as { id: string; name: string }[]).map((a) => [
      a.id,
      a.name,
    ])
  );

  // Membros e último acesso, agrupados por empresa numa passada só.
  const contagem = new Map<string, number>();
  const acessoPorWorkspace = new Map<string, string>();
  const donoPorWorkspace = new Map<string, string>();
  for (const m of (membros.data ?? []) as {
    workspace_id: string;
    user_id: string;
    role: string;
  }[]) {
    contagem.set(m.workspace_id, (contagem.get(m.workspace_id) ?? 0) + 1);
    if (m.role === "owner") donoPorWorkspace.set(m.workspace_id, m.user_id);

    const login = logins.get(m.user_id);
    if (!login) continue;
    const atual = acessoPorWorkspace.get(m.workspace_id);
    if (!atual || login > atual) acessoPorWorkspace.set(m.workspace_id, login);
  }

  // E-mail do dono: uma consulta para todos, não uma por empresa.
  const workspaces = (ws.data ?? []) as W[];
  const idsDeDono = [
    ...new Set(
      workspaces
        .map((w) => w.owner_user_id ?? donoPorWorkspace.get(w.id) ?? null)
        .filter((v): v is string => !!v)
    ),
  ];
  const { data: donos } = idsDeDono.length
    ? await db.from("app_user").select("id, email").in("id", idsDeDono)
    : { data: [] };
  const emailPorId = new Map(
    ((donos ?? []) as { id: string; email: string }[]).map((u) => [
      u.id,
      u.email,
    ])
  );

  const agora = Date.now();

  // Última atividade por empresa, numa passada só.
  const atividadePorWorkspace = new Map<string, string>();
  for (const a of (atividade.data ?? []) as {
    workspace_id: string;
    created_at: string;
  }[]) {
    const atual = atividadePorWorkspace.get(a.workspace_id);
    if (!atual || a.created_at > atual) {
      atividadePorWorkspace.set(a.workspace_id, a.created_at);
    }
  }

  const convitesVencidos = new Map<string, number>();
  for (const c of (convites.data ?? []) as {
    workspace_id: string;
    expires_at: string;
  }[]) {
    if (new Date(c.expires_at).getTime() >= agora) continue;
    convitesVencidos.set(
      c.workspace_id,
      (convitesVencidos.get(c.workspace_id) ?? 0) + 1
    );
  }

  return workspaces.map((w) => {
    const assinatura = assinaturas.get(w.id);
    const status = statusDaEmpresa(w, assinatura?.status, agora);
    const planId = assinatura?.plan_id ?? w.plan_id;
    const plano = planId ? planosPorId.get(planId) : undefined;
    const donoId = w.owner_user_id ?? donoPorWorkspace.get(w.id) ?? null;

    return {
      id: w.id,
      nome: w.name,
      responsavel: donoId ? (emailPorId.get(donoId) ?? null) : null,
      status,
      planoNome: plano?.name ?? null,
      membros: contagem.get(w.id) ?? 0,
      seatLimit: w.seat_limit,
      ultimoAcesso: acessoPorWorkspace.get(w.id) ?? null,
      // A MESMA regra do cartão de MRR da visão geral, não uma parecida.
      mrrCents:
        plano && contaNoMrr(w, assinatura?.status) ? plano.price_cents : 0,
      origem: w.affiliate_id
        ? (afiliadosPorId.get(w.affiliate_id) ?? null)
        : null,
      criadaEm: w.created_at,
      ultimaAtividade: atividadePorWorkspace.get(w.id) ?? null,
      convitesExpirados: convitesVencidos.get(w.id) ?? 0,
      emTeste: w.trial,
      fimDoTeste: w.trial_ends_at,
    };
  });
}

export async function recentCompanies(limite = 6): Promise<EmpresaResumo[]> {
  const todas = await listCompanies();
  return todas.slice(0, limite);
}
