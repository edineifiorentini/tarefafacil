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
export function isOverdue(entry: FinanceEntry, now: Date = new Date()): boolean {
  if (entry.status !== "previsto") return false;
  const today = now.toISOString().slice(0, 10);
  return entry.due_date < today;
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

export function entriesForMonth(entries: FinanceEntry[], monthISO: string): FinanceEntry[] {
  return entries.filter(
    (e) => e.due_date.slice(0, 7) === monthISO || e.confirmed_at?.slice(0, 7) === monthISO
  );
}
