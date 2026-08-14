"use client";

import {
  IconAlertTriangle,
  IconChecklist,
  IconClockHour4,
  IconLayoutDashboard,
  IconListCheck,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import type { IconComponent } from "@/components/ui/types";
import { computeDashboard } from "@/lib/dashboard/stats";
import { useClients } from "@/lib/queries/useClients";
import { useMembers } from "@/lib/queries/useMembers";
import { useSectors } from "@/lib/queries/useSectors";
import { useTasks } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";

export function DashboardView() {
  const ws = useWorkspace();
  const { data: tasks = [], isLoading } = useTasks(ws.id);
  const { data: sectors = [] } = useSectors(ws.id);
  const { data: clients = [] } = useClients(ws.id);
  const { data: members = [] } = useMembers(ws.id);

  const stats = computeDashboard({ tasks, sectors, clients, members });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Abertas"
          value={stats.open}
          icon={IconListCheck}
          tone="var(--color-fg)"
        />
        <StatCard
          label="Atrasadas"
          value={stats.overdue}
          icon={IconAlertTriangle}
          tone="var(--color-overdue)"
        />
        <StatCard
          label="Vencendo em 7 dias"
          value={stats.dueSoon}
          icon={IconClockHour4}
          tone="var(--tone-amber)"
        />
        <StatCard
          label="Concluídas (30 dias)"
          value={stats.done30}
          icon={IconChecklist}
          tone="var(--color-fg-muted)"
        />
      </div>

      {isLoading ? (
        <p className="text-fg-secondary">Carregando…</p>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={IconLayoutDashboard}
          title="Sem dados ainda"
          description="Crie demandas e vincule setores, clientes e responsáveis para ver os indicadores aqui"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Por setor">
            <BarList
              rows={stats.bySector.map((s) => ({
                key: s.id,
                label: s.name,
                value: s.open,
                color: s.color,
              }))}
              max={stats.bySector[0]?.open ?? 0}
              empty="Nenhuma demanda aberta"
            />
          </Panel>

          <Panel title="Por cliente">
            <BarList
              rows={stats.byClient.map((c) => ({
                key: c.id,
                label: c.name,
                value: c.open,
                color: "var(--tone-blue)",
              }))}
              max={stats.byClient[0]?.open ?? 0}
              empty="Nenhuma demanda vinculada a cliente"
            />
          </Panel>

          <Panel title="Equipe" className="md:col-span-2">
            {stats.byAssignee.length === 0 ? (
              <p className="py-2 text-[length:var(--text-small-size)] text-fg-secondary">
                Sem responsáveis atribuídos
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {stats.byAssignee.map((a) => (
                  <li key={a.id} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-[length:var(--text-small-size)] text-fg">
                      {a.name}
                    </span>
                    <div className="flex-1">
                      <Bar
                        value={a.open}
                        max={stats.byAssignee[0]?.open ?? 0}
                        color="var(--tone-violet)"
                      />
                    </div>
                    <span className="tnum w-32 shrink-0 text-right text-[length:var(--text-caption-size)] text-fg-muted">
                      {a.open} aberta{a.open === 1 ? "" : "s"} ·{" "}
                      <span className="text-fg-secondary">{a.done30}</span> feita
                      {a.done30 === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: IconComponent;
  tone: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-card p-4">
      <div className="flex items-center gap-2 text-fg-muted">
        <Icon size={18} stroke={1.5} />
        <span className="text-[length:var(--text-caption-size)] uppercase tracking-wide">
          {label}
        </span>
      </div>
      <span
        className="tnum text-[length:var(--text-h1-size)] font-semibold leading-none"
        style={{ color: tone }}
      >
        {value}
      </span>
    </div>
  );
}

function Panel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`flex flex-col gap-3 rounded-md border border-line bg-card p-[var(--space-card-pad)] ${className ?? ""}`}
    >
      <h2 className="text-[length:var(--text-small-size)] font-medium text-fg-secondary">
        {title}
      </h2>
      {children}
    </section>
  );
}

type Row = { key: string; label: string; value: number; color: string };

function BarList({
  rows,
  max,
  empty,
}: {
  rows: Row[];
  max: number;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-2 text-[length:var(--text-small-size)] text-fg-secondary">
        {empty}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-[length:var(--text-small-size)] text-fg">
            {r.label}
          </span>
          <div className="flex-1">
            <Bar value={r.value} max={max} color={r.color} />
          </div>
          <span className="tnum w-8 shrink-0 text-right text-[length:var(--text-small-size)] text-fg-secondary">
            {r.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Bar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-sunken">
      <div
        className="h-full rounded-full transition-[width] [transition-duration:var(--dur-base)]"
        style={{ width: `${Math.max(pct, value > 0 ? 6 : 0)}%`, background: color }}
      />
    </div>
  );
}
