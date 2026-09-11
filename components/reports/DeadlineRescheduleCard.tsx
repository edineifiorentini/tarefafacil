"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import type { ReprogramacoesDoPeriodo } from "@/lib/reports/reprogramacoes";
import { rotuloDoMotivo } from "@/lib/tarefas/reprogramacao";

/**
 * Pontualidade nos dois prazos, e por que os prazos mudaram (0099).
 *
 * **Os dois números lado a lado são o ponto.** "No prazo combinado" conta o
 * prazo atual, depois das reprogramações; "no prazo original" não perdoa
 * nenhuma. A distância entre eles é quanto da pontualidade veio de
 * renegociar a data — e ela só aparece com os dois juntos. Aprovado pelo
 * dono em 11/set/2026, a partir do protótipo.
 *
 * A base é a mesma nos dois, e é dita: só entra entrega que tinha prazo.
 */
export function DeadlineRescheduleCard({
  base,
  noPrazo,
  noPrazoOriginal,
  pontual,
  pontualOriginal,
  reprogramacoes,
  carregando,
  erro,
  onTentarDeNovo,
}: {
  /** Entregas do período que tinham prazo — a base dos dois números. */
  base: number;
  noPrazo: number;
  noPrazoOriginal: number;
  pontual: number | null;
  pontualOriginal: number | null;
  reprogramacoes: ReprogramacoesDoPeriodo | undefined;
  carregando: boolean;
  erro: boolean;
  onTentarDeNovo: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 @3xl:flex-row @3xl:gap-8">
      <div className="flex flex-col gap-3 @3xl:w-96 @3xl:shrink-0">
        <div className="grid grid-cols-2 gap-2.5">
          <Numero
            nome="No prazo combinado"
            taxa={pontual}
            dentro={noPrazo}
            base={base}
          />
          <Numero
            nome="No prazo original"
            taxa={pontualOriginal}
            dentro={noPrazoOriginal}
            base={base}
          />
        </div>
        <p className="text-fg-muted text-[length:var(--text-caption-size)]">
          {explicacao(base, noPrazo, noPrazoOriginal, pontual, pontualOriginal)}{" "}
          Pontualidade conta só as entregas que tinham prazo.
        </p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <h3 className="text-fg flex flex-wrap items-baseline justify-between gap-x-3 text-[length:var(--text-small-size)] font-medium">
          Reprogramações por motivo
          {reprogramacoes && reprogramacoes.total > 0 ? (
            <span className="text-fg-muted tnum font-normal">
              {`${reprogramacoes.total} ${reprogramacoes.total === 1 ? "reprogramação" : "reprogramações"} em ${reprogramacoes.demandas} ${reprogramacoes.demandas === 1 ? "demanda" : "demandas"}`}
            </span>
          ) : null}
        </h3>
        <Motivos
          reprogramacoes={reprogramacoes}
          carregando={carregando}
          erro={erro}
          onTentarDeNovo={onTentarDeNovo}
        />
      </div>
    </div>
  );
}

/**
 * A frase conta ENTREGAS, não pontos percentuais arredondados: com 300
 * entregas, uma salva pela reprogramação some no arredondamento, e dizer
 * "nenhuma dependeu" seria falso.
 */
function explicacao(
  base: number,
  noPrazo: number,
  noPrazoOriginal: number,
  pontual: number | null,
  pontualOriginal: number | null
): string {
  if (base === 0) {
    return "Nenhuma entrega do período tinha prazo, então não há pontualidade a comparar.";
  }
  const salvas = noPrazo - noPrazoOriginal;
  if (salvas === 0) {
    return "Nenhuma entrega do período dependeu de reprogramação para ficar no prazo.";
  }
  if (salvas < 0) {
    return "Houve prazo antecipado e não cumprido: no prazo original, a pontualidade seria maior.";
  }
  const quantas =
    salvas === 1 ? "1 entrega só ficou" : `${salvas} entregas só ficaram`;
  const pontos =
    pontual !== null && pontualOriginal !== null
      ? pontual - pontualOriginal
      : 0;
  return pontos > 0
    ? `${quantas} no prazo porque o prazo mudou: ${pontos} p.p. da pontualidade vieram de reprogramações.`
    : `${quantas} no prazo porque o prazo mudou.`;
}

function Numero({
  nome,
  taxa,
  dentro,
  base,
}: {
  nome: string;
  taxa: number | null;
  dentro: number;
  base: number;
}) {
  return (
    <div className="bg-sunken flex flex-col gap-0.5 rounded-md px-3.5 py-3">
      {/* "—" e não 0%: sem entrega com prazo, não existe pontualidade. */}
      <span className="text-fg tnum text-[length:var(--text-h1-size)] leading-[var(--text-h1-line)] font-semibold">
        {taxa === null ? "—" : `${taxa}%`}
      </span>
      <span className="text-fg text-[length:var(--text-small-size)] font-medium">
        {nome}
      </span>
      <span className="text-fg-muted tnum text-[length:var(--text-caption-size)]">
        {base > 0
          ? `${dentro} de ${base} ${base === 1 ? "entrega" : "entregas"}`
          : "Sem entrega com prazo"}
      </span>
    </div>
  );
}

function Motivos({
  reprogramacoes,
  carregando,
  erro,
  onTentarDeNovo,
}: {
  reprogramacoes: ReprogramacoesDoPeriodo | undefined;
  carregando: boolean;
  erro: boolean;
  onTentarDeNovo: () => void;
}) {
  if (carregando) {
    return (
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="block" className="h-5" />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex flex-col items-start gap-3 py-2">
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Não foi possível carregar as reprogramações do período.
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

  if (!reprogramacoes || reprogramacoes.total === 0) {
    return (
      <p className="text-fg-secondary py-4 text-[length:var(--text-small-size)]">
        Nenhum prazo foi reprogramado neste período.
      </p>
    );
  }

  const maior = Math.max(...reprogramacoes.porMotivo.map((m) => m.total), 1);

  return (
    <ul className="flex flex-col gap-2">
      {reprogramacoes.porMotivo.map((m) => (
        <li
          key={m.motivo}
          className="grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)_2rem] items-center gap-2.5 text-[length:var(--text-small-size)]"
        >
          <span className="text-fg-secondary leading-snug">
            {rotuloDoMotivo(m.motivo)}
            {/* Sem a pausa, o leitor de tela lê "cliente2". */}
            <span className="sr-only">: </span>
          </span>
          <span
            aria-hidden
            className="bg-sunken h-2 overflow-hidden rounded-full"
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: `${(m.total / maior) * 100}%`,
                background: "var(--chart-1)",
              }}
            />
          </span>
          <span className="text-fg tnum text-right font-medium">{m.total}</span>
        </li>
      ))}
    </ul>
  );
}
