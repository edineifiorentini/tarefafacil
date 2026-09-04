import {
  IconAlertTriangle,
  IconCalendar,
  IconCalendarOff,
  IconCheck,
  IconClock,
} from "@tabler/icons-react";

import type { PrazoDaLinha, TomDoPrazo } from "@/lib/task/deadline";

/**
 * O prazo da linha, com a data por extenso na dica.
 *
 * **Cada tom tem ícone próprio.** Vermelho e verde são a mesma coisa para
 * quem tem daltonismo vermelho-verde, que é a forma mais comum — e o texto
 * ("Atrasada há 2 dias") já diz o que a cor diria, o ícone só o alcança
 * antes.
 *
 * Concluída fora do prazo NÃO é coral. Ela já saiu; pintá-la de alerta na
 * lista de hoje faz procurar uma ação que não existe. Quem decide isso é
 * `descreverPrazo`, e aqui só se obedece.
 *
 * `title` e não tooltip de biblioteca: são dezenas de linhas na tela, e um
 * `Tooltip.Root` por linha custaria mais do que a dica vale. O texto
 * também vai no `sr-only`, para quem não usa mouse.
 */

const VISUAL: Record<
  TomDoPrazo,
  // `icone` pode faltar: em "cancelada" o chip de status já disse o que
  // aconteceu, e repetir a proibição na mesma linha é ruído.
  { icone: typeof IconCalendar | null; cor: string; fundo?: string }
> = {
  atrasada: {
    icone: IconAlertTriangle,
    cor: "var(--status-overdue-fg)",
    fundo: "var(--status-overdue-bg)",
  },
  atencao: {
    icone: IconClock,
    cor: "var(--status-due-soon-fg)",
    fundo: "var(--status-due-soon-bg)",
  },
  normal: { icone: IconCalendar, cor: "var(--text-secondary)" },
  concluida: { icone: IconCheck, cor: "var(--text-muted)" },
  cancelada: { icone: null, cor: "var(--text-muted)" },
  sem_prazo: { icone: IconCalendarOff, cor: "var(--text-muted)" },
};

export function TaskDeadline({ prazo }: { prazo: PrazoDaLinha }) {
  const { icone: Icone, cor, fundo } = VISUAL[prazo.tom];

  return (
    <span
      title={prazo.titulo ?? undefined}
      className="tnum inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[length:var(--text-caption-size)] whitespace-nowrap"
      style={{ color: cor, background: fundo ?? "transparent" }}
    >
      {Icone ? <Icone size={12} stroke={1.75} aria-hidden /> : null}
      {prazo.texto}
      {prazo.titulo ? <span className="sr-only">. {prazo.titulo}</span> : null}
    </span>
  );
}
