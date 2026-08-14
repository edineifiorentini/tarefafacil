import { addMonths, format, parseISO } from "date-fns";

import type { Contract } from "@/types/database";

export type PlannedInstallment = {
  number: number;
  dueDate: string; // YYYY-MM-DD
  amountCents: number;
};

const STEP_MONTHS: Record<string, number> = { mensal: 1, trimestral: 3, anual: 12 };
const DEFAULT_MAX = 12; // vigência sem fim definido: gera 1 ano por vez

// Deriva as parcelas previstas de um contrato (spec §13.1) a partir de
// valor + periodicidade + vigência. Pura — não toca banco, não decide
// idempotência (isso é responsabilidade de quem grava, comparando com o
// que já existe por source_id+installment_number).
export function planInstallments(
  contract: Pick<Contract, "amount_cents" | "starts_on" | "ends_on" | "billing_period">,
  maxOccurrences: number = DEFAULT_MAX
): PlannedInstallment[] {
  if (!contract.amount_cents || contract.amount_cents <= 0 || !contract.starts_on) {
    return [];
  }

  if (!contract.billing_period || contract.billing_period === "unico") {
    return [{ number: 1, dueDate: contract.starts_on, amountCents: contract.amount_cents }];
  }

  const step = STEP_MONTHS[contract.billing_period] ?? 1;
  const end = contract.ends_on ? parseISO(contract.ends_on) : null;
  const result: PlannedInstallment[] = [];
  let cursor = parseISO(contract.starts_on);

  for (let n = 1; n <= maxOccurrences; n += 1) {
    if (end && cursor > end) break;
    result.push({
      number: n,
      dueDate: format(cursor, "yyyy-MM-dd"),
      amountCents: contract.amount_cents,
    });
    cursor = addMonths(cursor, step);
  }
  return result;
}
