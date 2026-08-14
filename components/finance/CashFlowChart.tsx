"use client";

import { useState } from "react";

import { formatCentsBRL } from "@/lib/finance/money";
import type { CashFlowPoint } from "@/lib/finance/cashflow";

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;

type Pt = { x: number; y: number };

// Curva suave por médias entre pontos vizinhos (técnica leve, sem lib de
// gráfico): reta esticada em curvas quadráticas através dos pontos médios.
function smoothPath(points: Pt[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function CashFlowChart({ points }: { points: CashFlowPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return <p className="text-fg-secondary">Sem dados no período</p>;
  }

  const usableW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const usableH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = points.length > 1 ? usableW / (points.length - 1) : 0;

  const allVals = points.flatMap((p) => [p.recebido, p.despesas, p.saldo]);
  const maxVal = Math.max(1, ...allVals);
  const minVal = Math.min(0, ...allVals);
  const range = maxVal - minVal || 1;

  const xFor = (i: number) => PAD_LEFT + i * stepX;
  const yFor = (v: number) =>
    PAD_TOP + usableH - ((v - minVal) / range) * usableH;
  const zeroY = yFor(0);

  const recebidoPts = points.map((p, i) => ({
    x: xFor(i),
    y: yFor(p.recebido),
  }));
  const despesasPts = points.map((p, i) => ({
    x: xFor(i),
    y: yFor(p.despesas),
  }));
  const saldoPts = points.map((p, i) => ({ x: xFor(i), y: yFor(p.saldo) }));
  const saldoArea = `${smoothPath(saldoPts)} L ${xFor(points.length - 1)} ${zeroY} L ${xFor(0)} ${zeroY} Z`;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const idx = stepX > 0 ? Math.round((relX - PAD_LEFT) / stepX) : 0;
    setHover(Math.max(0, Math.min(points.length - 1, idx)));
  }

  const active = hover !== null ? points[hover] : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="text-fg-secondary flex items-center gap-4 text-[length:var(--text-caption-size)]">
        <Legend color="var(--tone-blue)" label="Recebido" />
        <Legend color="var(--color-overdue)" label="Despesas" />
        <Legend color="var(--brand-600)" label="Saldo" />
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label="Gráfico de fluxo de caixa por mês"
        >
          {minVal < 0 ? (
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={zeroY}
              y2={zeroY}
              stroke="var(--border)"
              strokeWidth={1}
            />
          ) : null}

          <path
            d={saldoArea}
            fill="color-mix(in srgb, var(--brand-600) 16%, transparent)"
            stroke="none"
          />
          <path
            d={smoothPath(despesasPts)}
            fill="none"
            stroke="var(--color-overdue)"
            strokeWidth={2}
          />
          <path
            d={smoothPath(recebidoPts)}
            fill="none"
            stroke="var(--tone-blue)"
            strokeWidth={2}
          />
          <path
            d={smoothPath(saldoPts)}
            fill="none"
            stroke="var(--brand-600)"
            strokeWidth={2}
          />

          {hover !== null ? (
            <line
              x1={xFor(hover)}
              x2={xFor(hover)}
              y1={PAD_TOP}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          ) : null}

          {points.map((p, i) => (
            <text
              key={p.month}
              x={xFor(i)}
              y={HEIGHT - 6}
              textAnchor="middle"
              className="fill-fg-muted"
              style={{ fontSize: 10 }}
            >
              {p.label}
            </text>
          ))}
        </svg>

        {active ? (
          <div
            className="border-line bg-card pointer-events-none absolute top-0 flex -translate-x-1/2 flex-col gap-0.5 rounded-md border px-3 py-2 text-[length:var(--text-caption-size)] shadow-[var(--shadow-peek)]"
            style={{ left: `${(xFor(hover!) / WIDTH) * 100}%` }}
          >
            <span className="text-fg font-medium">{active.label}</span>
            <span style={{ color: "var(--tone-blue)" }}>
              Recebido: {formatCentsBRL(active.recebido)}
            </span>
            <span style={{ color: "var(--color-overdue)" }}>
              Despesas: {formatCentsBRL(active.despesas)}
            </span>
            <span style={{ color: "var(--brand-600)" }}>
              Saldo: {formatCentsBRL(active.saldo)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
