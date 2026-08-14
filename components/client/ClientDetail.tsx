"use client";

import { IconAlertTriangle, IconChecklist, IconListCheck, IconMail, IconPencil, IconPhone } from "@tabler/icons-react";

import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { TaskRows } from "@/components/task/TaskRows";
import { computeDashboard } from "@/lib/dashboard/stats";
import { useClientDetail, useClientTasks } from "@/lib/queries/useClients";
import { useMembers } from "@/lib/queries/useMembers";
import { useSectors } from "@/lib/queries/useSectors";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { ClientStatus } from "@/types/database";

import { ClientForm } from "./ClientForm";
import { ClientStatusPill } from "./ClientStatusPill";

// Progresso e indicadores usam computeDashboard — o MESMO serviço de
// agregação do painel Dashboard (spec §13.3: "o progresso do cliente usa
// o mesmo serviço de agregação das métricas... evitar fórmulas diferentes
// em cada tela"). Só filtramos a lista de tarefas para as deste cliente.
export function ClientDetail({ clientId }: { clientId: string }) {
  const workspace = useWorkspace();
  const { data: client } = useClientDetail(workspace.id, clientId);
  const { data: tasks = [] } = useClientTasks(workspace.id, clientId);
  const { data: sectors = [] } = useSectors(workspace.id);
  const { data: members = [] } = useMembers(workspace.id);
  const { openPanel, closePanel } = useShell();

  if (!client) {
    return <p className="text-fg-secondary">Carregando…</p>;
  }

  const stats = computeDashboard({ tasks, sectors, clients: [client], members });
  const doneTotal = tasks.filter((t) => t.completed_at).length;
  const progressPct = tasks.length > 0 ? Math.round((doneTotal / tasks.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[length:var(--text-h2-size)] font-semibold text-fg">
            {client.name}
          </h2>
          <div className="flex items-center gap-2">
            <ClientStatusPill status={client.status as ClientStatus} />
            <span className="text-[length:var(--text-caption-size)] text-fg-muted">
              {client.type === "pj" ? "Pessoa jurídica" : "Pessoa física"}
            </span>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={IconPencil}
          onClick={() =>
            openPanel({
              title: "Editar cliente",
              node: (
                <ClientForm mode="edit" client={client} onDone={closePanel} />
              ),
            })
          }
        >
          Editar
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-line bg-card p-4">
        {client.document ? (
          <p className="text-[length:var(--text-small-size)] text-fg">
            {client.type === "pj" ? "CNPJ" : "CPF"}: {client.document}
          </p>
        ) : null}
        {client.email ? (
          <p className="flex items-center gap-2 text-[length:var(--text-small-size)] text-fg-secondary">
            <IconMail size={14} stroke={1.5} /> {client.email}
          </p>
        ) : null}
        {client.phone ? (
          <p className="flex items-center gap-2 text-[length:var(--text-small-size)] text-fg-secondary">
            <IconPhone size={14} stroke={1.5} /> {client.phone}
          </p>
        ) : null}
        {client.notes ? (
          <p className="whitespace-pre-wrap text-[length:var(--text-small-size)] text-fg-secondary">
            {client.notes}
          </p>
        ) : null}
      </div>

      {tasks.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
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
              label="Concluídas (30d)"
              value={stats.done30}
              icon={IconChecklist}
              tone="var(--color-fg-muted)"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[length:var(--text-caption-size)] text-fg-muted">
              <span>Progresso de entregas</span>
              <span className="tnum">{progressPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-sunken">
              <div
                className="h-full rounded-full bg-[var(--brand-600)] transition-[width] [transition-duration:var(--dur-base)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="text-[length:var(--text-small-size)] font-medium text-fg-secondary">
          Demandas{" "}
          <span className="tnum text-fg-muted">({stats.open} em aberto)</span>
        </h3>
        <TaskRows
          tasks={tasks}
          empty={
            <p className="py-6 text-center text-fg-secondary">
              Nenhuma demanda vinculada a este cliente ainda
            </p>
          }
        />
      </div>
    </div>
  );
}
