"use client";

import { Board } from "@/components/board/Board";
import { useShell } from "@/components/shell/shell-context";
import {
  useSubtaskProgress,
  useTaskTagsBulk,
} from "@/lib/queries/useCardMeta";
import {
  useBoardColumns,
  useCreateColumn,
  useDeleteColumn,
  useRenameColumn,
  useReorderColumn,
  useSetColumnWipLimit,
} from "@/lib/queries/useBoardColumns";
import { useMoveTask, useTasks } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Task } from "@/types/database";

import { TaskCard } from "./TaskCard";
import { TaskDetailPanel } from "./TaskDetailPanel";

export function KanbanBoard({ sectorId }: { sectorId: string }) {
  const workspace = useWorkspace();
  const { data: columns = [] } = useBoardColumns(workspace.id, sectorId);
  const { data: tasks = [] } = useTasks(workspace.id, sectorId);
  const taskIds = tasks.map((t) => t.id);
  const { data: progressByTask } = useSubtaskProgress(workspace.id, taskIds);
  const { data: tagsByTask } = useTaskTagsBulk(workspace.id, taskIds);
  const move = useMoveTask(workspace.id);
  const createColumn = useCreateColumn(workspace.id, sectorId);
  const renameColumn = useRenameColumn(workspace.id, sectorId);
  const deleteColumn = useDeleteColumn(workspace.id, sectorId);
  const reorderColumn = useReorderColumn(workspace.id, sectorId);
  const setWipLimit = useSetColumnWipLimit(workspace.id, sectorId);
  const { openPanel } = useShell();

  const firstColumnId = columns[0]?.id ?? "";

  if (columns.length === 0) {
    return (
      <p className="text-fg-secondary">Este setor ainda não tem colunas.</p>
    );
  }

  // Tons das colunas (forma moderna). "Concluído" fica cinza (regra do design);
  // as demais ciclam pela paleta.
  const TONES = ["violet", "blue", "amber", "rose", "cyan"];
  let toneIndex = 0;

  return (
    <Board<Task>
      columns={columns.map((c) => ({
        id: c.id,
        name: c.name,
        tone: c.is_done_column ? "neutral" : TONES[toneIndex++ % TONES.length],
        wipLimit: c.wip_limit,
      }))}
      items={tasks}
      getItemId={(t) => t.id}
      getColumnId={(t) => t.column_id ?? firstColumnId}
      getPosition={(t) => t.position}
      getItemLabel={(t) => t.title}
      renderCard={(t) => (
        <TaskCard
          task={t}
          tags={tagsByTask?.get(t.id)}
          progress={progressByTask?.get(t.id)}
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
      onColumnCreate={(name) => createColumn.mutate(name)}
      onColumnRename={(id, name) => renameColumn.mutate({ id, name })}
      onColumnDelete={(id) => deleteColumn.mutate(id)}
      onColumnReorder={(id, dir) => reorderColumn.mutate({ id, dir })}
      onColumnWipLimitChange={(id, limit) => setWipLimit.mutate({ id, limit })}
    />
  );
}
