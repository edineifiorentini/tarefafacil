import {
  IconAlertTriangle,
  IconCalendar,
  IconCalendarRepeat,
} from "@tabler/icons-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { textosDaReprogramacao } from "@/lib/tarefas/reprogramacao";

// Chip de prazo — cor muda por proximidade (design 8.2). Reforço por ícone,
// não só cor (11.6). Números tabulares (.tnum) para não dançar.
export function DueChip({
  date,
  time,
  reprogramadoDe = null,
  motivo = null,
}: {
  date: string;
  time?: string | null;
  /**
   * O prazo original, quando a demanda foi reprogramada (0099). O chip ganha
   * a marca de reprogramação; o original e o motivo vão para a dica e, para
   * leitor de tela, para o próprio texto.
   */
  reprogramadoDe?: string | null;
  motivo?: string | null;
}) {
  const due = parseISO(date);
  const diff = differenceInCalendarDays(due, new Date());
  const overdue = diff < 0;
  const dueSoon = !overdue && diff <= 2;

  let label: string;
  if (diff === 0) label = "Hoje";
  else if (diff === 1) label = "Amanhã";
  else if (diff === -1) label = "Ontem";
  else label = format(due, "d MMM", { locale: ptBR });

  if (time) label = `${label} · ${time.slice(0, 5)}`;

  const tone = overdue
    ? "bg-overdue-bg text-overdue"
    : dueSoon
      ? "bg-due-soon-bg text-due-soon"
      : "text-fg-muted";

  const Glyph = overdue ? IconAlertTriangle : IconCalendar;
  const repro = reprogramadoDe
    ? textosDaReprogramacao(reprogramadoDe, motivo)
    : null;

  return (
    <span
      title={repro?.dica}
      className={`tnum inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[length:var(--text-caption-size)] whitespace-nowrap ${tone}`}
    >
      <Glyph size={12} stroke={1.5} aria-hidden />
      {overdue ? <span className="sr-only">Atrasado: </span> : null}
      {label}
      {repro ? (
        <>
          <IconCalendarRepeat size={12} stroke={1.5} aria-hidden />
          <span className="sr-only">{repro.leitor}</span>
        </>
      ) : null}
    </span>
  );
}
