import { endOfWeek, parseISO, subWeeks } from "date-fns";

import { localDayISO, localDayOf, localMonthOf } from "@/lib/dates/day";
import type { FinanceEntry, Task } from "@/types/database";

/**
 * Séries temporais do painel. Tudo puro e reconstruído a partir dos carimbos
 * reais (`created_at`, `completed_at`, `cancelled_at`, `due_date`) — nenhum
 * número é inventado para preencher gráfico.
 */

/**
 * Instante atual. Fica aqui, fora de qualquer corpo de render: o React
 * Compiler proíbe ler o relógio durante a renderização, e ele analisa só o
 * texto literal `new Date()` da função que está compilando.
 */
export function nowInstant(): Date {
  return new Date();
}

/** A demanda estava em aberto naquele instante? */
export function openAt(task: Task, instant: Date): boolean {
  if (parseISO(task.created_at) > instant) return false;
  if (task.completed_at && parseISO(task.completed_at) <= instant) return false;
  if (task.cancelled_at && parseISO(task.cancelled_at) <= instant) return false;
  return true;
}

/** Já estava concluída naquele instante? */
export function doneBy(task: Task, instant: Date): boolean {
  return !!task.completed_at && parseISO(task.completed_at) <= instant;
}

/** Estava aberta E com o prazo já vencido naquele instante. */
export function overdueAt(task: Task, instant: Date): boolean {
  if (!openAt(task, instant)) return false;
  return !!task.due_date && task.due_date < localDayISO(instant);
}

/**
 * Fim de cada uma das últimas `weeks` semanas. A última é o próprio agora,
 * para o ponto final do micrográfico refletir o estado atual e não o de
 * domingo passado.
 */
export function weekEnds(now: Date, weeks: number): Date[] {
  const result: Date[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const end = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    result.push(end > now ? now : end);
  }
  return result;
}

/** Backlog aberto ao fim de cada semana. `filter` restringe o conjunto. */
export function openBacklogSeries(
  tasks: Task[],
  now: Date,
  weeks = 8,
  filter?: (task: Task) => boolean
): number[] {
  const pool = filter ? tasks.filter(filter) : tasks;
  return weekEnds(now, weeks).map(
    (end) => pool.filter((t) => openAt(t, end)).length
  );
}

/** Atrasadas ao fim de cada semana. */
export function overdueSeries(tasks: Task[], now: Date, weeks = 8): number[] {
  return weekEnds(now, weeks).map(
    (end) => tasks.filter((t) => overdueAt(t, end)).length
  );
}

/** Taxa de conclusão (%) ao fim de cada semana — mesma fórmula do indicador. */
export function completionRateSeries(
  tasks: Task[],
  now: Date,
  weeks = 8
): number[] {
  return weekEnds(now, weeks).map((end) => {
    let done = 0;
    let open = 0;
    for (const t of tasks) {
      if (doneBy(t, end)) done += 1;
      else if (openAt(t, end)) open += 1;
    }
    const decided = done + open;
    return decided > 0 ? Math.round((done / decided) * 100) : 0;
  });
}

/**
 * Variação entre os dois últimos pontos de uma série, em %. Quando a base é
 * zero não existe variação percentual definida — devolve 0 em vez de
 * inventar "infinito".
 */
