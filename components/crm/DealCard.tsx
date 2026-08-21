import { IconCalendarEvent, IconTrophy, IconX } from "@tabler/icons-react";

import { Avatar } from "@/components/ui/Avatar";
import { formatCentsBRL } from "@/lib/finance/money";
import type { Client, Deal } from "@/types/database";

/** Data curta: no card cabe "12 set", não "12 de setembro de 2026". */
function diaCurto(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

/**
 * Card da negociação no funil.
 *
 * Mostra o cliente antes do título: no funil a pergunta é "com quem estamos
 * falando", e o título costuma repetir o serviço.
 */
export function DealCard({
  deal,
  client,
  responsibleName,
  onOpen,
}: {
  deal: Deal;
  client?: Client;
  responsibleName?: string | null;
  onOpen: () => void;
}) {
  const fechada = deal.won_at !== null || deal.lost_at !== null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="tf-lift border-line bg-card hover:border-line-strong w-full rounded-md border p-3.5 text-left shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start gap-2">
        <p className="text-fg min-w-0 flex-1 text-[length:var(--text-small-size)] font-medium">
          {client?.fantasy_name || client?.name || "Sem cliente"}
        </p>
        {deal.won_at ? (
          <IconTrophy
            size={14}
            stroke={1.75}
            aria-label="Ganha"
            className="text-fg-muted mt-0.5 shrink-0"
          />
        ) : deal.lost_at ? (
          <IconX
            size={14}
            stroke={1.75}
            aria-label="Perdida"
            className="text-fg-muted mt-0.5 shrink-0"
          />
        ) : null}
      </div>

      <p className="text-fg-secondary mt-0.5 line-clamp-2 text-[length:var(--text-caption-size)]">
        {deal.title}
      </p>

      {deal.amount_cents !== null ? (
        <p
          className={`tnum mt-2 text-[length:var(--text-small-size)] font-semibold ${
            fechada ? "text-fg-muted" : "text-fg"
          }`}
        >
          {formatCentsBRL(deal.amount_cents)}
        </p>
      ) : null}

      {deal.expected_close_on || responsibleName ? (
        <div className="mt-2 flex items-center gap-2">
          {deal.expected_close_on ? (
            <span className="text-fg-muted inline-flex items-center gap-1 text-[length:var(--text-caption-size)]">
              <IconCalendarEvent size={13} stroke={1.75} aria-hidden />
              {diaCurto(deal.expected_close_on)}
            </span>
          ) : null}
          <span className="flex-1" />
          {responsibleName ? <Avatar name={responsibleName} size="sm" /> : null}
        </div>
      ) : null}
    </button>
  );
}
