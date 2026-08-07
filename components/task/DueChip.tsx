import { IconAlertTriangle, IconCalendar } from "@tabler/icons-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Chip de prazo — cor muda por proximidade (design 8.2). Reforço por ícone,
// não só cor (11.6). Números tabulares (.tnum) para não dançar.
export function DueChip({ date }: { date: string }) {
  const due = parseISO(date);
  const diff = differenceInCalendarDays(due, new Date());
  const overdue = diff < 0;
  const dueSoon = !overdue && diff <= 2;

  let label: string;
  if (diff === 0) label = "Hoje";
  else if (diff === 1) label = "Amanhã";
  else if (diff === -1) label = "Ontem";
  else label = format(due, "d MMM", { locale: ptBR });

  const tone = overdue
    ? "bg-overdue-bg text-overdue"
    : dueSoon
      ? "bg-due-soon-bg text-due-soon"
      : "text-fg-muted";

  const Glyph = overdue ? IconAlertTriangle : IconCalendar;

  return (
    <span
      className={`tnum inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[length:var(--text-caption-size)] ${tone}`}
    >
      <Glyph size={12} stroke={1.5} aria-hidden />
      {overdue ? <span className="sr-only">Atrasado: </span> : null}
      {label}
    </span>
  );
}
