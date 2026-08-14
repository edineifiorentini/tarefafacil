"use client";

import { TaskRows } from "@/components/task/TaskRows";
import { useProjectTasks } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";

import { ProjectProgress } from "./ProjectProgress";

export function ProjectView({ projectId }: { projectId: string }) {
  const workspace = useWorkspace();
  const { data: tasks = [] } = useProjectTasks(workspace.id, projectId);
  const done = tasks.filter((t) => t.completed_at !== null).length;

  return (
    <div className="flex flex-col gap-4">
      <ProjectProgress done={done} total={tasks.length} />
      <TaskRows
        tasks={tasks}
        empty={
          <div className="border-line bg-card rounded-md border p-[var(--space-card-pad)] text-center">
            <p className="text-fg font-medium">Nenhuma tarefa neste projeto</p>
            <p className="text-fg-secondary mt-1 text-[length:var(--text-small-size)]">
              Vincule tarefas ao projeto pelo campo “Projeto” no painel de
              detalhe.
            </p>
          </div>
        }
      />
    </div>
  );
}
