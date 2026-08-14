import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconMinus,
} from "@tabler/icons-react";

/**
 * Indicador de tendência. `invert` diz que subir é ruim (ex.: atrasadas):
 * a seta continua apontando para cima, mas a cor vira alerta — a direção
 * comunica o movimento e a cor comunica o julgamento, então a informação
 * não depende só da cor.
 */
export function TrendBadge({
  value,
  unit = "%",
  invert = false,
  label,
}: {
  /** Variação já calculada. Positivo = subiu. */
  value: number;
  unit?: string;
  invert?: boolean;
  /** Descrição para leitor de tela (ex.: "vs. semana anterior"). */
  label?: string;
}) {
  const rounded = Math.round(value * 10) / 10;
  const flat = rounded === 0;
  const good = invert ? rounded < 0 : rounded > 0;

  const tone = flat
    ? "var(--text-muted)"
    : good
      ? "var(--status-positive-fg)"
      : "var(--status-overdue-fg)";

  const Icon = flat
    ? IconMinus
    : rounded > 0
      ? IconArrowUpRight
      : IconArrowDownRight;
  const direction = flat ? "estável" : rounded > 0 ? "aumento" : "queda";

  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-xs px-1.5 py-0.5 text-[length:var(--text-caption-size)] font-medium"
      style={{
        color: tone,
        background: `color-mix(in srgb, ${tone} 10%, transparent)`,
      }}
    >
      <Icon size={13} stroke={2.25} aria-hidden />
      <span className="tnum">
        {Math.abs(rounded)}
        {unit}
      </span>
      <span className="sr-only">
        {direction}
        {label ? ` ${label}` : ""}
      </span>
    </span>
  );
}