export function percentChange(series: number[]): number {
  if (series.length < 2) return 0;
  const previous = series[series.length - 2];
  const current = series[series.length - 1];
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

/** Variação em pontos percentuais — para séries que já são percentuais. */
export function pointChange(series: number[]): number {
  if (series.length < 2) return 0;
  return series[series.length - 1] - series[series.length - 2];
}

export type DeliveriesByWeek = {
  labels: string[];
  delivered: number[];
  planned: number[];
  /** Prazo naquela semana e não entregue até ele. */
  overdue: number[];
  totalDelivered: number;
  totalOverdue: number;
};

/**
 * Entregas por semana do mês: "entregues" pela data de conclusão, "planejadas"
 * pelo prazo. Canceladas não contam em nenhuma das duas séries.
 */
export function deliveriesByWeek(
  tasks: Task[],
  monthISO: string,
  /** Instante de leitura — decide o que já pode ser considerado atrasado. */
  now: Date = nowInstant()
): DeliveriesByWeek {
  const hoje = localDayISO(now);
  // Dia 0 do mês seguinte, em UTC, é o último dia deste mês. Usar
  // endOfMonth() aqui daria 23:59 LOCAL e, num fuso atrás de UTC, o
  // getUTCDate() cairia no dia 1º do mês seguinte.
  const [year, month] = monthISO.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // Fatias de 7 dias contadas do dia 1, com a última absorvendo o resto.
  // Semana ISO não serve aqui: ela atravessa a virada do mês e produz 5 ou 6
  // baldes, sendo o primeiro e o último de 1 ou 2 dias — o gráfico fica
  // esparso e "Sem 6" não quer dizer nada para quem lê um fechamento mensal.
  const WEEKS = 4;
  const labels: string[] = [];
  const delivered: number[] = [];
  const planned: number[] = [];
  const overdue: number[] = [];

  for (let index = 0; index < WEEKS; index += 1) {
    const firstDay = index * 7 + 1;
    const closingDay = index === WEEKS - 1 ? lastDay : (index + 1) * 7;
    const fromISO = `${monthISO}-${String(firstDay).padStart(2, "0")}`;
    const toISO = `${monthISO}-${String(closingDay).padStart(2, "0")}`;

    labels.push(`Sem ${index + 1}`);

    delivered.push(
      tasks.filter((t) => {
        if (t.cancelled_at || !t.completed_at) return false;
        const day = localDayOf(t.completed_at);
        return day >= fromISO && day <= toISO;
      }).length
    );

    planned.push(
      tasks.filter((t) => {
        if (t.cancelled_at || !t.due_date) return false;
        return t.due_date >= fromISO && t.due_date <= toISO;
      }).length
    );

    // Atrasada = tinha prazo nesta semana e NÃO foi entregue até ele.
    // Inclui a que foi entregue depois do prazo: o atraso aconteceu, e
    // esconder isso faria a série virar elogio em vez de diagnóstico.
    // Semana futura dá zero sozinha, porque o prazo ainda não venceu.
    overdue.push(
      tasks.filter((t) => {
        if (t.cancelled_at || !t.due_date) return false;
        if (t.due_date < fromISO || t.due_date > toISO) return false;
        if (t.due_date >= hoje && !t.completed_at) return false;
        return !t.completed_at || localDayOf(t.completed_at) > t.due_date;
      }).length
    );
  }

  return {
    labels,
    delivered,
    planned,
    overdue,
    totalDelivered: delivered.reduce((sum, n) => sum + n, 0),
    totalOverdue: overdue.reduce((sum, n) => sum + n, 0),
  };
}

/** Total entregue num mês — usado na comparação com o mês anterior. */
export function deliveredInMonth(tasks: Task[], monthISO: string): number {
  return tasks.filter(
    (t) =>
      !t.cancelled_at &&
      !!t.completed_at &&
      localMonthOf(t.completed_at) === monthISO
  ).length;
}

export type UpcomingDelivery = {
  task: Task;
  /** "09:00" ou null quando é de dia inteiro. */
  time: string | null;
  state: "concluida" | "atrasada" | "andamento" | "pendente";
};

/**
 * Próximas entregas a partir de hoje: mantém as concluídas do dia (para o
 * usuário ver o que já saiu) e ordena por data e horário.
 */
export function upcomingDeliveries(
  tasks: Task[],
  now: Date,
  limit = 4
): UpcomingDelivery[] {
  const today = localDayISO(now);

  return tasks
    .filter((t) => !t.cancelled_at && !!t.due_date && t.due_date >= today)
    .sort((a, b) => {
      const byDate = (a.due_date ?? "").localeCompare(b.due_date ?? "");
      if (byDate !== 0) return byDate;
      return (a.due_time ?? "99:99").localeCompare(b.due_time ?? "99:99");
    })
    .slice(0, limit)
    .map((task) => ({
      task,
      time: task.due_time ? task.due_time.slice(0, 5) : null,
      state: task.completed_at
        ? ("concluida" as const)
        : task.due_date && task.due_date < today
          ? ("atrasada" as const)
          : task.assignee_id
            ? ("andamento" as const)
            : ("pendente" as const),
    }));
}

export type RevenueYear = {
  labels: string[];
  /** Centavos recebidos por mês (jan..dez). */
  values: number[];
  totalCents: number;
  /** Crescimento sobre o ano anterior, em %. */
  growth: number;
};

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

/**
 * Faturamento por mês do ano: só entradas CONFIRMADAS, pela data de
 * confirmação (regime de caixa, mesma regra do módulo Financeiro — previsão
 * nunca entra no realizado).
 */
export function revenueByMonth(
  entries: FinanceEntry[],
  year: number
): RevenueYear {
  const values = new Array<number>(12).fill(0);
  let previousYearTotal = 0;

  for (const e of entries) {
    if (e.kind !== "entrada" || e.status !== "confirmado" || !e.confirmed_at) {
      continue;
    }
    const entryYear = Number(e.confirmed_at.slice(0, 4));
    if (entryYear === year) {
      const monthIndex = Number(e.confirmed_at.slice(5, 7)) - 1;
      if (monthIndex >= 0 && monthIndex < 12)
        values[monthIndex] += e.amount_cents;
    } else if (entryYear === year - 1) {
      previousYearTotal += e.amount_cents;
    }
  }

  const totalCents = values.reduce((sum, n) => sum + n, 0);
  const growth =
    previousYearTotal > 0
      ? ((totalCents - previousYearTotal) / previousYearTotal) * 100
      : 0;

  return { labels: MONTH_LABELS, values, totalCents, growth };
}
