import { format, parseISO, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { FinanceEntry } from "@/types/database";

export type CashFlowMode = "realizado" | "previsto";

export type CashFlowPoint = {
  month: string; // "YYYY-MM"
  label: string; // "ago/26"
  recebido: number; // centavos
  despesas: number;
  saldo: number; // recebido - despesas do mês (não é saldo acumulado)
};

function monthShortLabel(monthISO: string): string {
  const label = format(parseISO(`${monthISO}-01`), "MMM/yy", { locale: ptBR });
  return label.replace(".", "");
}

// Série mensal pro gráfico (spec §8.4). "Realizado" usa data de
// confirmação e só entra o que já foi confirmado — nunca soma previsão no
// realizado. "Previsto" usa vencimento das ainda-previstas. Cancelada
// nunca entra em nenhum dos dois modos.
export function buildCashFlowSeries(
  entries: FinanceEntry[],
  endMonthISO: string,
  monthsCount: number,
  mode: CashFlowMode
): CashFlowPoint[] {
  const end = parseISO(`${endMonthISO}-01`);
  const months: string[] = [];
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    months.push(format(subMonths(end, i), "yyyy-MM"));
  }

  const byMonth = new Map<string, { recebido: number; despesas: number }>();
  for (const m of months) byMonth.set(m, { recebido: 0, despesas: 0 });

  for (const e of entries) {
    if (mode === "realizado" && e.status !== "confirmado") continue;
    if (mode === "previsto" && e.status !== "previsto") continue;
    const relevantDate = mode === "realizado" ? e.confirmed_at : e.due_date;
    if (!relevantDate) continue;
    const bucket = byMonth.get(relevantDate.slice(0, 7));
    if (!bucket) continue;
    if (e.kind === "entrada") bucket.recebido += e.amount_cents;
    else bucket.despesas += e.amount_cents;
  }

  return months.map((m) => {
    const b = byMonth.get(m) ?? { recebido: 0, despesas: 0 };
    return {
      month: m,
      label: monthShortLabel(m),
      recebido: b.recebido,
      despesas: b.despesas,
      saldo: b.recebido - b.despesas,
    };
  });
}

export function periodBalance(points: CashFlowPoint[]): number {
  return points.reduce((sum, p) => sum + p.saldo, 0);
}
