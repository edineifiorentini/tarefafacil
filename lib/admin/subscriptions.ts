// Módulo Assinaturas (especificação 11). Só servidor.
//
// O QUE ESTE ARQUIVO NÃO FAZ, e é a informação mais importante sobre ele:
//
// **Nada neste projeto cria cobrança.** `lib/billing/cycle.ts` tem o motor
// completo — ciclo, carência, decisão de cobrar, situação derivada — com
// testes, e NENHUM chamador. `subscription_charge` está vazia, assim como
// `payment_event`. Por isso não existem aqui "tentar nova cobrança",
// "reenviar link de pagamento" nem "reembolsar": elas dependem de um fluxo
// de cobrança que ainda não roda.
//
// A consequência boa: nenhuma ação desta rodada move dinheiro, então nenhuma
// delas pode cobrar duas vezes. As três que existem — cancelar, agendar
// cancelamento e reativar — são idempotentes por natureza: escrevem um
// estado, não somam um evento. Repetir o clique dá o mesmo resultado.

import { cycleFor, type Cycle } from "@/lib/billing/cycle";
import { createAdminClient } from "@/lib/supabase/admin";

export type EstadoDaAssinatura =
  | "ativa"
  | "pendente"
  | "inadimplente"
  | "cancelamento_agendado"
  | "cancelada"
  | "teste"
  | "sem_assinatura";

export const ESTADO_META: Record<
  EstadoDaAssinatura,
  { label: string; tone: string }
> = {
  ativa: { label: "Ativa", tone: "var(--positive)" },
  pendente: { label: "Pagamento pendente", tone: "var(--status-due-soon-fg)" },
  inadimplente: { label: "Inadimplente", tone: "var(--negative)" },
  cancelamento_agendado: {
    label: "Cancelamento agendado",
    tone: "var(--status-due-soon-fg)",
  },
  cancelada: { label: "Cancelada", tone: "var(--text-muted)" },
  teste: { label: "Em teste", tone: "var(--chart-2)" },
  sem_assinatura: { label: "Sem assinatura", tone: "var(--text-muted)" },
};

export type AssinaturaResumo = {
  workspaceId: string;
  empresa: string;
  estado: EstadoDaAssinatura;
  planoNome: string | null;
  valorCents: number;
  /** Dia do mês em que a cobrança cai. */
  diaDeCobranca: number;
  /** Ciclo corrente calculado a partir do dia de cobrança. */
  cicloAtual: Cycle | null;
  /** Início do próximo período — a data da próxima cobrança. */
  proximaCobranca: string | null;
  /** Cancelamento agendado, se houver. */
  cancelaEm: string | null;
  canceladaEm: string | null;
  provedor: string | null;
  origem: string | null;
  /** Quando a última cobrança foi paga. Null enquanto não houver cobrança. */
  ultimaCobranca: string | null;
  /** A empresa está suspensa ou com acesso vencido? */
  bloqueada: boolean;
};

export type IndicadoresDeAssinatura = {
  ativas: number;
  testes: number;
  mrrCents: number;
  inadimplentes: number;
  pendentes: number;
  cancelamentosAgendados: number;
  semAssinatura: number;
  /** Receita já paga, de cobranças fechadas. Zero enquanto nada é cobrado. */
  receitaPagaCents: number;
};

/**
 * Estado da assinatura, na ordem de precedência que importa para quem
 * administra: primeiro o que trava, depois o que espera, por último o normal.
 *
 * O cancelamento agendado vence "ativa" de propósito — a assinatura ainda
 * funciona, mas tem data para morrer, e essa é a informação que muda uma
 * decisão de cobrança.
 */
export function estadoDaAssinatura(input: {
  temAssinatura: boolean;
  status: string | null;
  cancelAt: string | null;
  trial: boolean;
  agora?: number;
}): EstadoDaAssinatura {
  const agora = input.agora ?? Date.now();

  if (!input.temAssinatura) return input.trial ? "teste" : "sem_assinatura";
  if (input.status === "cancelada") return "cancelada";
  if (input.cancelAt && new Date(input.cancelAt).getTime() > agora) {
    return "cancelamento_agendado";
  }
  if (input.status === "vencida") return "inadimplente";
  if (input.status === "pendente") return "pendente";
  if (input.trial) return "teste";
  return "ativa";
}

