"use client";

import { useMemo, useState } from "react";

import { Select } from "@/components/ui/Select";
import { formatCentsBRL } from "@/lib/finance/money";
import {
  agrupar,
  type Classificacao,
  type Lancamento,
  type Recorte,
} from "@/lib/finance/profitability";
import { useClients } from "@/lib/queries/useClients";
import { useFinanceEntries } from "@/lib/queries/useFinance";
import {
  paraPrecos,
  useApontamentosClassificados,
  useFinanceRates,
} from "@/lib/queries/useProfitability";
import { useProjects } from "@/lib/queries/useProjects";
import { useSectors } from "@/lib/queries/useSectors";
import { useWorkspace } from "@/lib/queries/useWorkspace";

import { RateEditor } from "./RateEditor";

/**
 * Rentabilidade por cliente, projeto ou setor (0081).
 *
 * A tela existe para responder "este cliente dá lucro?", e a resposta só
 * vale se ela for honesta sobre o que entrou na conta. Por isso o aviso de
 * horas sem preço não é rodapé decorativo: sem ele, uma margem calculada
 * ignorando o trabalho parece uma margem completa.
 */

const RECORTES: { value: Recorte; label: string }[] = [
  { value: "cliente", label: "Por cliente" },
  { value: "projeto", label: "Por projeto" },
  { value: "setor", label: "Por setor" },
];

const SEM: Record<Recorte, string> = {
  cliente: "Sem cliente",
  projeto: "Sem projeto",
  setor: "Sem setor",
};

function horas(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export function ProfitabilitySection() {
  const workspace = useWorkspace();
  const [recorte, setRecorte] = useState<Recorte>("cliente");

  const { data: entries = [] } = useFinanceEntries(workspace.id);
  const { data: apontamentos = [] } = useApontamentosClassificados(workspace.id);
  const { data: rates = [] } = useFinanceRates(workspace.id);
  const { data: clients = [] } = useClients(workspace.id);
  const { data: projects = [] } = useProjects(workspace.id);
  const { data: sectors = [] } = useSectors(workspace.id);

  const nomePorChave = useMemo(() => {
    const fonte =
      recorte === "cliente" ? clients : recorte === "projeto" ? projects : sectors;
    return new Map(fonte.map((x) => [x.id, x.name]));
  }, [recorte, clients, projects, sectors]);

  const linhas = useMemo(() => {
    const lancamentos: (Lancamento & Classificacao)[] = entries.map((e) => ({
      kind: e.kind,
      status: e.status,
      amountCents: e.amount_cents,
      clientId: e.client_id,
      projectId: e.project_id,
      sectorId: e.sector_id,
    }));
    return agrupar(lancamentos, apontamentos, paraPrecos(rates), recorte);
  }, [entries, apontamentos, rates, recorte]);

  const minutosSemPreco = linhas.reduce(
    (s, l) => s + l.resultado.minutosSemPreco,
    0
  );
  const temPreco = rates.length > 0;

  return (
    <section className="border-line bg-card flex flex-col gap-4 rounded-md border p-[var(--space-card-pad)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-fg text-[length:var(--text-h3-size)] font-semibold">
            Rentabilidade
          </h2>
          <p className="text-fg-secondary text-[length:var(--text-small-size)]">
            Só lançamentos confirmados. Previsto fica de fora da margem.
          </p>
        </div>
        <Select
          options={RECORTES}
          value={recorte}
          onValueChange={(v) => setRecorte(v as Recorte)}
          aria-label="Agrupar por"
        />
      </div>

      <RateEditor />

      {/* O aviso vem ANTES da tabela, de propósito: quem lê o número primeiro
          e a ressalva depois já decidiu. */}
      {!temPreco ? (
        <p
          role="status"
          className="bg-sunken text-fg-secondary rounded-sm p-3 text-[length:var(--text-small-size)]"
        >
          A margem abaixo conta <strong>só dinheiro</strong> — o custo das
          horas trabalhadas não entra. Cadastre um valor por hora acima para
          incluí-lo.
        </p>
      ) : minutosSemPreco > 0 ? (
        <p
          role="status"
          className="bg-sunken text-fg-secondary rounded-sm p-3 text-[length:var(--text-small-size)]"
        >
          <strong>{horas(minutosSemPreco)}</strong> apontadas por pessoas sem
          valor por hora não entraram no custo.
        </p>
      ) : null}

      {linhas.length === 0 ? (
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Nenhum lançamento ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-fg-muted text-[length:var(--text-caption-size)] tracking-wide uppercase">
                <th className="px-3 py-2 font-medium">
                  {recorte === "cliente"
                    ? "Cliente"
                    : recorte === "projeto"
                      ? "Projeto"
                      : "Setor"}
                </th>
                <th className="px-3 py-2 text-right font-medium">Receita</th>
                <th className="px-3 py-2 text-right font-medium">Custo direto</th>
                <th className="px-3 py-2 text-right font-medium">Horas</th>
                <th className="px-3 py-2 text-right font-medium">Margem</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const negativa = l.resultado.margemCents < 0;
                return (
                  <tr
                    key={l.chave ?? "__sem__"}
                    className="border-line border-b last:border-0"
                  >
                    <td className="text-fg px-3 py-2 text-[length:var(--text-small-size)]">
                      {l.chave
                        ? (nomePorChave.get(l.chave) ?? "—")
                        : SEM[recorte]}
                    </td>
                    <td className="text-fg-secondary px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                      {formatCentsBRL(l.resultado.receitaCents)}
                    </td>
                    <td className="text-fg-secondary px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                      {formatCentsBRL(l.resultado.custoDiretoCents)}
                    </td>
                    <td className="text-fg-secondary px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                      {formatCentsBRL(l.resultado.custoDeHorasCents)}
                    </td>
                    {/* Verde só em dado financeiro positivo — é a regra de
                        cor do projeto, e margem é exatamente esse caso. */}
                    <td
                      className="px-3 py-2 text-right text-[length:var(--text-small-size)] font-medium tabular-nums"
                      style={{
                        color: negativa
                          ? "var(--negative)"
                          : "var(--positive-strong)",
                      }}
                    >
                      {formatCentsBRL(l.resultado.margemCents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
