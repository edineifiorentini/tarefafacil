"use client";

import {
  IconCalendarMonth,
  IconChartPie,
  IconClockHour4,
  IconCoin,
  IconFileDescription,
  IconLayoutDashboard,
  IconStack2,
  IconTrendingUp,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { LineChart } from "@/components/charts/LineChart";
import { useShell } from "@/components/shell/shell-context";
import { TaskDetailPanel } from "@/components/task/TaskDetailPanel";
import { Avatar } from "@/components/ui/Avatar";
import { ChartCard } from "@/components/ui/ChartCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Select } from "@/components/ui/Select";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { computeDashboard } from "@/lib/dashboard/stats";
import {
  completionRateSeries,
  deliveredInMonth,
  deliveriesByWeek,
  nowInstant,
  openBacklogSeries,
  overdueSeries,
  percentChange,
  pointChange,
  revenueByMonth,
  upcomingDeliveries,
} from "@/lib/dashboard/trends";
import { formatCentsBRL, formatCompactBRL } from "@/lib/finance/money";
import { currentMonthISO, monthLabel, shiftMonth } from "@/lib/finance/month";
import { useClients } from "@/lib/queries/useClients";
import { useFinanceEntries } from "@/lib/queries/useFinance";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useSectors } from "@/lib/queries/useSectors";
import { useTasks } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";

import { AgendaItem } from "./AgendaItem";

const WEEKS = 8;

/** Seletor com a largura do próprio rótulo — ver `ListView`. */
const FILTER_W = "max-w-60";

/** Últimos 12 meses como opções do seletor. */
function monthOptions(current: string) {
  return Array.from({ length: 12 }, (_, i) => {
    const value = shiftMonth(current, -i);
    return { value, label: monthLabel(value) };
  });
}

