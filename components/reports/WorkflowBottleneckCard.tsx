"use client";

import { IconHourglassHigh } from "@tabler/icons-react";

import { InfoHint } from "@/components/ui/InfoHint";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  etapaQueMaisSegura,
  SEM_ETAPA,
  type EtapaDoFluxo,
} from "@/lib/reports/gargalos";

import { formatarDias } from "./formatarDias";

/**
 * Onde o trabalho está parado.
 *
 * As etapas são as COLUNAS REAIS do quadro de cada setor — o TAFLOW deixa
 * cada um desenhar o próprio fluxo, então "Em aprovação" existe se alguém
 * criou essa coluna. Nenhum status é inventado aqui.
 *
 * **O destaque olha a ESPERA, não a quantidade.** Uma etapa com dez
 * demandas que chegaram hoje não é gargalo; uma com três paradas há duas
 * semanas é. E ele só aparece quando uma etapa se destaca de verdade:
 * anunciar "34%" onde há três etapas com um terço cada seria apontar um
 * culpado sorteado.
 */
export function WorkflowBottleneckCard({
  etapas,
  semHistorico,
  totalAbertas,
  carregando,
  erro,
  onTentarDeNovo,
  onVerEtapa,
}: {
  etapas: EtapaDoFluxo[];
  semHistorico: number;
  totalAbertas: number;
  carregando: boolean;
  erro: boolean;
  onTentarDeNovo: () => void;
  onVerEtapa?: (etapa: EtapaDoFluxo) => void;
}) {
  if (carregando) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="block" className="h-6" />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex flex-col items-start gap-3 py-4">
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Não foi possível carregar as etapas do fluxo.
        </p>
        <button
          type="button"
          onClick={onTentarDeNovo}
          className="border-line text-fg-link hover:bg-hover rounded-sm border px-3 py-1.5 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (etapas.length === 0) {
    return (
      <p className="text-fg-secondary py-8 text-center text-[length:var(--text-small-size)]">
        Nenhuma demanda aberta — não há nada parado no fluxo.
      </p>
    );
  }

  // Tudo fora do quadro. Listar um balde "Sem etapa" e chamá-lo de gargalo
  // não ajudaria ninguém: o problema aqui não é onde o trabalho para, é que
  // ele ainda não entrou no fluxo. Foi o que os dados reais mostraram em
  // 3/set/2026 — três demandas abertas, nenhuma numa coluna.
  if (etapas.length === 1 && etapas[0].chave === SEM_ETAPA) {
    return (
      <div className="flex flex-col gap-2 py-6 text-center">
        <p className="text-fg text-[length:var(--text-small-size)] font-medium">
          As {etapas[0].quantidade} demandas abertas ainda não estão numa
          coluna do quadro.
        </p>
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          As etapas deste relatório são as colunas dos seus quadros. Arraste as
          demandas para a coluna em que elas estão e este cartão passa a mostrar
          onde o trabalho trava.
        </p>
      </div>
    );
  }

  const maior = Math.max(...etapas.map((e) => e.quantidade), 1);
  const destaque = etapaQueMaisSegura(etapas);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1.5">
        {etapas.map((e) => {
          const eOGargalo = destaque?.etapa.chave === e.chave;
          const cor = eOGargalo
            ? "var(--status-due-soon-fg)"
            : "var(--chart-grid)";

          const linha = (
            <>
              <span className="text-fg-secondary min-w-0 flex-1 truncate text-left text-[length:var(--text-small-size)]">
                {e.nome}
              </span>
              <span
                className="tnum w-6 shrink-0 text-right text-[length:var(--text-small-size)] font-medium"
                style={{
                  color: eOGargalo
                    ? "var(--status-due-soon-fg)"
                    : "var(--text-primary)",
                }}
              >
                {e.quantidade}
              </span>
              <span
                aria-hidden
                className="bg-sunken h-1.5 w-24 shrink-0 overflow-hidden rounded-full @md:w-32"
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(e.quantidade / maior) * 100}%`,
                    background: eOGargalo
                      ? "var(--status-due-soon-fg)"
                      : "var(--surface-strong, var(--chart-crosshair))",
                    minWidth: e.quantidade > 0 ? "3px" : 0,
                  }}
                />
              </span>
              <span className="text-fg-muted tnum w-16 shrink-0 text-right text-[length:var(--text-caption-size)]">
                {e.diasMedios === null ? "—" : formatarDias(e.diasMedios)}
              </span>
            </>
          );

          const descricao = `${e.nome}: ${e.quantidade} ${
            e.quantidade === 1 ? "demanda parada" : "demandas paradas"
          }, ${Math.round(e.proporcao * 100)}% das abertas${
            e.diasMedios !== null ? `, há ${e.diasMedios} dias em média` : ""
          }.`;

          return (
            <li key={e.chave}>
              {onVerEtapa && e.chave !== SEM_ETAPA && e.quantidade > 0 ? (
                <button
                  type="button"
                  onClick={() => onVerEtapa(e)}
                  aria-label={descricao}
                  className="hover:bg-hover -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-sm px-2 py-1 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  style={{ borderColor: cor }}
                >
                  {linha}
                </button>
              ) : (
                <span
                  className="flex items-center gap-3 py-1"
                  aria-label={descricao}
                >
                  {linha}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {destaque ? (
        <p
          className="flex items-start gap-2 rounded-sm px-3 py-2 text-[length:var(--text-small-size)]"
          style={{
            background: "var(--status-due-soon-bg)",
            color: "var(--status-due-soon-fg)",
          }}
        >
          <IconHourglassHigh
            size={16}
            stroke={1.75}
            aria-hidden
            className="mt-0.5 shrink-0"
          />
          <span>
            A etapa &ldquo;{destaque.etapa.nome}&rdquo; concentra{" "}
            {Math.round(destaque.fatia * 100)}% da espera acumulada.
          </span>
        </p>
      ) : null}

      <p className="text-fg-muted flex items-center gap-1.5 text-[length:var(--text-caption-size)]">
        Tempo parado na etapa atual, das {totalAbertas} demandas abertas.
        <InfoHint
          label="Como o tempo por etapa é calculado"
          text={
            `Conta desde a última vez que a demanda entrou na coluna em que está. ` +
            (semHistorico > 0
              ? `Para ${semHistorico} ${semHistorico === 1 ? "demanda que nunca mudou" : "demandas que nunca mudaram"} de coluna, conta desde a criação — o histórico só registra movimentações. ` +
                `É a espera acumulada agora, não o tempo total já gasto em cada etapa.`
              : `É a espera acumulada agora, não o tempo total já gasto em cada etapa.`)
          }
        />
      </p>
    </div>
  );
}
