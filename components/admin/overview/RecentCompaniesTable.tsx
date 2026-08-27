import Link from "next/link";

import { StatusChip } from "@/components/ui/StatusChip";
import type { EmpresaResumo } from "@/lib/admin/companies";
import { STATUS_META } from "@/lib/admin/status";
import { formatCentsBRL } from "@/lib/finance/money";
import { tempoRelativo } from "@/lib/utils/relative-time";

/**
 * Empresas recentes (especificação 8.7).
 *
 * Tabela de verdade — `<table>` com `<th scope="col">`, não uma grade de
 * divs: leitor de tela precisa anunciar "Plano, Pro" ao andar pelas células.
 *
 * A rolagem horizontal fica presa a este contêiner. A página nunca rola de
 * lado (especificação 27).
 *
 * As ações por linha (alterar plano, reenviar acesso, suspender) moram na
 * página de Empresas, onde existe o diálogo de ação sensível com motivo e
 * auditoria. Aqui a linha inteira é um link para o detalhe: um menu de ações
 * que abre outra tela é um clique a mais para o mesmo lugar.
 */
export function RecentCompaniesTable({
  empresas,
}: {
  empresas: EmpresaResumo[];
}) {
  return (
    <section
      aria-labelledby="empresas-recentes"
      className="border-line bg-card overflow-hidden rounded-md border shadow-[var(--shadow-card)]"
    >
      <div className="flex items-center justify-between gap-3 p-[var(--space-card-pad)] pb-3">
        <h2
          id="empresas-recentes"
          className="text-fg text-[length:var(--text-h3-size)] font-semibold"
        >
          Empresas recentes
        </h2>
        <Link
          href="/admin/empresas"
          className="text-fg-link rounded-sm text-[length:var(--text-small-size)] outline-none hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          Ver todas
        </Link>
      </div>

      {empresas.length === 0 ? (
        <p className="text-fg-muted px-[var(--space-card-pad)] pb-6 text-[length:var(--text-small-size)]">
          Nenhuma empresa cadastrada ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse">
            <thead>
              <tr className="border-line border-y">
                {[
                  "Empresa",
                  "Responsável",
                  "Status",
                  "Plano",
                  "Membros",
                  "Último acesso",
                  "Receita",
                ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="text-fg-muted px-4 py-2 text-left text-[length:var(--text-caption-size)] font-medium tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresas.map((e) => (
                <tr
                  key={e.id}
                  className="border-line hover:bg-hover border-b last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/empresas/${e.id}`}
                      className="text-fg rounded-sm font-medium outline-none hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                    >
                      {e.nome}
                    </Link>
                    {e.origem ? (
                      <span className="text-fg-muted block text-[length:var(--text-caption-size)]">
                        via {e.origem}
                      </span>
                    ) : null}
                  </td>
                  <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                    {e.responsavel ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip
                      label={STATUS_META[e.status].label}
                      tone={STATUS_META[e.status].tone}
                    />
                  </td>
                  <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                    {e.planoNome ?? "—"}
                  </td>
                  <td className="tnum text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                    {e.membros}
                    <span className="text-fg-muted"> de {e.seatLimit}</span>
                  </td>
                  <td className="text-fg-secondary px-4 py-3 text-[length:var(--text-small-size)]">
                    {tempoRelativo(e.ultimoAcesso)}
                  </td>
                  <td className="tnum text-fg px-4 py-3 text-[length:var(--text-small-size)]">
                    {formatCentsBRL(e.mrrCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