export function DashboardView() {
  const ws = useWorkspace();
  const { data: tasks = [], isLoading } = useTasks(ws.id);
  const { data: sectors = [] } = useSectors(ws.id);
  const { data: clients = [] } = useClients(ws.id);
  const { data: members = [] } = useMembers(ws.id);
  const { data: myId } = useCurrentUserId();
  const { openPanel } = useShell();

  const myRole = members.find((m) => m.user_id === myId)?.role;
  const canSeeFinance = myRole === "owner" || myRole === "admin";
  const { data: financeEntries = [] } = useFinanceEntries(ws.id, canSeeFinance);

  // Relógio lido uma vez, na montagem: mantém as séries estáveis entre
  // renders e não lê o relógio durante a renderização.
  const [now] = useState(nowInstant);
  const [month, setMonth] = useState(currentMonthISO);
  const [year, setYear] = useState(() => nowInstant().getFullYear());

  const stats = useMemo(
    () => computeDashboard({ tasks, sectors, clients, members }, now),
    [tasks, sectors, clients, members, now]
  );

  const openSeries = useMemo(
    () => openBacklogSeries(tasks, now, WEEKS),
    [tasks, now]
  );
  // Sem histórico de atribuição, a série usa quem responde pela demanda hoje;
  // o indicador em si (stats.inProgress) é exato.
  const progressSeries = useMemo(
    () => openBacklogSeries(tasks, now, WEEKS, (t) => !!t.assignee_id),
    [tasks, now]
  );
  const lateSeries = useMemo(
    () => overdueSeries(tasks, now, WEEKS),
    [tasks, now]
  );
  const rateSeries = useMemo(
    () => completionRateSeries(tasks, now, WEEKS),
    [tasks, now]
  );

  const deliveries = useMemo(
    () => deliveriesByWeek(tasks, month),
    [tasks, month]
  );
  const previousMonthDelivered = useMemo(
    () => deliveredInMonth(tasks, shiftMonth(month, -1)),
    [tasks, month]
  );
  const deliveryChange =
    previousMonthDelivered > 0
      ? ((deliveries.totalDelivered - previousMonthDelivered) /
          previousMonthDelivered) *
        100
      : 0;

  const upcoming = useMemo(() => upcomingDeliveries(tasks, now), [tasks, now]);
  const revenue = useMemo(
    () => revenueByMonth(financeEntries, year),
    [financeEntries, year]
  );

  const sectorsById = useMemo(
    () => new Map(sectors.map((s) => [s.id, s])),
    [sectors]
  );
  const totalSectorOpen = stats.bySector.reduce((sum, s) => sum + s.open, 0);
  const team = stats.byAssignee.filter((a) => a.id !== "__none__").slice(0, 4);

  const todayLabel = now.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
  });
  const yearOptions = [year + 1, year, year - 1, year - 2].map((y) => ({
    value: String(y),
    label: String(y),
  }));

  function openTask(taskId: string) {
    openPanel({ title: "Tarefa", node: <TaskDetailPanel taskId={taskId} /> });
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[var(--max-width-app)] flex-col gap-[var(--space-block-gap)] px-4 pb-8 lg:px-6">
        <div className="grid gap-[var(--space-block-gap)] sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[var(--max-width-app)] flex-col gap-[var(--space-block-gap)] px-4 pb-8 lg:px-6">
      {/* Linha 1 — indicadores */}
      <div className="grid gap-[var(--space-block-gap)] sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={IconFileDescription}
          label="Demandas abertas"
          value={String(stats.open)}
          tone="var(--chart-1)"
          trend={percentChange(openSeries)}
          trendLabel="vs. semana anterior"
          series={openSeries}
        />
        <MetricCard
          icon={IconStack2}
          label="Em produção"
          value={String(stats.inProgress)}
          tone="var(--chart-2)"
          trend={percentChange(progressSeries)}
          trendLabel="vs. semana anterior"
          series={progressSeries}
        />
        <MetricCard
          icon={IconClockHour4}
          label="Atrasadas"
          value={String(stats.overdue)}
          tone="var(--status-overdue-fg)"
          trend={percentChange(lateSeries)}
          trendInvert
          trendLabel="vs. semana anterior"
          series={lateSeries}
        />
        <MetricCard
          icon={IconTrendingUp}
          label="Taxa de conclusão"
          value={`${stats.completionRate}%`}
          tone="var(--chart-3)"
          trend={pointChange(rateSeries)}
          trendUnit=" p.p."
          trendLabel="vs. semana anterior"
          series={rateSeries}
        />
      </div>

      {/* Linha 2 — entrega do mês (maior) + agenda */}
      <div className="grid gap-[var(--space-block-gap)] xl:grid-cols-3">
        <ChartCard
          icon={IconCalendarMonth}
          title="Entrega do mês"
          className="xl:col-span-2"
          actions={
            <div className={FILTER_W}>
              <Select
                options={monthOptions(currentMonthISO())}
                value={month}
                onValueChange={setMonth}
                aria-label="Mês das entregas"
              />
            </div>
          }
        >
          <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="tnum text-fg text-[length:var(--text-metric-size)] leading-[var(--text-metric-line)] font-bold">
                {deliveries.totalDelivered}{" "}
                <span className="text-fg-secondary text-[length:var(--text-h3-size)] font-semibold">
                  entregas
                </span>
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <TrendBadge value={deliveryChange} label="vs. mês anterior" />
                <span className="text-fg-muted text-[length:var(--text-caption-size)] whitespace-nowrap">
                  vs. mês anterior
                </span>
              </div>
            </div>

            <div className="text-fg-secondary flex items-center gap-4 text-[length:var(--text-caption-size)]">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ background: "var(--chart-1)" }}
                />
                Entregues
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ background: "var(--chart-2)" }}
                />
                Planejadas
              </span>
            </div>
          </div>

          <LineChart
            labels={deliveries.labels}
            ariaLabel={`Entregues e planejadas por semana em ${monthLabel(month)}`}
            series={[
              {
                key: "entregues",
                label: "Entregues",
                color: "var(--chart-1)",
                values: deliveries.delivered,
                area: true,
              },
              {
                key: "planejadas",
                label: "Planejadas",
                color: "var(--chart-2)",
                values: deliveries.planned,
                area: true,
              },
            ]}
          />
        </ChartCard>

        <ChartCard
          icon={IconCalendarMonth}
          title="Próximas entregas"
          subtitle={`Hoje, ${todayLabel}`}
          // Sem link no cabeçalho: o rodapé já é a saída do cartão e cada item
          // abre a demanda. Dois "ver mais" só espremiam o título.
          footer={{
            label: "Ver calendário completo",
            href: "/calendario",
            icon: IconCalendarMonth,
          }}
        >
          {upcoming.length === 0 ? (
            <p className="text-fg-secondary py-8 text-center text-[length:var(--text-small-size)]">
              Nenhuma entrega com prazo daqui para a frente
            </p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {upcoming.map((delivery) => (
                <li key={delivery.task.id}>
                  <AgendaItem
                    delivery={delivery}
                    sector={sectorsById.get(delivery.task.sector_id)}
                    onOpen={() => openTask(delivery.task.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      {/* Linha 3 — setor, equipe e faturamento.
          Três colunas só a partir de 2xl: em 1280 o cartão fica com 310px e
          nem o título ("Faturamento anual") nem o nome de uma pessoa cabem. */}
      <div
        className={`grid gap-[var(--space-block-gap)] lg:grid-cols-2 ${
          canSeeFinance ? "2xl:grid-cols-3" : ""
        }`}
      >
        <ChartCard
          icon={IconChartPie}
          title="Demandas por setor"
          footer={{ label: "Ver relatório completo", href: "/lista" }}
        >
          {stats.bySector.length === 0 ? (
            <p className="text-fg-secondary py-6 text-center text-[length:var(--text-small-size)]">
              Nenhuma demanda aberta
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {stats.bySector.slice(0, 4).map((sector) => {
                const pct =
                  totalSectorOpen > 0
                    ? Math.round((sector.open / totalSectorOpen) * 100)
                    : 0;
                return (
                  <li key={sector.id} className="flex items-center gap-3">
                    <span className="text-fg-secondary w-28 shrink-0 truncate text-[length:var(--text-small-size)]">
                      {sector.name}
                    </span>
                    <div className="min-w-0 flex-1">
                      <ProgressBar
                        thin
                        value={pct}
                        color={sector.color}
                        label={`${sector.name}: ${sector.open} demandas`}
                      />
                    </div>
                    <span className="tnum text-fg shrink-0 text-[length:var(--text-small-size)] font-medium">
                      {sector.open}
                    </span>
                    <span className="tnum text-fg-muted w-10 shrink-0 text-right text-[length:var(--text-caption-size)]">
                      {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </ChartCard>

        <ChartCard
          icon={IconUsersGroup}
          title="Desempenho da equipe"
          subtitle="Últimos 30 dias"
          tone="var(--chart-2)"
          footer={{ label: "Ver desempenho completo", href: "/lista" }}
        >
          {team.length === 0 ? (
            <p className="text-fg-secondary py-6 text-center text-[length:var(--text-small-size)]">
              Nenhuma demanda com responsável
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {team.map((person) => {
                const assigned = person.done30 + person.open;
                const pct =
                  assigned > 0
                    ? Math.round((person.done30 / assigned) * 100)
                    : 0;
                return (
                  <li key={person.id} className="flex items-center gap-3">
                    <Avatar name={person.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-fg truncate text-[length:var(--text-small-size)] font-medium">
                          {person.name}
                        </span>
                        <span className="tnum text-fg-secondary shrink-0 text-[length:var(--text-caption-size)]">
                          {person.done30} / {assigned} entregas
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <ProgressBar
                          thin
                          value={pct}
                          color="var(--chart-2)"
                          label={`${person.name}: ${pct}% entregue`}
                        />
                      </div>
                    </div>
                    <span className="tnum bg-sunken text-fg-secondary shrink-0 rounded-xs px-1.5 py-0.5 text-[length:var(--text-caption-size)] font-medium">
                      {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </ChartCard>

        {canSeeFinance ? (
          <ChartCard
            icon={IconCoin}
            title="Faturamento anual"
            tone="var(--chart-3)"
            // Enquanto a linha tem duas colunas, ocupa as duas: sobra é melhor
            // que um cartão órfão de meia largura na terceira posição.
            className="lg:col-span-2 2xl:col-span-1"
            actions={
              <div className={FILTER_W}>
                <Select
                  options={yearOptions}
                  value={String(year)}
                  onValueChange={(v) => setYear(Number(v))}
                  aria-label="Ano do faturamento"
                />
              </div>
            }
            footer={{ label: "Ver relatório financeiro", href: "/financeiro" }}
          >
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <p className="tnum text-fg text-[length:var(--text-h2-size)] leading-[var(--text-h2-line)] font-bold">
                  {formatCentsBRL(revenue.totalCents)}
                </p>
                <p className="text-fg-muted text-[length:var(--text-caption-size)]">
                  recebido no ano
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <TrendBadge value={revenue.growth} label={`vs. ${year - 1}`} />
                <span className="text-fg-muted text-[length:var(--text-caption-size)] whitespace-nowrap">
                  vs. {year - 1}
                </span>
              </div>
            </div>

            <LineChart
              height={168}
              labels={revenue.labels}
              ariaLabel={`Faturamento mensal de ${year}`}
              formatValue={(v) => formatCentsBRL(v)}
              formatAxisValue={(v) => formatCompactBRL(v)}
              series={[
                {
                  key: "faturamento",
                  label: "Recebido",
                  color: "var(--chart-3)",
                  values: revenue.values,
                  area: true,
                },
              ]}
            />
          </ChartCard>
        ) : null}
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={IconLayoutDashboard}
          title="Sem dados ainda"
          description="Crie demandas e vincule setores, clientes e responsáveis para ver os indicadores aqui"
        />
      ) : null}
    </div>
  );
}
