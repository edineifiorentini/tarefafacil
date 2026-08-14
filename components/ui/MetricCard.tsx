import { Sparkline } from "@/components/charts/Sparkline";

import { IconTile } from "./IconTile";
import { TrendBadge } from "./TrendBadge";
import type { IconComponent } from "./types";

/**
 * Cartão de indicador da primeira linha do painel: ícone, título, valor,
 * tendência e micrográfico. Superfície sólida (não é vidro) — é dado, e
 * dado precisa de contraste estável.
 */
export function MetricCard({
  icon,
  label,
  value,
  tone,
  trend,
  trendUnit,
  trendInvert,
  trendLabel,
  series,
}: {
  icon: IconComponent;
  label: string;
  value: string;
  /** Token de cor da métrica (`var(--chart-1)`). */
  tone: string;
  trend?: number;
  trendUnit?: string;
  trendInvert?: boolean;
  trendLabel?: string;
  series?: number[];
}) {
  return (
    <article className="tf-lift border-line bg-card rounded-md border p-[var(--space-card-pad)] shadow-[var(--shadow-card)]">
      <div className="flex gap-4">
        <IconTile icon={icon} tone={tone} />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-fg-secondary truncate text-[length:var(--text-small-size)]">
            {label}
          </h3>

          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col items-start gap-1.5">
              <p className="tnum text-fg text-[length:var(--text-metric-size)] leading-[var(--text-metric-line)] font-bold">
                {value}
              </p>
              {trend !== undefined ? (
                <TrendBadge
                  value={trend}
                  unit={trendUnit}
                  invert={trendInvert}
                  label={trendLabel}
                />
              ) : null}
            </div>

            {/* O micrográfico some na faixa em que a grade já é de 4 colunas
                mas a janela ainda é estreita (1280–1535px com a barra
                lateral): ali sobra pouco para o número, que é o que importa. */}
            {series && series.length > 1 ? (
              <div className="hidden shrink-0 sm:block xl:hidden 2xl:block">
                <Sparkline values={series} color={tone} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
