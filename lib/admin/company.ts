// Detalhe de uma empresa (especificação 9.6). Só servidor.

import { createAdminClient } from "@/lib/supabase/admin";

import { statusDaEmpresa, type StatusEmpresa } from "./status";

export type MembroDaEmpresa = {
  userId: string;
  nome: string | null;
  email: string;
  papel: string;
  /** "active" ou "pending" — convite ainda não aceito. */
  situacao: string;
  ultimoAcesso: string | null;
  emailVerificado: boolean;
  autenticacao: string;
  /** Conta bloqueada no GoTrue (`banned_until` no futuro). */
  bloqueado: boolean;
};

export type CobrancaDaEmpresa = {
  id: string;
  planoNome: string;
  valorCents: number;
  pagoCents: number | null;
  periodoInicio: string;
  periodoFim: string;
  situacao: string;
  pagoEm: string | null;
  vencimento: string | null;
  provedor: string;
};

export type NotaInterna = {
  id: string;
  autor: string;
  corpo: string;
  quando: string;
};

export type EmpresaDetalhe = {
  id: string;
  nome: string;
  status: StatusEmpresa;
  /** Null enquanto a empresa não foi excluída logicamente. */
  excluidaEm: string | null;
  /**
   * Dias já cumpridos de quarentena. Calculado AQUI e não na página: o
   * React Compiler trata Date.now() no corpo de um componente como função
   * impura, e ele tem razão em princípio — o mesmo render devolveria valores
   * diferentes. O carregador é o lugar de ler o relógio.
   */
  diasExcluida: number;
  suspensa: boolean;
  emTeste: boolean;
  fimDoTeste: string | null;
  acessoAte: string | null;
  criadaEm: string;
  planoId: string | null;
  planoNome: string | null;
  planoPrecoCents: number | null;
  seatLimit: number;
  contatoEmail: string | null;
  contatoTelefone: string | null;
  origem: string | null;
  dono: { nome: string | null; email: string } | null;
  membros: MembroDaEmpresa[];
  assinatura: {
    status: string;
    diaDeCobranca: number;
    provedor: string;
  } | null;
  cobrancas: CobrancaDaEmpresa[];
  notas: NotaInterna[];
  /** Uso: quantas demandas, setores e projetos a empresa tem. */
  uso: { demandas: number; setores: number; projetos: number };
  ultimoAcesso: string | null;
  ultimaAtividade: string | null;
};

/**
 * Dias que uma empresa precisa ficar excluída antes de poder ser removida
 * de vez. É a política de retenção que a restrição 33 exige.
 */
export const DIAS_ATE_REMOCAO_FISICA = 30;

