"use client";

import { IconChevronRight } from "@tabler/icons-react";

import { JANELA_DE_ATENCAO, type RiscoDePrazo } from "@/lib/reports/overview";

/**
 * O retrato do risco AGORA — não do período.
 *
 * O donut mostra só as demandas COM PRAZO. As sem prazo aparecem embaixo,
 * numa linha própria: elas não estão "no prazo", estão sem prazo, e somá-las
 * ao verde inventaria tranquilidade. Num quadro onde metade não tem data
 * combinada, quem lê precisa saber que o gráfico fala da outra metade.
 */

const RAIO = 52;
const ESPESSURA = 14;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

type Fatia = {
  chave: keyof Pick<RiscoDePrazo, "noPrazo" | "emAtencao" | "atrasadas">;
  rotulo: string;
  cor: string;
  valor: number;
};

export function DeadlineRiskCard({
  risco,
  onVerRisco,
  onVerFatia,
}: {
  risco: RiscoDePrazo;
  onVerRisco: () => void;
  onVerFatia?: (chave: Fatia["chave"]) => void;
}) {
  const fatias: Fatia[] = [
    {
      chave: "noPrazo",
      rotulo: "no prazo",
      cor: "var(--chart-1)",
      valor: risco.noPrazo,
    },
    {
      chave: "emAtencao",
      rotulo: "em atenção",
      cor: "var(--status-due-soon-fg)",
      valor: risco.emAtencao,
    },
    {
      chave: "atrasadas",
      rotulo: "atrasadas",
      cor: "var(--status-overdue-fg)",
      valor: risco.atrasadas,
    },
  ];

  if (risco.comPrazo === 0 && risco.semPrazo === 0) {
    return (
      <p className="text-fg-secondary py-8 text-center text-[length:var(--text-small-size)]">
        Nenhuma demanda aberta no momento.
      </p>
    );
  }

  if (risco.comPrazo === 0) {
    return (
      <div className="flex flex-col gap-3 py-6 text-center">
        <p className="text-fg-secondary text-[length:var(--text-small-size)]">
          Nenhuma das {risco.semPrazo} demandas abertas tem prazo definido — não
          há risco de prazo a calcular.
        </p>
      </div>
    );
  }

  // Arcos consecutivos sobre um círculo único: cada um começa onde o
  // anterior parou.
  let acumulado = 0;
  const arcos = fatias.map((f) => {
    const fracao = f.valor / risco.comPrazo;
    const arco = {
      ...f,
      dash: fracao * CIRCUNFERENCIA,
      offset: -acumulado * CIRCUNFERENCIA,
    };
    acumulado += fracao;
    return arco;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-center gap-6 @sm:justify-start">
        <svg
          viewBox="0 0 140 140"
          className="h-32 w-32 shrink-0"
          role="img"
          aria-label={`${risco.comPrazo} ${risco.comPrazo === 1 ? "demanda aberta" : "demandas abertas"} com prazo: ${fatias
            .map((f) => `${f.valor} ${f.rotulo}`)
            .join(", ")}.`}
        >
          <circle
            cx={70}
            cy={70}
            r={RAIO}
            fill="none"
            stroke="var(--chart-grid)"
            strokeWidth={ESPESSURA}
          />
          {arcos.map((a) =>
            a.valor > 0 ? (
              <circle
                key={a.chave}
                cx={70}
                cy={70}
                r={RAIO}
                fill="none"
                stroke={a.cor}
                strokeWidth={ESPESSURA}
                strokeDasharray={`${a.dash} ${CIRCUNFERENCIA - a.dash}`}
                strokeDashoffset={a.offset}
                // Começa no topo, e não às 3 horas.
                transform="rotate(-90 70 70)"
                strokeLinecap="butt"
              />
            ) : null
          )}
          <text
            x={70}
            y={68}
            textAnchor="middle"
            className="tnum"
            fontSize={26}
            fontWeight={700}
            fill="var(--text-primary)"
          >
            {risco.comPrazo}
          </text>
          <text
            x={70}
            y={86}
            textAnchor="middle"
            fontSize={10}
            fill="var(--text-muted)"
          >
            com prazo
          </text>
        </svg>

        <ul className="flex min-w-0 flex-col gap-2">
          {fatias.map((f) => {
            const conteudo = (
              <>
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: f.cor }}
                />
                <span
                  className="tnum text-[length:var(--text-h3-size)] font-semibold"
                  style={{ color: f.valor > 0 ? f.cor : "var(--text-muted)" }}
                >
                  {f.valor}
                </span>
                {/* O espaço é EXPLÍCITO: o vão visual é `gap` do flex, e
                    sem ele o texto acessível vira "1atrasadas". */}
                <span className="text-fg-secondary text-[length:var(--text-small-size)]">
                  {" "}
                  {f.rotulo}
                </span>
              </>
            );
            return (
              <li key={f.chave}>
                {onVerFatia && f.valor > 0 ? (
                  <button
                    type="button"
                    onClick={() => onVerFatia(f.chave)}
                    aria-label={`Ver as ${f.valor} demandas ${f.rotulo}`}
                    className="hover:bg-hover -mx-2 flex items-center gap-2 rounded-sm px-2 py-0.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  >
                    {conteudo}
                  </button>
                ) : (
                  <span className="flex items-center gap-2 py-0.5">
                    {conteudo}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-fg-muted text-[length:var(--text-caption-size)]">
        &ldquo;Em atenção&rdquo; é o que vence nos próximos {JANELA_DE_ATENCAO}{" "}
        dias.
        {risco.semPrazo > 0 ? (
          <>
            {" "}
            Outras <strong className="text-fg-secondary">
              {risco.semPrazo}
            </strong>{" "}
            demandas abertas não têm prazo e ficam fora desta conta.
          </>
        ) : null}
      </p>

      <button
        type="button"
        onClick={onVerRisco}
        className="border-line text-fg-link hover:bg-hover group inline-flex items-center justify-center gap-1.5 rounded-sm border px-3 py-2 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      >
        Ver demandas em risco
        <IconChevronRight
          size={16}
          stroke={1.75}
          aria-hidden
          className="transition-transform [transition-duration:var(--dur-fast)] group-hover:translate-x-0.5"
        />
      </button>
    </div>
  );
}