export async function listSubscriptions(): Promise<{
  assinaturas: AssinaturaResumo[];
  indicadores: IndicadoresDeAssinatura;
}> {
  const db = createAdminClient();

  const [ws, assin, planos, afiliados, cobrancas] = await Promise.all([
    db
      .from("workspace")
      .select(
        "id, name, plan_id, trial, suspended, access_expires_at, affiliate_id, deleted_at"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    db
      .from("subscription")
      .select(
        "workspace_id, plan_id, status, billing_day, provider, cancel_at, canceled_at"
      ),
    db.from("billing_plan").select("id, name, price_cents"),
    db.from("affiliate").select("id, name"),
    db
      .from("subscription_charge")
      .select("workspace_id, paid_at, paid_amount_cents, amount_cents, status")
      .eq("status", "paga"),
  ]);

  type W = {
    id: string;
    name: string;
    plan_id: string | null;
    trial: boolean;
    suspended: boolean;
    access_expires_at: string | null;
    affiliate_id: string | null;
  };
  type S = {
    workspace_id: string;
    plan_id: string | null;
    status: string;
    billing_day: number;
    provider: string;
    cancel_at: string | null;
    canceled_at: string | null;
  };

  const assinaturas = new Map(
    ((assin.data ?? []) as S[]).map((a) => [a.workspace_id, a])
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

  // Última cobrança paga por empresa, numa passada.
  const ultimaPorWorkspace = new Map<string, string>();
  let receitaPagaCents = 0;
  for (const c of (cobrancas.data ?? []) as {
    workspace_id: string;
    paid_at: string | null;
    paid_amount_cents: number | null;
    amount_cents: number;
  }[]) {
    receitaPagaCents += c.paid_amount_cents ?? c.amount_cents;
    if (!c.paid_at) continue;
    const atual = ultimaPorWorkspace.get(c.workspace_id);
    if (!atual || c.paid_at > atual) {
      ultimaPorWorkspace.set(c.workspace_id, c.paid_at);
    }
  }

  const agora = Date.now();
  const hoje = new Date();

  const linhas: AssinaturaResumo[] = ((ws.data ?? []) as W[]).map((w) => {
    const a = assinaturas.get(w.id);
    const estado = estadoDaAssinatura({
      temAssinatura: !!a,
      status: a?.status ?? null,
      cancelAt: a?.cancel_at ?? null,
      trial: w.trial,
      agora,
    });

    const planId = a?.plan_id ?? w.plan_id;
    const plano = planId ? planosPorId.get(planId) : undefined;

    // O ciclo é DERIVADO do dia de cobrança, não lido de uma tabela: nenhuma
    // cobrança foi gerada ainda, e a data seria nula em toda linha. Como
    // `cycleFor` é determinístico, "próxima cobrança" é uma previsão honesta
    // — e some no dia em que existirem cobranças de verdade para ler.
    const ciclo = a ? cycleFor(hoje, a.billing_day) : null;
    return {
      workspaceId: w.id,
      empresa: w.name,
      estado,
      planoNome: plano?.name ?? null,
      valorCents: plano?.price_cents ?? 0,
      diaDeCobranca: a?.billing_day ?? 0,
      cicloAtual: ciclo,
      proximaCobranca: ciclo?.end ?? null,
      cancelaEm: a?.cancel_at ?? null,
      canceladaEm: a?.canceled_at ?? null,
      provedor: a?.provider ?? null,
      origem: w.affiliate_id
        ? (afiliadosPorId.get(w.affiliate_id) ?? null)
        : null,
      ultimaCobranca: ultimaPorWorkspace.get(w.id) ?? null,
      bloqueada:
        w.suspended ||
        (!!w.access_expires_at &&
          new Date(w.access_expires_at).getTime() < agora),
    };
  });

  const contar = (e: EstadoDaAssinatura) =>
    linhas.filter((l) => l.estado === e).length;

  return {
    assinaturas: linhas,
    indicadores: {
      ativas: contar("ativa"),
      testes: contar("teste"),
      // Só assinatura ATIVA soma. Cancelamento agendado ainda paga este mês,
      // mas contar como receita recorrente seria projetar para a frente uma
      // receita que já tem data para acabar.
      mrrCents: linhas
        .filter((l) => l.estado === "ativa" && !l.bloqueada)
        .reduce((s, l) => s + l.valorCents, 0),
      inadimplentes: contar("inadimplente"),
      pendentes: contar("pendente"),
      cancelamentosAgendados: contar("cancelamento_agendado"),
      semAssinatura: contar("sem_assinatura"),
      receitaPagaCents,
    },
  };
}
