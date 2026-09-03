import { addDays, addMonths, format, parseISO } from "date-fns";

import { localDayISO } from "@/lib/dates/day";

/**
 * Regras de ciclo da assinatura. Puro de propósito: é aqui que um erro
 * cobra duas vezes ou deixa de cobrar, e isso não pode depender de rodar
 * contra um banco para ser verificado.
 *
 * O que este módulo NÃO faz: falar com provedor, gravar nada, decidir
 * acesso. Acesso é `access_expires_at` no banco, que já existia.
 */

/**
 * Dias de tolerância depois do vencimento antes de cortar.
 *
 * Existe porque Pix cai em minutos mas boleto e conciliação erram por
 * horas, e porque cortar o acesso de quem pagou no dia é o pior defeito
 * possível num SaaS — quem foi cortado injustamente não volta.
 */
export const GRACE_DAYS = 5;

/** Quantos dias uma cobrança fica aberta antes de expirar. */
export const CHARGE_TTL_DAYS = 7;

export type SubscriptionStatus = "ativa" | "pendente" | "vencida" | "cancelada";

export type Cycle = {
  /** Primeiro dia do período coberto, "YYYY-MM-DD". */
  start: string;
  /** Primeiro dia do período seguinte — o vencimento do acesso. */
  end: string;
};

/**
 * O ciclo que contém uma data, dado o dia de cobrança.
 *
 * `billingDay` é limitado a 28 no banco de propósito: com 29, 30 ou 31 o
 * ciclo andaria sozinho em fevereiro e o assinante seria cobrado em datas
 * diferentes a cada ano.
 */
export function cycleFor(reference: Date, billingDay: number): Cycle {
  const ano = reference.getFullYear();
  const mes = reference.getMonth();
  const dia = reference.getDate();

  // Antes do dia de cobrança, o ciclo corrente começou no mês passado.
  const inicioMes = dia >= billingDay ? mes : mes - 1;
  const inicio = new Date(ano, inicioMes, billingDay);

  return {
    start: localDayISO(inicio),
    end: localDayISO(addMonths(inicio, 1)),
  };
}

/** O ciclo seguinte a um dado ciclo. */
export function nextCycle(cycle: Cycle): Cycle {
  const inicio = parseISO(cycle.end);
  return { start: cycle.end, end: localDayISO(addMonths(inicio, 1)) };
}

/**
 * Até quando o acesso vale depois de uma cobrança paga.
 *
 * É o fim do período MAIS a carência. A carência entra aqui, e não numa
 * checagem à parte, para que exista um número só decidindo acesso: a data
 * gravada em `access_expires_at`. Regra de carência espalhada é regra que
 * um dia diverge.
 */
export function accessUntil(cycle: Cycle): string {
  return localDayISO(addDays(parseISO(cycle.end), GRACE_DAYS));
}

/** Quando uma cobrança criada agora deve expirar. */
export function chargeExpiresAt(now: Date): Date {
  return addDays(now, CHARGE_TTL_DAYS);
}

export type ChargeDecision =
  | {
      charge: false;
      reason:
        | "plano vitalício"
        | "plano gratuito"
        | "cancelada"
        | "já cobrado";
    }
  | { charge: true; cycle: Cycle; amountCents: number };

/**
 * Decide se um workspace deve receber cobrança agora.
 *
 * Recebe os períodos JÁ cobrados em vez de consultar o banco: mantém a
 * função pura e deixa a idempotência visível no teste. No banco existe
 * também o índice único (workspace, period_start), que é a garantia real —
 * esta conta só evita bater nele à toa.
 */
export function decideCharge(input: {
  planCode: string;
  priceCents: number;
  /** `billing_plan.vitalicio` (0085): plano sem cobrança e sem fim. */
  vitalicio?: boolean;
  status: SubscriptionStatus;
  billingDay: number;
  /** `period_start` das cobranças que já existem. */
  chargedPeriods: string[];
  now: Date;
}): ChargeDecision {
  // Vitalício vem ANTES de tudo, inclusive de "cancelada", porque é o fato
  // mais forte: é uma promessa feita a uma pessoa, e o relatório da execução
  // precisa dizer o motivo verdadeiro. Ficar escondido atrás de "plano
  // gratuito" faria a promessa parecer um efeito colateral do preço zero —
  // e no dia em que alguém cadastrasse um vitalício com preço, ele seria
  // cobrado sem ninguém decidir isso.
  if (input.vitalicio) {
    return { charge: false, reason: "plano vitalício" };
  }
  if (input.status === "cancelada")
    return { charge: false, reason: "cancelada" };
  // Plano gratuito não gera cobrança de R$ 0 — fatura de zero real só
  // confunde quem recebe.
  if (input.priceCents <= 0) {
    return { charge: false, reason: "plano gratuito" };
  }

  const cycle = cycleFor(input.now, input.billingDay);
  if (input.chargedPeriods.includes(cycle.start)) {
    return { charge: false, reason: "já cobrado" };
  }

  return { charge: true, cycle, amountCents: input.priceCents };
}

/**
 * Situação da assinatura a partir do que existe.
 *
 * Derivada, não guardada como verdade: assim ela não pode divergir dos
 * fatos (a cobrança e a data de acesso) por causa de um job que falhou.
 */
export function deriveStatus(input: {
  cancelled: boolean;
  /** Cobrança mais recente, se houver. */
  latestCharge?: { status: string; periodEnd: string } | null;
  accessExpiresAt: string | null;
  now: Date;
}): SubscriptionStatus {
  if (input.cancelled) return "cancelada";

  const hoje = localDayISO(input.now);

  // Acesso em dia é o fato que mais importa: se a data cobre hoje, está ativa
  // mesmo que exista fatura aberta do próximo ciclo.
  if (input.accessExpiresAt && input.accessExpiresAt > hoje) {
    return input.latestCharge?.status === "aberta" ? "pendente" : "ativa";
  }

  // Sem data de acesso é assinatura que nunca foi cobrada (ou plano livre):
  // não é inadimplência.
  if (!input.accessExpiresAt) {
    return input.latestCharge?.status === "aberta" ? "pendente" : "ativa";
  }

  return "vencida";
}

/** Rótulo do ciclo para a interface: "01/09 a 01/10". */
export function cycleLabel(cycle: Cycle): string {
  const curto = (iso: string) => format(parseISO(iso), "dd/MM");
  return `${curto(cycle.start)} a ${curto(cycle.end)}`;
}
