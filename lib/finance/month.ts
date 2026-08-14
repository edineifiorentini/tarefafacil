import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// monthISO sempre "YYYY-MM". new Date() fica só aqui (fora de qualquer
// corpo de render) — mesmo padrão usado em Pomodoro/HojeView.
export function currentMonthISO(): string {
  return new Date().toISOString().slice(0, 7);
}

export function shiftMonth(monthISO: string, delta: number): string {
  const d = addMonths(new Date(`${monthISO}-01T00:00:00`), delta);
  return d.toISOString().slice(0, 7);
}

export function monthLabel(monthISO: string): string {
  const d = new Date(`${monthISO}-01T00:00:00`);
  const label = format(d, "MMMM 'de' yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
