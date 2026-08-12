"use client";

import { IconVideo } from "@tabler/icons-react";

import { Checkbox } from "@/components/ui/Checkbox";
import { useGcalStatus, useToggleTaskMeet } from "@/lib/queries/useGcal";
import { useTaskDetail } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";

// Opção de criar um link do Google Meet, junto ao horário. Só faz sentido com
// conexão ativa e uma data (o Meet vive no evento da agenda).
export function TaskMeetToggle({ taskId }: { taskId: string }) {
  const workspace = useWorkspace();
  const { data: task } = useTaskDetail(workspace.id, taskId);
  const { data: status } = useGcalStatus();
  const toggle = useToggleTaskMeet(workspace.id);

  const connected = status?.connected ?? false;
  const on = task?.gcal_add_meet ?? false;
  const disabled = !connected || !task?.due_date || toggle.isPending;

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-[length:var(--text-small-size)] text-fg">
        <Checkbox
          checked={on}
          onCheckedChange={(c) => toggle.mutate({ id: taskId, on: c === true })}
          disabled={disabled}
          aria-label="Criar link do Google Meet"
        />
        Criar link do Google Meet
      </label>

      {task?.gcal_meet_url ? (
        <a
          href={task.gcal_meet_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1 text-[length:var(--text-caption-size)] text-fg-link"
        >
          <IconVideo size={14} stroke={1.5} />
          Entrar no Meet
        </a>
      ) : !connected ? (
        <span className="text-[length:var(--text-caption-size)] text-fg-muted">
          Conecte o Google Agenda para criar reuniões
        </span>
      ) : null}
    </div>
  );
}
