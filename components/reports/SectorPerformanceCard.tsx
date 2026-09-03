"use client";

import { Select } from "@/components/ui/Select";
import type { LinhaDeSetor, OrdemDeSetor } from "@/lib/reports/setores";

import { formatarDias } from "./formatarDias";
import { SaudeDoSetor } from "./SaudeDoSetor";

/**
 * O ranking dos setores, ordenado por quem precisa de atenção.
 *
 * **Não é um ranking de "melhor setor", e a ausência é deliberada.** Volume
 * e complexidade variam — o setor de Obras entrega quatro demandas grandes
 * enquanto a Administração entrega quinze pequenas, e uma coluna chamada
 * "desempenho" transformaria isso num veredito falso. As colunas dizem
 * fatos: quanto entrou, quanto saiu, quanto saiu no prazo, quanto demorou.
 *
 * Clicar num setor o aplica como filtro da tela inteira — é o caminho
 * natural de "este está ruim" para "por quê".
 */

const ORDENS: { value: OrdemDeSetor; label: string }[] = [
  { value: "atencao", label: "Precisa de atenção" },
  { value: "volume", label: "Maior volume" },
  { value: "entregues", label: "Mais entregues" },
  { value: "pontualidade", label: "Menor pontualidade" },
  { value: "atrasadas", label: "Mais atrasadas" },
  { value: "tempo", label: "Maior tempo médio" },
];

export function SectorPerformanceCard({
  linhas,
  nomes,
  cores,
  ordem,
  onOrdem,
  onSelecionarSetor,
  setorAtivo,
}: {
  linhas: LinhaDeSetor[];
  /** Mapas, e não funções: memoizados no pai, param de recriar a ordenação. */
  nomes: Map<string, string>;
  cores: Map<string, string>;
  ordem: OrdemDeSetor;
  onOrdem: (o: OrdemDeSetor) => void;
  onSelecionarSetor: (id: string) => void;
  setorAtivo?: string;
}) {
  const nomeDoSetor = (id: string) => nomes.get(id) ?? "Setor removido";
  const corDoSetor = (id: string) => cores.get(id) ?? "var(--chart-1)";

  if (linhas.length === 0) {
    return (
      <p className="text-fg-secondary py-8 text-center text-[length:var(--text-small-size)]">
        Nenhum setor teve movimento no período.
      </p>
    );
  }

  const maior = Math.max(...linhas.map((l) => l.ind.criadas), 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <div className="w-52">
          <Select
            options={ORDENS}
            value={ordem}
            onValueChange={(v) => onOrdem(v as OrdemDeSetor)}
            aria-label="Ordenar setores por"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* `relative`: ver a nota em SectorDetailTable. */}
        <table className="relative w-full text-left text-[length:var(--text-small-size)]">
          <caption className="sr-only">
            Desempenho por setor no período, ordenado por{" "}
            {ORDENS.find((o) => o.value === ordem)?.label}
          </caption>
          <thead className="text-fg-muted text-[length:var(--text-caption-size)]">
            <tr>
              <th scope="col" className="py-2 pr-3 font-medium">
                Setor
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Entregues / Criadas
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                No prazo
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Tempo médio
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const ativo = setorAtivo === l.sectorId;
              return (
                <tr
                  key={l.sectorId}
                  className={`border-line hover:bg-hover border-t transition-colors [transition-duration:var(--dur-fast)] ${
                    ativo ? "bg-sunken" : ""
                  }`}
                >
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      onClick={() => onSelecionarSetor(l.sectorId)}
                      aria-pressed={ativo}
                      className="flex max-w-44 items-center gap-2 rounded-xs text-left outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                    >
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: corDoSetor(l.sectorId) }}
                      />
                      <span className="text-fg truncate">
                        {nomeDoSetor(l.sectorId)}
                      </span>
                      <SaudeDoSetor saude={l.saude} compacto />
                    </button>
                  </td>

                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="bg-sunken h-1.5 w-20 shrink-0 overflow-hidden rounded-full @md:w-28"
                      >
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${(l.ind.criadas / maior) * 100}%`,
                            background: "var(--chart-grid)",
                          }}
                        >
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width:
                                l.ind.criadas > 0
                                  ? `${Math.min(100, (l.ind.entregues / l.ind.criadas) * 100)}%`
                                  : "0%",
                              background: "var(--chart-1)",
                            }}
                          />
                        </span>
                      </span>
                      <span className="tnum text-fg-secondary whitespace-nowrap">
                        {l.ind.entregues} / {l.ind.criadas}
                      </span>
                    </span>
                  </td>

                  <td className="tnum py-2 pr-3 text-right">
                    {l.pontualidade === null ? (
                      <span className="text-fg-muted">—</span>
                    ) : (
                      <span className="text-fg-secondary">
                        {l.pontualidade}%
                      </span>
                    )}
                  </td>

                  <td className="tnum text-fg-secondary py-2 text-right">
                    {l.ind.tempoMedioDias === null ? (
                      <span className="text-fg-muted">—</span>
                    ) : (
                      formatarDias(l.ind.tempoMedioDias)
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-fg-muted text-[length:var(--text-caption-size)]">
        Pontualidade conta só as entregas que tinham prazo. &ldquo;—&rdquo;
        significa que não houve entrega com prazo no período — não zero.
      </p>
    </div>
  );
}
