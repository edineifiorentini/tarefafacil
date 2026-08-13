"use client";

import { IconMail, IconPhone, IconPencil } from "@tabler/icons-react";

import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import { TaskRows } from "@/components/task/TaskRows";
import { useClientDetail, useClientTasks } from "@/lib/queries/useClients";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { ClientStatus } from "@/types/database";

import { ClientForm } from "./ClientForm";
import { ClientStatusPill } from "./ClientStatusPill";

export function ClientDetail({ clientId }: { clientId: string }) {
  const workspace = useWorkspace();
  const { data: client } = useClientDetail(workspace.id, clientId);
  const { data: tasks = [] } = useClientTasks(workspace.id, clientId);
  const { openPanel, closePanel } = useShell();

  if (!client) {
    return <p className="text-fg-secondary">Carregando…</p>;
  }

  const openTotal = tasks.filter((t) => !t.completed_at).length;

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

      <div className="flex flex-col gap-2">
        <h3 className="text-[length:var(--text-small-size)] font-medium text-fg-secondary">
          Demandas{" "}
          <span className="tnum text-fg-muted">({openTotal} em aberto)</span>
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
