"use client";

import { useState } from "react";

import { IconTrendingUp } from "@tabler/icons-react";

import { LineChart, type ChartSeries } from "@/components/charts/LineChart";
import { ChartCard } from "@/components/ui/ChartCard";
import type { Crescimento } from "@/lib/admin/metrics";
import { formatCentsBRL, formatCompactBRL } from "@/lib/finance/money";

type Aba = "empresas" | "receita";

/**
 * Crescimento da plataforma (especificação 8.5).
 *
 * As duas séries NÃO são desenhadas juntas por padrão. Empresas conta
 * unidades e receita conta reais: sobrepor as duas num eixo só produz o
 * gráfico de dois eixos Y, que é bonito e mente — a distância entre as
 * curvas passa a depender da escala escolhida, não dos dados. Aqui se
 * alterna, e cada série usa o eixo inteiro.
 */
export function GrowthChartCard({ dados }: { dados: Crescimento }) {
  const [aba, setAba] = useState<Aba>("empresas");

  const series: ChartSeries[] =
    aba === "empresas"
      ? [
          {
            key: "empresas",
            label: "Empresas ativas",
            color: "var(--chart-1)",
            values: dados.empresas,
            area: true,
          },
        ]
      : [
          {
            key: "receita",
            label: "Receita paga",
            color: "var(--positive)",
            values: dados.receitaCents,
            area: true,
          },
        ];

  return (
    <ChartCard
      icon={IconTrendingUp}
      title="Crescimento da plataforma"
      actions={
        <div
          role="radiogroup"
          aria-label="Série exibida"
          className="flex items-center gap-1"
        >
          {(["empresas", "receita"] as Aba[]).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={aba === v}
              tabIndex={aba === v ? 0 : -1}
              onClick={() => setAba(v)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  setAba(v === "empresas" ? "receita" : "empresas");
                }
              }}
              className={`rounded-sm px-2 py-1 text-[length:var(--text-small-size)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
                aba === v
                  ? "text-fg-link font-medium"
                  : "text-fg-muted hover:text-fg-secondary"
              }`}
            >
              {v === "empresas" ? "Empresas" : "Receita"}
            </button>
          ))}
        </div>
      }
    >
      <LineChart
        series={series}
        labels={dados.labels}
        height={260}
        formatValue={
          aba === "receita" ? (v) => formatCentsBRL(v) : (v) => String(v)
        }
        formatAxisValue={
          aba === "receita" ? (v) => formatCompactBRL(v) : undefined
        }
        ariaLabel={
          aba === "empresas"
            ? "Empresas ativas por dia"
            : "Receita paga por dia"
        }
      />
    </ChartCard>
  );
}
