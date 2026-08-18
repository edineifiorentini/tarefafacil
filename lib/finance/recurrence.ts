import { addMonths, format, isAfter, parseISO } from "date-fns";

import type { FinanceRecurrence } from "@/types/database";

/**
 * Planejador de recorrência. Puro: calcula o que DEVERIA existir e não
 * decide idempotência — isso é do índice único
 * `(source_type, source_id, installment_number)` da 0033, igual às parcelas
 * de contrato.
 *
 * O número da ocorrência é a posição na série (1, 2, 3…), não o mês. É ele
 * que ancora a idempotência: gerar duas vezes o mesmo horizonte não duplica
 * nada, porque a ocorrência 7 já existe.
 */

export type PlannedOccurrence = {
  number: number;
  dueDate: string; // YYYY-MM-DD
  amountCents: number;
};

const STEP_MONTHS: Record<string, number> = {
  mensal: 1,
  trimestral: 3,
  anual: 12,
};

/**
 * Quanto se gera de uma vez quando a regra não tem fim.
 *
 * Doze ocorrências mensais é um ano de fluxo de caixa à frente — o bastante
 * para o gráfico e para a meta fazerem sentido, sem encher a tabela de
 * previsão que ninguém vai olhar.
 */
export const DEFAULT_HORIZON = 12;

export type RecurrenceRule = Pick<
  FinanceRecurrence,
  "amount_cents" | "frequency" | "starts_on" | "ends_on"
>;

export function planOccurrences(
  rule: RecurrenceRule,
  horizon: number = DEFAULT_HORIZON
): PlannedOccurrence[] {
  const step = STEP_MONTHS[rule.frequency];
  if (!step || !rule.starts_on || rule.amount_cents <= 0 || horizon <= 0) {
    return [];
  }

  const inicio = parseISO(rule.starts_on);
  const fim = rule.ends_on ? parseISO(rule.ends_on) : null;
  const out: PlannedOccurrence[] = [];

  for (let i = 0; i < horizon; i += 1) {
    // addMonths gruda no último dia quando o mês é curto: dia 31 em
    // fevereiro vira 28 (ou 29). É o comportamento certo — "todo dia 31"
    // significa "no fim do mês" para quem paga aluguel.
    const data = addMonths(inicio, i * step);
    if (fim && isAfter(data, fim)) break;

    out.push({
      number: i + 1,
      dueDate: format(data, "yyyy-MM-dd"),
      amountCents: rule.amount_cents,
    });
  }

  return out;
}

/**
 * Quais ocorrências ainda faltam, dado o que já foi gerado.
 *
 * Recebe os números que já existem em vez das linhas inteiras: quem chama
 * já tem essa lista do banco, e assim a função continua pura e testável.
 */
export function missingOccurrences(
  planned: PlannedOccurrence[],
  existingNumbers: number[]
): PlannedOccurrence[] {
  const existe = new Set(existingNumbers);
  return planned.filter((o) => !existe.has(o.number));
}

/**
 * Rótulo da frequência para a interface. Fica aqui, junto da regra, para
 * não haver duas traduções do mesmo vocabulário em telas diferentes.
 */
export const FREQUENCY_LABEL: Record<string, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  anual: "Anual",
};

/** Frase curta da regra: "R$ 1.500,00 · mensal, a partir de 05/09/2026". */
export function ruleSummary(
  rule: RecurrenceRule & { description: string },
  formatMoney: (cents: number) => string
): string {
  const inicio = rule.starts_on.split("-").reverse().join("/");
  const fim = rule.ends_on
    ? ` até ${rule.ends_on.split("-").reverse().join("/")}`
    : "";
  return `${formatMoney(rule.amount_cents)} · ${
    FREQUENCY_LABEL[rule.frequency]?.toLowerCase() ?? rule.frequency
  }, a partir de ${inicio}${fim}`;
}
