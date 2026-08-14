"use client";

import { formatCentsBRL } from "@/lib/finance/money";
import type { FinanceEntry } from "@/types/database";

// Contagem + lista de pendentes (spec 8.10). Clicar num pendente abre o
// mesmo formulário de edição do lançamento — marcar emissão é preencher
// número/data/arquivo lá, sem duplicar UI.
export function InvoiceSummary({
  entries,
  onOpen,
}: {
  entries: FinanceEntry[];
  onOpen: (entry: FinanceEntry) => void;
}) {
  const relevant = entries.filter(
    (e) => e.needs_invoice && e.status !== "cancelado"
  );
  if (relevant.length === 0) return null;

  const emitidas = relevant.filter((e) => e.invoice_number);
  const pendentes = relevant.filter((e) => !e.invoice_number);

  return (
    <div className="border-line bg-card flex flex-col gap-2 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-fg-secondary text-[length:var(--text-small-size)] font-medium">
          Notas fiscais
        </h3>
        <span className="text-fg-muted text-[length:var(--text-caption-size)]">
          {emitidas.length} emitida{emitidas.length === 1 ? "" : "s"} ·{" "}
          {pendentes.length} pendente
          {pendentes.length === 1 ? "" : "s"}
        </span>
      </div>

      {pendentes.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {pendentes.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onOpen(e)}
                className="hover:bg-hover flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)]"
              >
                <span className="text-fg truncate">{e.description}</span>
                <span className="tnum text-fg-muted">
                  {formatCentsBRL(e.amount_cents)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Todas emitidas neste mês
        </p>
      )}
    </div>
  );
}