export async function getCompany(id: string): Promise<EmpresaDetalhe | null> {
  const db = createAdminClient();

  const { data: w } = await db
    .from("workspace")
    .select(
      "id, name, owner_user_id, plan_id, trial, trial_ends_at, seat_limit, access_expires_at, suspended, deleted_at, affiliate_id, contact_email, contact_phone, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!w) return null;

  const workspace = w as {
    id: string;
    name: string;
    owner_user_id: string | null;
    plan_id: string | null;
    trial: boolean;
    trial_ends_at: string | null;
    seat_limit: number;
    access_expires_at: string | null;
    suspended: boolean;
    deleted_at: string | null;
    affiliate_id: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    created_at: string;
  };

  const [
    membrosRes,
    assinaturaRes,
    cobrancasRes,
    notasRes,
    planoRes,
    afiliadoRes,
    demandasRes,
    setoresRes,
    projetosRes,
    atividadeRes,
  ] = await Promise.all([
    db
      .from("workspace_member")
      .select("user_id, role, status")
      .eq("workspace_id", id),
    db
      .from("subscription")
      .select("status, billing_day, provider")
      .eq("workspace_id", id)
      .maybeSingle(),
    db
      .from("subscription_charge")
      .select(
        "id, plan_name, amount_cents, paid_amount_cents, period_start, period_end, status, paid_at, expires_at, provider"
      )
      .eq("workspace_id", id)
      .order("period_start", { ascending: false })
      .limit(24),
    db
      .from("admin_note")
      .select("id, autor, corpo, created_at")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false }),
    workspace.plan_id
      ? db
          .from("billing_plan")
          .select("name, price_cents")
          .eq("id", workspace.plan_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    workspace.affiliate_id
      ? db
          .from("affiliate")
          .select("name")
          .eq("id", workspace.affiliate_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from("task")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", id),
    db
      .from("sector")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", id),
    db
      .from("project")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", id),
    db
      .from("task_activity")
      .select("created_at")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const membrosCru = (membrosRes.data ?? []) as {
    user_id: string;
    role: string;
    status: string;
  }[];

  // Perfis e dados de autenticação dos membros: duas chamadas, não uma por
  // pessoa.
  const ids = membrosCru.map((m) => m.user_id);
  const { data: perfis } = ids.length
    ? await db.from("app_user").select("id, email, display_name").in("id", ids)
    : { data: [] };

  const perfilPorId = new Map(
    (
      (perfis ?? []) as {
        id: string;
        email: string;
        display_name: string | null;
      }[]
    ).map((p) => [p.id, p])
  );

  // Uma chamada por membro, e aqui isso é o certo: são poucos por empresa, e
  // `getUserById` é exato. A varredura paginada de `listUsers` só compensa
  // quando se precisa da base inteira, como na listagem geral.
  const auth = new Map<
    string,
    {
      ultimo: string | null;
      verificado: boolean;
      provedores: string[];
      bloqueado: boolean;
    }
  >();
  for (const uid of ids) {
    const { data } = await db.auth.admin.getUserById(uid);
    if (!data?.user) continue;
    auth.set(uid, {
      ultimo: data.user.last_sign_in_at ?? null,
      verificado: !!data.user.email_confirmed_at,
      provedores: (data.user.identities ?? []).map((i) => i.provider),
      // O GoTrue guarda uma DATA, não um booleano: bloqueio tem prazo. Só
      // conta como bloqueado se a data ainda não passou.
      bloqueado:
        !!data.user.banned_until &&
        new Date(data.user.banned_until).getTime() > Date.now(),
    });
  }

  const membros: MembroDaEmpresa[] = membrosCru.map((m) => {
    const perfil = perfilPorId.get(m.user_id);
    const a = auth.get(m.user_id);
    const provedores = a?.provedores.length ? a.provedores : ["email"];
    return {
      userId: m.user_id,
      nome: perfil?.display_name ?? null,
      email: perfil?.email ?? "—",
      papel: m.role,
      situacao: m.status,
      ultimoAcesso: a?.ultimo ?? null,
      emailVerificado: a?.verificado ?? false,
      autenticacao: provedores
        .map((p) => (p === "google" ? "Google" : p === "email" ? "Senha" : p))
        .join(" + "),
      bloqueado: a?.bloqueado ?? false,
    };
  });

  const assinatura = assinaturaRes.data as {
    status: string;
    billing_day: number;
    provider: string;
  } | null;

  const plano = planoRes.data as {
    name: string;
    price_cents: number;
  } | null;

  const dono = workspace.owner_user_id
    ? perfilPorId.get(workspace.owner_user_id)
    : undefined;

  const ultimoAcesso = membros.reduce<string | null>((maior, m) => {
    if (!m.ultimoAcesso) return maior;
    return !maior || m.ultimoAcesso > maior ? m.ultimoAcesso : maior;
  }, null);

  return {
    id: workspace.id,
    nome: workspace.name,
    status: statusDaEmpresa(workspace, assinatura?.status),
    excluidaEm: workspace.deleted_at,
    diasExcluida: workspace.deleted_at
      ? Math.floor(
          (Date.now() - new Date(workspace.deleted_at).getTime()) / 86400000
        )
      : 0,
    suspensa: workspace.suspended,
    emTeste: workspace.trial,
    fimDoTeste: workspace.trial_ends_at,
    acessoAte: workspace.access_expires_at,
    criadaEm: workspace.created_at,
    planoId: workspace.plan_id,
    planoNome: plano?.name ?? null,
    planoPrecoCents: plano?.price_cents ?? null,
    seatLimit: workspace.seat_limit,
    contatoEmail: workspace.contact_email,
    contatoTelefone: workspace.contact_phone,
    origem: (afiliadoRes.data as { name: string } | null)?.name ?? null,
    dono: dono ? { nome: dono.display_name, email: dono.email } : null,
    membros,
    assinatura: assinatura
      ? {
          status: assinatura.status,
          diaDeCobranca: assinatura.billing_day,
          provedor: assinatura.provider,
        }
      : null,
    cobrancas: (
      (cobrancasRes.data ?? []) as {
        id: string;
        plan_name: string;
        amount_cents: number;
        paid_amount_cents: number | null;
        period_start: string;
        period_end: string;
        status: string;
        paid_at: string | null;
        expires_at: string | null;
        provider: string;
      }[]
    ).map((c) => ({
      id: c.id,
      planoNome: c.plan_name,
      valorCents: c.amount_cents,
      pagoCents: c.paid_amount_cents,
      periodoInicio: c.period_start,
      periodoFim: c.period_end,
      situacao: c.status,
      pagoEm: c.paid_at,
      vencimento: c.expires_at,
      provedor: c.provider,
    })),
    notas: (
      (notasRes.data ?? []) as {
        id: string;
        autor: string;
        corpo: string;
        created_at: string;
      }[]
    ).map((n) => ({
      id: n.id,
      autor: n.autor,
      corpo: n.corpo,
      quando: n.created_at,
    })),
    uso: {
      demandas: demandasRes.count ?? 0,
      setores: setoresRes.count ?? 0,
      projetos: projetosRes.count ?? 0,
    },
    ultimoAcesso,
    ultimaAtividade:
      ((atividadeRes.data ?? [])[0] as { created_at: string } | undefined)
        ?.created_at ?? null,
  };
}
