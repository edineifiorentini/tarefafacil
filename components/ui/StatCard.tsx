import type { CSSProperties, ReactNode } from "react";

import { IconTile } from "./IconTile";
import type { IconComponent } from "./types";

/**
 * Cartão de indicador compacto (Financeiro, Contratos). `value` aceita
 * ReactNode para caber valor em moeda já formatado ou a máscara "••••••"
 * quando o usuário oculta os valores.
 *
 * Irmão menor do MetricCard: mesma linguagem de superfície e elevação, sem
 * micrográfico nem tendência.
 */
export function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  icon: IconComponent;
  tone: string;
}) {
  return (
    <div
      // O halo de hover sai desta cor. Vai como variável, e não como classe,
      // porque a cor é dado do cartão — não dá para gerar uma classe por tom.
      style={{ "--card-tone": tone } as CSSProperties}
      className="tf-lift border-line bg-card flex flex-col gap-3 rounded-md border p-4 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-center gap-2.5">
        <IconTile icon={icon} tone={tone} size="sm" />
        <span className="text-fg-secondary min-w-0 truncate text-[length:var(--text-caption-size)] tracking-wide uppercase">
          {label}
        </span>
      </div>
      <span
        className="tnum text-[length:var(--text-h2-size)] leading-none font-bold"
        style={{ color: tone }}
      >
        {value}
      </span>
    </div>
  );
}
