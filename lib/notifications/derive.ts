import { differenceInCalendarDays, parseISO } from "date-fns";

import { FUSO_PADRAO, diaCivilEm } from "@/lib/dates/day";
import type { Contract, FinanceEntry, Task } from "@/types/database";

import type { DerivedAlert, FeedEvent, FeedItem } from "./types";

/**
 * Alertas de tempo, calculados na leitura.
 *
 * Nada disso vira linha no banco: é estado atual, não evento. Um "vence em
 * 2 dias" gravado precisaria de um job para virar "vence amanhã" e de outro
 * para sumir quando a demanda fosse entregue. Derivado, ele nasce certo e
 * morre sozinho.
 *
 * Datas são comparadas como texto `YYYY-MM-DD` no fuso de quem está olhando
 * — é o mesmo critério do resto do app (`lib/dashboard/trends.ts`) e é o que
 * o usuário entende por "hoje".
 */

/** Janela de "prazo próximo" para demandas. */
export const TASK_SOON_DAYS = 3;
/** Janela de aviso de fim de vigência, quando o contrato não define a dele. */
const CONTRACT_SOON_DAYS = 30;
/** Janela de parcela a vencer. */
const FINANCE_SOON_DAYS = 7;

/**
 * Data de hoje no fuso PEDIDO — e o padrão não é mais o do ambiente.
 *
 * Era `localDayISO`, que pergunta ao ambiente. No navegador isso acerta
 * (o ambiente é o aparelho de quem lê), e foi assim durante um ano. Mas o
 * acerto era circunstancial: no dia em que um destes módulos virou rota de
 * servidor, o ambiente passou a ser UTC — foi o que aconteceu com a página
 * de aprovação em 4/set/2026, três horas adiantada em produção.
 *
 * Com o fuso escrito e o padrão brasileiro, o ambiente deixa de opinar. Quem
 * tem o fuso do usuário à mão passa ele: a preferência salva vale mais que a
 * configuração do aparelho em que a pessoa abriu.
 */
export function todayISO(now: Date, fuso: string = FUSO_PADRAO): string {
  return diaCivilEm(now, fuso);
}

/** Dias de calendário entre duas datas ISO. Negativo = a primeira já passou. */
function daysUntil(dateISO: string, todayIso: string): number {
  return differenceInCalendarDays(parseISO(dateISO), parseISO(todayIso));
}

function plural(n: number, um: string, muitos: string): string {
  return n === 1 ? `1 ${um}` : `${n} ${muitos}`;
}

/** Uma demanda só entra em alerta se ainda está viva e tem prazo. */
export function isPending(task: Task): boolean {
  return !task.completed_at && !task.cancelled_at && !!task.due_date;
}

/**
 * Alertas das demandas.
 *
 * O sino é pessoal: por padrão só entram as demandas de quem está olhando.
 * `alsoTeamOverdue` liga o que o spec pede para gestão ("ao atrasar,
 * notificar o gestor") sem despejar a fila inteira do time em todo mundo.
 */
export function deriveTaskAlerts(
  tasks: Task[],
  options: { myId: string | null; alsoTeamOverdue?: boolean; fuso?: string },
  now: Date
): DerivedAlert[] {
  const { myId, alsoTeamOverdue = false, fuso = FUSO_PADRAO } = options;
  const today = todayISO(now, fuso);
  const alerts: DerivedAlert[] = [];

  for (const task of tasks) {
    if (!isPending(task)) continue;
    const due = task.due_date as string;
    const mine = !!myId && task.assignee_id === myId;
    const days = daysUntil(due, today);

    if (days < 0) {
      if (!mine && !alsoTeamOverdue) continue;
      const atraso = Math.abs(days);
      alerts.push({
        id: `atrasada:${task.id}`,
        kind: "atrasada",
        title: task.title,
        detail: mine
          ? `Atrasada há ${plural(atraso, "dia", "dias")}`
          : `Da equipe · atrasada há ${plural(atraso, "dia", "dias")}`,
        target: { type: "task", id: task.id },
        weight: mine ? 0 : 1,
      });
      continue;
    }

    // Prazo que ainda não venceu só interessa a quem vai entregar.
    if (!mine) continue;

    if (days === 0) {
      alerts.push({
        id: `prazo_hoje:${task.id}`,
        kind: "prazo_hoje",
        title: task.title,
        detail: task.due_time
          ? `Vence hoje às ${task.due_time.slice(0, 5)}`
          : "Vence hoje",
        target: { type: "task", id: task.id },
        weight: 2,
      });
    } else if (days <= TASK_SOON_DAYS) {
      alerts.push({
        id: `prazo_proximo:${task.id}`,
        kind: "prazo_proximo",
        title: task.title,
        detail: `Vence em ${plural(days, "dia", "dias")}`,
        target: { type: "task", id: task.id },
        weight: 3,
      });
    }
  }

  return alerts;
}

