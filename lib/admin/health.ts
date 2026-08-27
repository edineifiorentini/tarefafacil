// Saúde da operação: o que exige ação hoje (especificação 8.6) e o rodapé
// discreto de estado do sistema (8.8). Só servidor.
//
// Cada alerta aponta para a listagem JÁ FILTRADA — alerta que não leva a
// lugar nenhum vira enfeite.
//
// O que NÃO está aqui, e por quê: "falhas de webhook" e "eventos suspeitos de
// segurança" foram pedidos na 8.6, mas `payment_event` só guarda o payload
// recebido, sem estado de erro, e não existe nenhuma tabela de eventos de
// segurança. Inventar os dois números seria simular implementação concluída
// (restrição 33). Ficam como pendência declarada.

import { createAdminClient } from "@/lib/supabase/admin";

export type TomDeAlerta = "neutro" | "atencao" | "critico";

export type Alerta = {
  id: string;
  label: string;
  quantidade: number;
  /** Listagem correspondente, já filtrada. */
  href: string;
  tom: TomDeAlerta;
};

/** Dias sem nenhuma alteração em demanda para a conta contar como parada. */
const DIAS_SEM_ATIVIDADE = 30;

/** Janela em que um teste conta como "vencendo". */
const DIAS_TESTE_VENCENDO = 7;

/** A partir de que fração dos assentos a conta entra no alerta de limite. */
const FRACAO_LIMITE = 0.8;

export async function operationalHealth(): Promise<Alerta[]> {
  const db = createAdminClient();
  const agora = Date.now();

  const [ws, assin, membros, convites, atividade] = await Promise.all([
    db
      .from("workspace")
      .select(
        "id, trial, trial_ends_at, seat_limit, suspended, access_expires_at"
      ),
    db.from("subscription").select("workspace_id, status"),
    db.from("workspace_member").select("workspace_id").eq("status", "active"),
    db
      .from("workspace_invite")
      .select("id, expires_at")
      .eq("status", "pending"),
    db
      .from("task_activity")
      .select("workspace_id, created_at")
      .gte(
        "created_at",
        new Date(agora - DIAS_SEM_ATIVIDADE * 86_400_000).toISOString()
      ),
  ]);

  type W = {
    id: string;
    trial: boolean;
    trial_ends_at: string | null;
    seat_limit: number;
    suspended: boolean;
    access_expires_at: string | null;
  };
  const workspaces = (ws.data ?? []) as W[];

  // Testes vencendo: ainda em teste e com fim dentro da janela.
  const limiteTeste = agora + DIAS_TESTE_VENCENDO * 86_400_000;
  const testesVencendo = workspaces.filter((w) => {
    if (!w.trial || !w.trial_ends_at) return false;
    const t = new Date(w.trial_ends_at).getTime();
    return t >= agora && t <= limiteTeste;
  }).length;

  // Pagamentos pendentes: assinatura em estado que trava a cobrança.
  const assinaturas = (assin.data ?? []) as {
    workspace_id: string;
    status: string;
  }[];
  const pagamentosPendentes = assinaturas.filter(
    (a) => a.status === "pendente" || a.status === "vencida"
  ).length;

  // Contas sem atividade: nenhuma alteração de demanda na janela. Empresa
  // suspensa fica de fora — ela já está em outro alerta e não "parou".
  const comAtividade = new Set(
    ((atividade.data ?? []) as { workspace_id: string }[]).map(
      (a) => a.workspace_id
    )
  );
  const semAtividade = workspaces.filter(
    (w) => !w.suspended && !comAtividade.has(w.id)
  ).length;

  // Limite de assentos: contagem de membros ativos contra o limite do plano.
  const porWorkspace = new Map<string, number>();
  for (const m of (membros.data ?? []) as { workspace_id: string }[]) {
    porWorkspace.set(
      m.workspace_id,
      (porWorkspace.get(m.workspace_id) ?? 0) + 1
    );
  }
  const noLimite = workspaces.filter((w) => {
    const usados = porWorkspace.get(w.id) ?? 0;
    return w.seat_limit > 0 && usados >= w.seat_limit * FRACAO_LIMITE;
  }).length;

  // Convites expirados: pendentes cuja validade já passou.
  const convitesExpirados = (
    (convites.data ?? []) as { expires_at: string }[]
  ).filter((c) => new Date(c.expires_at).getTime() < agora).length;

  // Empresas suspensas ou com acesso vencido: exigem decisão.
  const bloqueadas = workspaces.filter(
    (w) =>
      w.suspended ||
      (w.access_expires_at && new Date(w.access_expires_at).getTime() < agora)
  ).length;

  const lista: Alerta[] = [
    {
      id: "testes",
      label: "Testes vencendo",
      quantidade: testesVencendo,
      href: "/admin/empresas?status=teste&vencendo=1",
      tom: "atencao",
    },
    {
      id: "pagamentos",
      label: "Pagamentos pendentes",
      quantidade: pagamentosPendentes,
      href: "/admin/empresas?status=pendente",
      tom: "critico",
    },
    {
      id: "paradas",
      label: "Contas sem atividade",
      quantidade: semAtividade,
      href: "/admin/empresas?atividade=parada",
      tom: "neutro",
    },
    {
      id: "assentos",
      label: "Limite de assentos",
      quantidade: noLimite,
      href: "/admin/empresas?assentos=limite",
      tom: "atencao",
    },
    {
      id: "convites",
      label: "Convites expirados",
      quantidade: convitesExpirados,
      href: "/admin/empresas?convites=expirados",
      tom: "neutro",
    },
    {
      id: "bloqueadas",
      label: "Contas bloqueadas",
      quantidade: bloqueadas,
      href: "/admin/empresas?status=suspensa",
      tom: "critico",
    },
  ];

  // Alerta com zero não é notícia: some da lista em vez de gastar uma linha
  // dizendo que está tudo bem. Se tudo zerar, a tela mostra o estado vazio.
  return lista.filter((a) => a.quantidade > 0);
}

export type RodapeOperacional = {
  /** ISO do cadastro mais recente, ou null se ainda não houve nenhum. */
  ultimoCadastro: string | null;
  /** ISO da última cobrança efetivamente paga. */
  ultimaCobranca: string | null;
  /** Quantos provedores de pagamento estão configurados. */
  gateways: number;
  /** Se os cadastros estão abertos ao público. */
  cadastrosAbertos: boolean;
};

export async function operationalFooter(): Promise<RodapeOperacional> {
  const db = createAdminClient();

  const [ws, cobranca, gateways, config] = await Promise.all([
    db
      .from("workspace")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1),
    db
      .from("subscription_charge")
      .select("paid_at")
      .eq("status", "paga")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(1),
    db.from("payment_gateway").select("workspace_id"),
    db.from("platform_setting").select("signups_enabled").maybeSingle(),
  ]);

  return {
    ultimoCadastro:
      ((ws.data ?? [])[0] as { created_at: string } | undefined)?.created_at ??
      null,
    ultimaCobranca:
      ((cobranca.data ?? [])[0] as { paid_at: string } | undefined)?.paid_at ??
      null,
    gateways: (gateways.data ?? []).length,
    cadastrosAbertos:
      (config.data as { signups_enabled: boolean } | null)?.signups_enabled ??
      true,
  };
}
