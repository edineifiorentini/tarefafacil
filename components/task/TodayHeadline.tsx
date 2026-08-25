"use client";

import {
  IconAlertTriangle,
  IconCalendarDue,
  IconCheck,
  IconInbox,
} from "@tabler/icons-react";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/ui/StatCard";
import type { TodaySummary } from "@/lib/today/summary";

/**
 * Os números do dia, no topo do Hoje.
 *
 * O Dashboard já responde "como vai o mês". Esta faixa responde "o que tenho
 * na frente agora", e é a única coisa que ela pode fazer sem virar Dashboard
 * bis. Por isso são quatro números e duas listas curtas — não gráfico de
 * série, não comparação com o mês passado.
 *
 * **Concluídas hoje não é verde.** Verde neste sistema é dado financeiro
 * positivo (CLAUDE.md), e um número verde ao lado de "atrasadas" em vermelho
 * leria como semáforo de dinheiro. Vai em cinza com check, que é como o resto
 * do app diz "concluído".
 */
function Breakdown({
  title,
  itens,
  vazio,
}: {
  title: string;
  itens: { id: string | null; name: string; count: number; color?: string }[];
  vazio: string;
}) {
  const maior = itens[0]?.count ?? 0;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-2">
      <h3 className="text-fg-secondary text-[length:var(--text-caption-size)] font-medium tracking-wide uppercase">
        {title}
      </h3>

      {itens.length === 0 ? (
        <p className="text-fg-muted text-[length:var(--text-small-size)]">
          {vazio}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {itens.map((item) => (
            <li key={item.id ?? "sem"} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-fg min-w-0 truncate text-[length:var(--text-small-size)]">
                  {item.name}
                </span>
                <span className="tnum text-fg-secondary shrink-0 text-[length:var(--text-small-size)]">
                  {item.count}
                </span>
              </div>
              {/* A barra é relativa ao mais carregado, não ao total: o que
                  interessa aqui é quem está pior que quem, não a fatia. */}
              <ProgressBar
                thin
                value={maior > 0 ? (item.count / maior) * 100 : 0}
                color={item.color}
                label={`${item.name}: ${item.count} para hoje`}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TodayHeadline({ summary }: { summary: TodaySummary }) {
  const semCarga = summary.porSetor.length === 0;

  return (
    // Em xl esta faixa vira a coluna da direita, e o `mb-6` só faria falta
    // empilhada em cima. Os números voltam a duas colunas ali: na coluna
    // estreita, quatro lado a lado truncariam os rótulos de novo.
    <div className="mb-6 flex flex-col gap-4 xl:mb-0">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-2">
        <StatCard
          icon={IconAlertTriangle}
          label="Atrasadas"
          value={String(summary.atrasadas)}
          tone="var(--negative)"
        />
        <StatCard
          icon={IconCalendarDue}
          label="Para hoje"
          value={String(summary.hoje)}
          tone="var(--chart-1)"
        />
        <StatCard
          icon={IconInbox}
          // Curto de propósito: "Sem data definida" sai truncado como
          // "SEM DATA …" nesta largura. O nome inteiro está no título da
          // seção logo abaixo, que é onde as tarefas aparecem.
          label="Sem data"
          value={String(summary.semData)}
          tone="var(--chart-2)"
        />
        <StatCard
          icon={IconCheck}
          // "Concluídas hoje" não cabe no cartão em 1280 e saía truncado.
          // O "hoje" está no título da tela e nos outros três números.
          label="Concluídas"
          value={String(summary.concluidasHoje)}
          tone="var(--text-muted)"
        />
      </div>

      {/* Some quando não há nada pesando: duas listas vazias no topo do dia
          livre é ruído com cara de erro. */}
      {semCarga ? null : (
        <div className="border-line bg-card flex flex-col gap-5 rounded-md border p-4 sm:flex-row sm:gap-8 xl:flex-col xl:gap-5">
          <Breakdown
            title="Setores com pendência"
            itens={summary.porSetor}
            vazio="Nada pendente"
          />
          <Breakdown
            title="Por responsável"
            itens={summary.porPessoa}
            vazio="Nada atribuído"
          />
        </div>
      )}
    </div>
  );
}
