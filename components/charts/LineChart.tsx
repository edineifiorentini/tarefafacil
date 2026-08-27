"use client";

import { useId, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";

import {
  closedAreaPath,
  makeXScale,
  makeYScale,
  niceTicks,
  polylineLength,
  smoothLinePath,
  type Point,
} from "@/lib/charts/path";

export type ChartSeries = {
  key: string;
  label: string;
  /** Cor da série — sempre um token (`var(--chart-1)`), nunca hex literal. */
  color: string;
  values: number[];
  /** Preenche a área sob a curva com um gradiente muito suave. */
  area?: boolean;
};

const W = 720;
const PAD_LEFT = 34;
const PAD_RIGHT = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 28;

/** Teto de rótulos no eixo horizontal. Acima disso eles se sobrepõem. */
const MAX_ROTULOS = 8;

/**
 * Gráfico de linhas multi-série: curvas fluidas, grade quase imperceptível,
 * crosshair e tooltip de vidro no hover. Pontos só aparecem no índice ativo.
 *
 * Acessibilidade: o SVG é decorativo e a mesma informação vai numa tabela
 * visualmente oculta — leitor de tela lê os dados, não a forma.
 */
export function LineChart({
  series,
  labels,
  height = 240,
  formatValue = (v: number) => String(v),
  formatAxisValue,
  ariaLabel,
}: {
  series: ChartSeries[];
  labels: string[];
  height?: number;
  /** Formato do tooltip e da tabela acessível — valor cheio. */
  formatValue?: (value: number) => string;
  /** Formato das marcas do eixo. Sem isto, usa o número cru (contagens). */
  formatAxisValue?: (value: number) => string;
  ariaLabel: string;
}) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  const H = height;
  const allValues = series.flatMap((s) => s.values);
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 0;
  const ticks = niceTicks(maxValue, 4);
  const top = ticks[ticks.length - 1] || 1;

  const x = makeXScale(labels.length, PAD_LEFT, W - PAD_RIGHT);

  // Quantos rótulos cabem sem encostar um no outro, na largura fixa do
  // viewBox. Oito é o que sobra depois de reservar espaço para "00 mmm.".
  const passoDeRotulo = Math.max(1, Math.ceil(labels.length / MAX_ROTULOS));
  const y = makeYScale(0, top, PAD_TOP, H - PAD_BOTTOM);
  const baseline = H - PAD_BOTTOM;

  const pointsOf = (s: ChartSeries): Point[] =>
    s.values.map((v, i) => ({ x: x(i), y: y(v) }));

  function handleMove(event: ReactMouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || labels.length === 0) return;
    const localX = ((event.clientX - rect.left) / rect.width) * W;
    const step = (W - PAD_RIGHT - PAD_LEFT) / Math.max(labels.length - 1, 1);
    const index = Math.round((localX - PAD_LEFT) / step);
    setActive(Math.max(0, Math.min(labels.length - 1, index)));
  }

  const tooltipLeftPct = active !== null ? (x(active) / W) * 100 : 0;

  return (
    <div className="relative w-full">
      {/* Escala uniforme (preserveAspectRatio padrão): com "none" os rótulos
          de texto do eixo esticariam junto com a largura. */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        onMouseMove={handleMove}
        onMouseLeave={() => setActive(null)}
        aria-hidden
      >
        <defs>
          {series.map((s, i) => (
            <linearGradient
              key={s.key}
              id={`${gradientId}-${i}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {/* Grade horizontal — quase imperceptível, só para ancorar a leitura */}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD_LEFT}
              x2={W - PAD_RIGHT}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--chart-grid)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={PAD_LEFT - 10}
              y={y(tick) + 3}
              textAnchor="end"
              fill="var(--text-muted)"
              style={{ fontSize: 10 }}
            >
              {formatAxisValue ? formatAxisValue(tick) : tick}
            </text>
          </g>
        ))}

        {/* Crosshair do índice ativo */}
        {active !== null ? (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={PAD_TOP}
            y2={baseline}
            stroke="var(--chart-crosshair)"
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {/* Áreas primeiro, para as linhas ficarem por cima */}
        {series.map((s, i) =>
          s.area ? (
            <path
              key={`${s.key}-area`}
              d={closedAreaPath(pointsOf(s), baseline)}
              fill={`url(#${gradientId}-${i})`}
            />
          ) : null
        )}

        {series.map((s) => {
          const pts = pointsOf(s);
          const length = polylineLength(pts);
          return (
            <path
              key={`${s.key}-${s.values.join(",")}`}
              d={smoothLinePath(pts)}
              fill="none"
              stroke={s.color}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              strokeDasharray={length}
              style={
                {
                  "--tf-draw-length": length,
                  animation: "tf-draw var(--dur-slow) var(--ease-out) forwards",
                } as CSSProperties
              }
            />
          );
        })}

        {/* Pontos só no índice ativo (destacados apenas quando necessários) */}
        {active !== null
          ? series.map((s) => (
              <circle
                key={`${s.key}-dot`}
                cx={x(active)}
                cy={y(s.values[active] ?? 0)}
                r={4}
                fill="var(--surface-card)"
                stroke={s.color}
                strokeWidth={2.5}
                vectorEffect="non-scaling-stroke"
              />
            ))
          : null}

        {/* Rótulos do eixo horizontal.
            Desenhar um por ponto só funciona até uma dúzia: com 30 ou 90 dias
            eles se sobrepõem e viram um borrão cinza. Aqui o eixo é afinado
            para caber, e o último ponto entra sempre — o leitor precisa saber
            onde a série termina. A chave é o índice, não o texto: dois
            rótulos iguais são possíveis e derrubariam a lista. */}
        {labels.map((label, i) =>
          // O último sempre entra; o rótulo do passo cede quando cairia
          // colado nele — foi o que produziu "26 de ago." impresso por cima
          // de "27 de ago." na ponta direita.
          i === labels.length - 1 ||
          (i % passoDeRotulo === 0 &&
            labels.length - 1 - i >= passoDeRotulo) ? (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor={
                i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"
              }
              fill="var(--text-muted)"
              style={{ fontSize: 11 }}
            >
              {label}
            </text>
          ) : null
        )}
      </svg>

      {/* Tooltip de vidro — segue o índice ativo, preso às bordas do card */}
      {active !== null ? (
        <div
          className="tf-glass-strong pointer-events-none absolute top-2 flex min-w-36 [animation:tf-pop-in_var(--dur-fast)_var(--ease-out)] flex-col gap-1.5 rounded-sm px-3 py-2"
          style={{
            left: `clamp(0px, calc(${tooltipLeftPct}% - 72px), calc(100% - 144px))`,
          }}
        >
          <span className="text-fg text-[length:var(--text-caption-size)] font-medium">
            {labels[active]}
          </span>
          {series.map((s) => (
            <span
              key={s.key}
              className="text-fg-secondary flex items-center gap-2 text-[length:var(--text-caption-size)]"
            >
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <span className="flex-1">{s.label}</span>
              <span className="tnum text-fg font-medium">
                {formatValue(s.values[active] ?? 0)}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {/* Alternativa textual acessível */}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Período</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, i) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {series.map((s) => (
                <td key={s.key}>{formatValue(s.values[i] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
