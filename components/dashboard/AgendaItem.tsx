"use client";

import { IconChevronRight } from "@tabler/icons-react";

import { StatusChip } from "@/components/ui/StatusChip";
import type { UpcomingDelivery } from "@/lib/dashboard/trends";
import type { Sector } from "@/types/database";

const STATE_META: Record<
  UpcomingDelivery["state"],
  { label: string; tone: string }
> = {
  concluida: { label: "Concluída", tone: "var(--status-done-fg)" },
  atrasada: { label: "Atrasada", tone: "var(--status-overdue-fg)" },
  andamento: { label: "Em andamento", tone: "var(--chart-1)" },
  pendente: { label: "Pendente", tone: "var(--tone-rose)" },
};

/**
 * Linha da agenda: horário, título, setor e situação. O hover é discreto —
 * fundo azul muito suave e 1px de elevação, nada de escala.
 */
export function AgendaItem({
  delivery,
  sector,
  onOpen,
}: {
  delivery: UpcomingDelivery;
  sector?: Sector;
  onOpen: () => void;
}) {
  const { task, time, state } = delivery;
  const meta = STATE_META[state];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group hover:border-line hover:bg-hover flex w-full items-center gap-3 rounded-sm border border-transparent px-2 py-2.5 text-left transition-[background-color,transform,box-shadow,border-color] [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-out)] hover:-translate-y-px hover:shadow-[var(--shadow-peek)]"
    >
      <span className="tnum bg-sunken text-fg-secondary inline-flex h-7 shrink-0 items-center rounded-xs px-2 text-[length:var(--text-caption-size)] font-medium">
        {time ?? "dia"}
      </span>

      <span
        className={`min-w-0 flex-1 truncate text-[length:var(--text-small-size)] ${
          state === "concluida" ? "text-done line-through" : "text-fg"
        }`}
      >
        {task.title}
      </span>

      {sector ? (
        <span className="hidden shrink-0 lg:inline-flex">
          <StatusChip label={sector.name} tone={sector.color} />
        </span>
      ) : null}

      <span className="hidden shrink-0 sm:inline-flex">
        <StatusChip label={meta.label} tone={meta.tone} variant="dot" />
      </span>

      <IconChevronRight
        size={16}
        stroke={1.75}
        aria-hidden
        className="text-fg-muted shrink-0 opacity-0 transition-opacity [transition-duration:var(--dur-fast)] group-hover:opacity-100"
      />
    </button>
  );
}
