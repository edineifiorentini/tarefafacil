"use client";

import {
  IconAlertTriangle,
  IconCalendarDue,
  IconCheck,
  IconInbox,
} from "@tabler/icons-react";

import { StatCard } from "@/components/ui/StatCard";
import type { Bucket } from "@/lib/today/summary";

/**
 * Os quatro números do dia, no topo.
 *
 * Cada um é um botão que abre o filtro correspondente — o número já
 * respondia "quantas", e clicar responde "quais" sem a pessoa procurar a aba.
 * "Concluídas" fica de fora: não é um balde de pendência, é o que já saiu.
 *
 * **Concluídas não é verde.** Verde neste sistema é dado financeiro positivo
 * (CLAUDE.md), e verde ao lado do vermelho de atraso leria como semáforo de
 * dinheiro. Vai em cinza com check, que é como o resto do app diz "concluído".
 */
export function TodayIndicators({
  atrasadas,
  hoje,
  semData,
  concluidas,
  active,
  onSelect,
}: {
  atrasadas: number;
  hoje: number;
  semData: number;
  concluidas: number;
  active: Bucket;
  onSelect: (b: Bucket) => void;
}) {
  const cards: {
    bucket: Bucket | null;
    icon: typeof IconAlertTriangle;
    label: string;
    value: number;
    tone: string;
  }[] = [
    {
      bucket: "atrasadas",
      icon: IconAlertTriangle,
      label: "Atrasadas",
      value: atrasadas,
      tone: "var(--negative)",
    },
    {
      bucket: "hoje",
      icon: IconCalendarDue,
      label: "Para hoje",
      value: hoje,
      tone: "var(--chart-1)",
    },
    {
      bucket: "sem_data",
      icon: IconInbox,
      label: "Sem data",
      value: semData,
      tone: "var(--chart-2)",
    },
    {
      bucket: null,
      icon: IconCheck,
      label: "Concluídas",
      value: concluidas,
      tone: "var(--text-muted)",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) =>
        c.bucket === null ? (
          <StatCard
            key={c.label}
            icon={c.icon}
            label={c.label}
            value={String(c.value)}
            tone={c.tone}
          />
        ) : (
          <button
            key={c.label}
            type="button"
            onClick={() => onSelect(c.bucket as Bucket)}
            aria-pressed={active === c.bucket}
            // Sem anel aqui: quem marca a seleção é o próprio cartão, por
            // dentro. Anel no botão de fora caía exatamente sobre a borda do
            // cartão e lia como borda cortada.
            className="rounded-md text-left outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            <StatCard
              icon={c.icon}
              label={c.label}
              value={String(c.value)}
              tone={c.tone}
              active={active === c.bucket}
            />
          </button>
        )
      )}
    </div>
  );
}
