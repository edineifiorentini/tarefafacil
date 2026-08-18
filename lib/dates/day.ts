import { format, parseISO } from "date-fns";

/**
 * Dia civil no fuso de quem está olhando.
 *
 * Existe porque havia duas respostas para "que dia é hoje" no código: o
 * painel usava `toISOString().slice(0,10)` (UTC) e o sino usava `format`
 * (local). Em UTC-3 isso significa que, das 21h à meia-noite, o painel
 * achava que já era amanhã — uma demanda entregue às 21h30 caía na semana
 * seguinte do gráfico, e no dia 31 caía no mês seguinte.
 *
 * `due_date` é data civil, sem hora nem fuso: comparar com ela exige a data
 * civil de quem lê, não o instante em UTC.
 */

/** "2026-08-18" para o instante dado, no fuso local. */
export function localDayISO(instant: Date): string {
  return format(instant, "yyyy-MM-dd");
}

/** Dia civil local de um carimbo de tempo (`created_at`, `completed_at`…). */
export function localDayOf(timestampISO: string): string {
  return localDayISO(parseISO(timestampISO));
}

/** "2026-08" — mês civil local de um carimbo de tempo. */
export function localMonthOf(timestampISO: string): string {
  return format(parseISO(timestampISO), "yyyy-MM");
}
