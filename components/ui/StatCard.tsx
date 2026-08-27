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
  active = false,
}: {
  label: string;
  value: ReactNode;
  icon: IconComponent;
  tone: string;
  /**
   * Cartão que serve de filtro e está selecionado.
   *
   * O estado mora AQUI e não em quem embrulha o cartão. Um anel no elemento
   * de fora cai exatamente sobre a borda do cartão — os dois desenham no
   * mesmo pixel, e o resultado lê como borda cortada em vez de seleção.
   * Trocando borda e fundo por dentro, a seleção usa a mesma linguagem do
   * resto do app e não sobra nada por cima.
   */
  active?: boolean;
}) {
  return (
    <div
      // O halo de hover sai desta cor. Vai como variável, e não como classe,
      // porque a cor é dado do cartão — não dá para gerar uma classe por tom.
      style={{ "--card-tone": tone } as CSSProperties}
      className={`tf-lift flex flex-col gap-3 rounded-md border p-4 shadow-[var(--shadow-card)] ${
        active ? "border-line-strong bg-selected" : "border-line bg-card"
      }`}
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
