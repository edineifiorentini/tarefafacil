"use client";

import { useState } from "react";

import { useShell } from "@/components/shell/shell-context";
import { useSectors } from "@/lib/queries/useSectors";
import {
  countOpenSubtasks,
  useCompleteTask,
  useDeleteTask,
  useTasks,
  useToggleTaskComplete,
} from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Task } from "@/types/database";

import { ConfirmCompleteDialog } from "./ConfirmCompleteDialog";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { TaskRow } from "./TaskRow";

type StatusFilter = "abertas" | "concluidas" | "todas";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "abertas", label: "Abertas" },
  { key: "concluidas", label: "Concluídas" },
  { key: "todas", label: "Todas" },
];

export function TaskList({ sectorId }: { sectorId?: string }) {
  const workspace = useWorkspace();
  const { data: tasks = [] } = useTasks(workspace.id, sectorId);
  const { data: sectors = [] } = useSectors(workspace.id);
  const toggle = useToggleTaskComplete(workspace.id);
  const complete = useCompleteTask(workspace.id);
  const deleteTask = useDeleteTask(workspace.id);
  const { openPanel } = useShell();

  const [filter, setFilter] = useState<StatusFilter>("abertas");
  const [confirm, setConfirm] = useState<{ task: Task; count: number } | null>(
    null
  );

  const sectorsById = new Map(sectors.map((s) => [s.id, s]));

  const visible = tasks.filter((t) => {
    if (filter === "abertas") return t.completed_at === null;
    if (filter === "concluidas") return t.completed_at !== null;
    return true;
  });

  async function handleToggle(task: Task, completed: boolean) {
    if (!completed) {
      toggle.mutate({ id: task.id, completed: false });
      return;
    }
    const open = await countOpenSubtasks(task.id);
    if (open > 0) {
      setConfirm({ task, count: open });
      return;
    }
    toggle.mutate({ id: task.id, completed: true });
  }

  return (
    <div>
      <div className="mb-2 flex gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`rounded-full px-3 py-1 text-[length:var(--text-small-size)] transition-colors [transition-duration:var(--dur-fast)] ${
              filter === f.key
                ? "bg-selected text-fg"
                : "text-fg-secondary hover:bg-sunken"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="border-line bg-card rounded-md border p-[var(--space-card-pad)] text-center">
          <p className="text-fg font-medium">Nada por aqui</p>
          <p className="text-fg-secondary mt-1 text-[length:var(--text-small-size)]">
            {filter === "abertas"
              ? "Adicione a primeira tarefa no campo acima."
              : "Nenhuma tarefa neste filtro."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {visible.map((task) => (
            <li key={task.id}>
              <TaskRow
                task={task}
                sector={sectorsById.get(task.sector_id)}
                onToggle={(c) => handleToggle(task, c)}
                onDelete={() => deleteTask(task)}
                onOpen={() =>
                  openPanel({
                    title: "Tarefa",
                    node: <TaskDetailPanel taskId={task.id} />,
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}

      {confirm ? (
        <ConfirmCompleteDialog
          open
          count={confirm.count}
          onOpenChange={(o) => {
            if (!o) setConfirm(null);
          }}
          onCompleteAll={() => {
            complete.mutate({ id: confirm.task.id, alsoSubtasks: true });
            setConfirm(null);
          }}
          onCompleteTaskOnly={() => {
            toggle.mutate({ id: confirm.task.id, completed: true });
            setConfirm(null);
          }}
        />
      ) : null}
    </div>
  );
}
