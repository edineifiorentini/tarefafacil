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
    <article className="tf-lift border-line bg-card @container rounded-md border p-[var(--space-card-pad)] shadow-[var(--shadow-card)]">
      {/* gap-3 e não gap-4: em 1280 com a grade de 4 colunas, os 4px extras
          eram o que faltava para "Taxa de conclusão" caber sem reticências. */}
      <div className="flex gap-3">
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

            {/* Abaixo de 20rem de cartão o micrográfico some: ali o número é
                o que importa. A regra vive em `tf-spark-slot`. */}
            {series && series.length > 1 ? (
              <div className="tf-spark-slot shrink-0">
                <Sparkline values={series} color={tone} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
