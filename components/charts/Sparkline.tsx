"use client";

import { useId } from "react";
import type { CSSProperties } from "react";

import {
  closedAreaPath,
  makeXScale,
  makeYScale,
  polylineLength,
  smoothLinePath,
  type Point,
} from "@/lib/charts/path";

const W = 120;
const H = 40;
const PAD = 3;

/**
 * Micrográfico do cartão de indicador: só a forma da tendência, sem eixo,
 * sem grade e sem interação. O ponto final é destacado para ancorar a leitura.
 */
export function Sparkline({
  values,
  color = "var(--chart-1)",
  ariaLabel,
}: {
  values: number[];
  color?: string;
  ariaLabel?: string;
}) {
  const gradientId = useId();

  if (values.length < 2) {
    return <div className="h-10 w-[120px]" aria-hidden />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  // Domínio com folga: série constante não vira uma linha colada na borda.
  const pad = (max - min) * 0.15 || 1;
  const x = makeXScale(values.length, PAD, W - PAD);
  const y = makeYScale(min - pad, max + pad, PAD, H - PAD);

  const points: Point[] = values.map((v, i) => ({ x: x(i), y: y(v) }));
  const last = points[points.length - 1];
  const length = polylineLength(points);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-10 w-[120px] overflow-visible"
      role={ariaLabel ? "img" : "presentation"}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      <path d={closedAreaPath(points, H)} fill={`url(#${gradientId})`} />
      <path
        d={smoothLinePath(points)}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeDasharray={length}
        style={
          {
            "--tf-draw-length": length,
            animation: "tf-draw var(--dur-slow) var(--ease-out) forwards",
          } as CSSProperties
        }
      />
      <circle cx={last.x} cy={last.y} r={2.5} fill={color} />
    </svg>
  );
}
