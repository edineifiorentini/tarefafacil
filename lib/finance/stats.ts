import { localDayISO } from "@/lib/dates/day";
import type { FinanceEntry } from "@/types/database";

export type FinanceStats = {
  recebido: number; // centavos, confirmadas NO mês
  despesas: number; // centavos, confirmadas NO mês
  lucro: number; // recebido - despesas
  aReceber: number; // centavos, previstas (qualquer mês, inclui vencidas)
  aPagar: number; // centavos, previstas (qualquer mês, inclui vencidas)
};

// "Vencido" é derivado — não existe como status guardado (mesmo padrão de
// "atrasada" nas Demandas): previsto + vencimento no passado.
export function isOverdue(
  entry: FinanceEntry,
  now: Date = new Date()
): boolean {
  if (entry.status !== "previsto") return false;
  // Dia civil LOCAL, não UTC. `due_date` é data sem hora nem fuso; comparar
  // com `toISOString()` fazia, em UTC-3, toda conta que vence hoje aparecer
  // como vencida a partir das 21h. É a mesma correção que o painel e o sino
  // já receberam.
  return entry.due_date < localDayISO(now);
}

// monthISO no formato "YYYY-MM". Recebido/Despesas são do mês (data de
// confirmação); A receber/A pagar são o total pendente atual, sem recorte
// de mês (spec 8.3: "entradas previstas e vencidas ainda não recebidas").
export function computeFinanceStats(
  entries: FinanceEntry[],
  monthISO: string
): FinanceStats {
  let recebido = 0;
  let despesas = 0;
  let aReceber = 0;
  let aPagar = 0;

  for (const e of entries) {
    if (e.status === "cancelado") continue;

    if (e.status === "confirmado") {
      if (e.confirmed_at?.slice(0, 7) === monthISO) {
        if (e.kind === "entrada") recebido += e.amount_cents;
        else despesas += e.amount_cents;
      }
    } else if (e.status === "previsto") {
      if (e.kind === "entrada") aReceber += e.amount_cents;
      else aPagar += e.amount_cents;
    }
  }

  return { recebido, despesas, lucro: recebido - despesas, aReceber, aPagar };
}

export function entriesForMonth(
  entries: FinanceEntry[],
  monthISO: string
): FinanceEntry[] {
  return entries.filter(
    (e) =>
      e.due_date.slice(0, 7) === monthISO ||
      e.confirmed_at?.slice(0, 7) === monthISO
  );
}

/** O que já venceu, de um lado e do outro. */
export type OverdueGroup = {
  /** Do mais antigo para o mais recente: a mais velha é a que dói. */
  entries: FinanceEntry[];
  cents: number;
};

export type OverdueBreakdown = {
  aReceber: OverdueGroup;
  aPagar: OverdueGroup;
};

/**
 * Separa o que venceu em receber e pagar.
 *
 * Vencido não tem recorte de mês de propósito: conta de março que ninguém
 * pagou continua vencida em agosto, e é justamente essa que some quando a
 * tela só olha o mês corrente.
 */
export function overdueBreakdown(
  entries: FinanceEntry[],
  now: Date = new Date()
): OverdueBreakdown {
  const aReceber: FinanceEntry[] = [];
  const aPagar: FinanceEntry[] = [];

  for (const e of entries) {
    if (!isOverdue(e, now)) continue;
    if (e.kind === "entrada") aReceber.push(e);
    else aPagar.push(e);
  }

  const ordenar = (lista: FinanceEntry[]) =>
    [...lista].sort((a, b) => a.due_date.localeCompare(b.due_date));
  const somar = (lista: FinanceEntry[]) =>
    lista.reduce((soma, e) => soma + e.amount_cents, 0);

  return {
    aReceber: { entries: ordenar(aReceber), cents: somar(aReceber) },
    aPagar: { entries: ordenar(aPagar), cents: somar(aPagar) },
  };
}

/** Quantos dias de atraso. Um dia é "1 dia", não "0 dias". */
export function daysOverdue(
  entry: FinanceEntry,
  now: Date = new Date()
): number {
  const hoje = new Date(`${localDayISO(now)}T00:00:00`);
  const venc = new Date(`${entry.due_date}T00:00:00`);
  return Math.max(
    0,
    Math.round((hoje.getTime() - venc.getTime()) / 86_400_000)
  );
}
