"use client";

import Link from "next/link";

import { useGcalStatus, useToggleTaskSync } from "@/lib/queries/useGcal";
import { useTaskDetail } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";

// Alternador de sincronização por tarefa. Nasce desligado (regra 10) e fica
// desabilitado sem conexão. Subtarefa nunca chega aqui (RN-02).
export function TaskSyncToggle({ taskId }: { taskId: string }) {
  const workspace = useWorkspace();
  const { data: task } = useTaskDetail(workspace.id, taskId);
  const { data: status } = useGcalStatus();
  const toggle = useToggleTaskSync(workspace.id);

  const connected = status?.connected ?? false;
  const on = task?.gcal_sync ?? false;
  const disabled = !connected || toggle.isPending;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[length:var(--text-small-size)] text-fg">
          Mostrar no Google Agenda
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Mostrar no Google Agenda"
          disabled={disabled}
          onClick={() => toggle.mutate({ id: taskId, sync: !on })}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors [transition-duration:var(--dur-fast)] disabled:cursor-not-allowed disabled:opacity-50 ${
            on ? "bg-[var(--fill-brand)]" : "bg-sunken"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-card transition-transform [transition-duration:var(--dur-fast)] ${
              on ? "translate-x-4" : ""
            }`}
          />
        </button>
      </div>

      {!connected ? (
        <span className="text-[length:var(--text-caption-size)] text-fg-muted">
          {status?.configured === false ? (
            "Integração com o Google indisponível neste ambiente"
          ) : (
            <>
              Conecte o Google Agenda em{" "}
              <Link href="/config" className="text-fg-link underline">
                Configurações
              </Link>
            </>
          )}
        </span>
      ) : on && !task?.due_date ? (
        <span className="text-[length:var(--text-caption-size)] text-fg-muted">
          Defina um prazo para criar o evento
        </span>
      ) : null}
    </div>
  );
}
