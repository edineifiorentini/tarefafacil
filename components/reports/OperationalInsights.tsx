"use client";

import {
  IconAlertTriangle,
  IconArrowRight,
  IconExclamationCircle,
  IconInfoCircle,
} from "@tabler/icons-react";

import type { DrillDoInsight, Insight } from "@/lib/reports/insights";

/**
 * Até três frases, cada uma sustentada por um número que está na tela.
 *
 * **Nada aparece quando a operação está saudável** — e isso é a decisão
 * mais importante deste componente. "Tudo em dia" ocupando o mesmo lugar de
 * "4 demandas atrasadas" ensina quem lê a passar os olhos pela área inteira,
 * e no dia em que houver um alerta de verdade ele será pulado junto.
 */

const VISUAL = {
  critico: {
    icone: IconExclamationCircle,
    cor: "var(--status-overdue-fg)",
    fundo: "var(--status-overdue-bg)",
  },
  atencao: {
    icone: IconAlertTriangle,
    cor: "var(--status-due-soon-fg)",
    fundo: "var(--status-due-soon-bg)",
  },
  neutro: {
    icone: IconInfoCircle,
    cor: "var(--text-secondary)",
    fundo: "var(--surface-sunken)",
  },
} as const;

export function OperationalInsights({
  insights,
  onDrill,
}: {
  insights: Insight[];
  onDrill: (d: DrillDoInsight) => void;
}) {
  if (insights.length === 0) return null;

  return (
    <ul
      aria-label="Pontos de atenção da operação"
      className="grid gap-[var(--space-block-gap)] sm:grid-cols-2 xl:grid-cols-3"
    >
      {insights.map((i, indice) => {
        const { icone: Icone, cor, fundo } = VISUAL[i.tom];
        return (
          <li
            key={i.id}
            className="lp-reveal border-line bg-card flex items-start gap-3 rounded-md border p-3"
            style={{
              // Entrada escalonada e discreta, uma vez só. O bloco global de
              // `prefers-reduced-motion` já a desliga.
              transitionDelay: `${indice * 50}ms`,
            }}
          >
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm"
              style={{ background: fundo, color: cor }}
            >
              <Icone size={16} stroke={1.75} />
            </span>

            <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
              <p className="text-fg text-[length:var(--text-small-size)]">
                {i.texto}
              </p>
              {i.acao ? (
                <button
                  type="button"
                  onClick={() => onDrill(i.acao!.drill)}
                  className="text-fg-link group inline-flex items-center gap-1 rounded-xs text-[length:var(--text-caption-size)] outline-none hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                >
                  {i.acao.rotulo}
                  <IconArrowRight
                    size={13}
                    stroke={2}
                    aria-hidden
                    className="transition-transform [transition-duration:var(--dur-fast)] group-hover:translate-x-0.5"
                  />
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
