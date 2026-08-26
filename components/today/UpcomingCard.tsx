"use client";

import { IconCalendar, IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PROXIMOS_DIAS } from "@/lib/today/summary";

/**
 * Faixa dos próximos dias, abaixo do bloco principal.
 *
 * O estado vazio é compacto de propósito. Ilustração grande num painel de
 * trabalho diário ocupa a dobra inteira para dizer "não há nada" — e quem
 * abre esta tela dez vezes por dia vê isso dez vezes. Ícone pequeno, duas
 * linhas e uma saída.
 */
export function UpcomingCard({
  count,
  children,
}: {
  count: number;
  /** As linhas de demanda, quando houver. */
  children?: ReactNode;
}) {
  return (
    <section className="border-line bg-card flex flex-col gap-4 rounded-md border p-[var(--space-card-pad)] shadow-[var(--shadow-card)]">
      <div className="flex items-baseline gap-2">
        <h2 className="text-fg text-[length:var(--text-h3-size)] font-medium">
          Próximos dias
        </h2>
        {count > 0 ? (
          <span className="tnum text-fg-muted text-[length:var(--text-small-size)]">
            {count}
          </span>
        ) : null}
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span
            aria-hidden
            className="bg-selected text-fg-link inline-flex h-11 w-11 items-center justify-center rounded-full"
          >
            <IconCalendar size={20} stroke={1.75} />
          </span>
          <p className="text-fg font-medium">
            Nenhuma demanda nos próximos dias
          </p>
          <p className="text-fg-secondary text-[length:var(--text-small-size)]">
            Quando houver novos prazos, eles aparecerão aqui.
          </p>
          <Link
            href="/calendario"
            className="text-fg-link mt-1 inline-flex items-center gap-1 rounded-sm text-[length:var(--text-small-size)] underline outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            Abrir calendário
            <IconChevronRight size={14} stroke={1.75} aria-hidden />
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col">{children}</div>
          <p className="text-fg-muted text-[length:var(--text-caption-size)]">
            Prazos dos próximos {PROXIMOS_DIAS} dias
          </p>
        </>
      )}
    </section>
  );
}
