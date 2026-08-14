"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { useShell } from "@/components/shell/shell-context";
import { useSectors } from "@/lib/queries/useSectors";
import {
  countOpenSubtasks,
  useCompleteTask,
  useDeleteTask,
  useToggleTaskCancel,
  useToggleTaskComplete,
} from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Task } from "@/types/database";

import { ConfirmCompleteDialog } from "./ConfirmCompleteDialog";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { TaskRow } from "./TaskRow";

// Lista de tarefas reutilizável (Setor via TaskList, Projeto, etc.):
// concluir com RN-04, excluir com desfazer, abrir detalhe.
export function TaskRows({
  tasks,
  empty,
}: {
  tasks: Task[];
  empty?: ReactNode;
}) {
  const workspace = useWorkspace();
  const { data: sectors = [] } = useSectors(workspace.id);
  const toggle = useToggleTaskComplete(workspace.id);
  const complete = useCompleteTask(workspace.id);
  const deleteTask = useDeleteTask(workspace.id);
  const toggleCancel = useToggleTaskCancel(workspace.id);
  const { openPanel } = useShell();
  const [confirm, setConfirm] = useState<{ task: Task; count: number } | null>(
    null
  );

  const sectorsById = new Map(sectors.map((s) => [s.id, s]));

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

  if (tasks.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <>
      <ul className="flex flex-col">
        {tasks.map((task) => (
          <li key={task.id}>
            <TaskRow
              task={task}
              sector={sectorsById.get(task.sector_id)}
              onToggle={(c) => handleToggle(task, c)}
              onDelete={() => deleteTask(task)}
              onToggleCancel={(cancel) => toggleCancel.mutate({ id: task.id, cancel })}
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
    </>
  );
}