/**
 * Contratos perto do fim da vigência. Respeita o aviso prévio do próprio
 * contrato quando ele existe — é o prazo que vale para renovar ou avisar.
 */
export function deriveContractAlerts(
  contracts: Contract[],
  now: Date,
  fuso: string = FUSO_PADRAO
): DerivedAlert[] {
  const today = todayISO(now, fuso);
  const alerts: DerivedAlert[] = [];

  for (const contract of contracts) {
    if (contract.status !== "ativo" && contract.status !== "assinado") continue;
    if (!contract.ends_on) continue;

    const days = daysUntil(contract.ends_on, today);
    if (days < 0) continue;
    const janela = contract.renew_notice_days ?? CONTRACT_SOON_DAYS;
    if (days > janela) continue;

    alerts.push({
      id: `contrato_vencendo:${contract.id}`,
      kind: "contrato_vencendo",
      title: contract.title,
      detail:
        days === 0
          ? "Vigência termina hoje"
          : `Vigência termina em ${plural(days, "dia", "dias")}`,
      target: { type: "contract", id: contract.id },
      weight: 4,
    });
  }

  return alerts;
}

/**
 * Parcelas e lançamentos previstos vencendo ou vencidos.
 *
 * `canSeeFinance` não é um detalhe de interface: sem ele, um membro comum
 * leria valores no sino que não pode ver na tela do Financeiro.
 */
export function deriveFinanceAlerts(
  entries: FinanceEntry[],
  now: Date,
  canSeeFinance: boolean,
  fuso: string = FUSO_PADRAO
): DerivedAlert[] {
  if (!canSeeFinance) return [];

  const today = todayISO(now, fuso);
  const alerts: DerivedAlert[] = [];

  for (const entry of entries) {
    if (entry.status !== "previsto") continue;
    if (!entry.due_date) continue;

    const days = daysUntil(entry.due_date, today);
    if (days > FINANCE_SOON_DAYS) continue;

    const vencido = days < 0;
    alerts.push({
      id: `parcela_vencendo:${entry.id}`,
      kind: "parcela_vencendo",
      title: entry.description,
      detail: vencido
        ? `Vencido há ${plural(Math.abs(days), "dia", "dias")}`
        : days === 0
          ? "Vence hoje"
          : `Vence em ${plural(days, "dia", "dias")}`,
      target: { type: "finance", id: entry.id },
      weight: vencido ? 4.5 : 5,
    });
  }

  return alerts;
}

/**
 * Junta os dois blocos numa lista só: alertas por urgência, eventos por
 * recência com os não lidos na frente.
 */
export function mergeFeed(
  alerts: DerivedAlert[],
  events: FeedEvent[]
): FeedItem[] {
  const porUrgencia = [...alerts].sort(
    (a, b) => a.weight - b.weight || a.title.localeCompare(b.title, "pt-BR")
  );

  const porRecencia = [...events].sort((a, b) => {
    const naoLido = Number(!!a.readAt) - Number(!!b.readAt);
    if (naoLido !== 0) return naoLido;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return [
    ...porUrgencia.map((a) => ({ nature: "alerta" as const, ...a })),
    ...porRecencia.map((e) => ({ nature: "evento" as const, ...e })),
  ];
}

/**
 * O que o contador do sino mostra: todo alerta ativo (não há como "ler" um
 * atraso — ele conta até deixar de existir) mais os eventos não lidos.
 */
export function unreadCount(feed: FeedItem[]): number {
  return feed.filter((item) => item.nature === "alerta" || !item.readAt).length;
}
