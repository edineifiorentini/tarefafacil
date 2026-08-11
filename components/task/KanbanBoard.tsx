"use client";

import { Board } from "@/components/board/Board";
import { useShell } from "@/components/shell/shell-context";
import { useBoardColumns } from "@/lib/queries/useBoardColumns";
import { useMoveTask, useTasks } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Task } from "@/types/database";

import { TaskCard } from "./TaskCard";
import { TaskDetailPanel } from "./TaskDetailPanel";

export function KanbanBoard({ sectorId }: { sectorId: string }) {
  const workspace = useWorkspace();
  const { data: columns = [] } = useBoardColumns(workspace.id, sectorId);
  const { data: tasks = [] } = useTasks(workspace.id, sectorId);
  const move = useMoveTask(workspace.id);
  const { openPanel } = useShell();

  const firstColumnId = columns[0]?.id ?? "";

  if (columns.length === 0) {
    return (
      <p className="text-fg-secondary">Este setor ainda não tem colunas.</p>
    );
  }

  return (
    <Board<Task>
      columns={columns.map((c) => ({ id: c.id, name: c.name }))}
      items={tasks}
      getItemId={(t) => t.id}
      getColumnId={(t) => t.column_id ?? firstColumnId}
      getPosition={(t) => t.position}
      getItemLabel={(t) => t.title}
      renderCard={(t) => (
        <TaskCard
          task={t}
          onOpen={() =>
            openPanel({
              title: "Tarefa",
              node: <TaskDetailPanel taskId={t.id} />,
            })
          }
        />
      )}
      onMove={(itemId, toColumnId, toPosition) => {
        const col = columns.find((c) => c.id === toColumnId);
        move.mutate({
          id: itemId,
          columnId: toColumnId,
          position: toPosition,
          completed: col?.is_done_column ?? false,
        });
      }}
    />
  );
}
