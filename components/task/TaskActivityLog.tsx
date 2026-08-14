"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { PRIORITY_LABELS } from "@/lib/task/priority-labels";
import { useBoardColumns } from "@/lib/queries/useBoardColumns";
import { useMembers } from "@/lib/queries/useMembers";
import { useTaskActivity } from "@/lib/queries/useTaskActivity";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { TaskActivity, TaskPriority } from "@/types/database";

const FIELD_LABELS: Record<string, string> = {
  completed_at: "conclusão",
  cancelled_at: "cancelamento",
  due_date: "prazo",
  priority: "prioridade",
  assignee_id: "responsável",
  column_id: "coluna",
};

function formatDate(v: string | null): string {
  if (!v) return "sem data";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
}

function describe(
  row: TaskActivity,
  membersByI: Map<string, string>,
  columnsById: Map<string, string>
): string {
  const label = FIELD_LABELS[row.field] ?? row.field;
  switch (row.field) {
    case "completed_at":
      return row.new_value ? "marcou como concluída" : "reabriu a demanda";
    case "cancelled_at":
      return row.new_value
        ? "cancelou a demanda"
        : "reabriu a demanda cancelada";
    case "due_date":
      return `mudou o ${label} de ${formatDate(row.old_value)} para ${formatDate(row.new_value)}`;
    case "priority":
      return `mudou a ${label} de ${
        PRIORITY_LABELS[row.old_value as TaskPriority] ?? row.old_value
      } para ${PRIORITY_LABELS[row.new_value as TaskPriority] ?? row.new_value}`;
    case "assignee_id":
      return `mudou o ${label} de ${
        row.old_value ? (membersByI.get(row.old_value) ?? "alguém") : "ninguém"
      } para ${row.new_value ? (membersByI.get(row.new_value) ?? "alguém") : "ninguém"}`;
    case "column_id":
      return `moveu de ${columnsById.get(row.old_value ?? "") ?? "—"} para ${columnsById.get(row.new_value ?? "") ?? "—"}`;
    default:
      return `alterou ${label}`;
  }
}

export function TaskActivityLog({
  taskId,
  sectorId,
}: {
  taskId: string;
  sectorId: string;
}) {
  const workspace = useWorkspace();
  const { data: activity = [] } = useTaskActivity(taskId);
  const { data: members = [] } = useMembers(workspace.id);
  const { data: columns = [] } = useBoardColumns(workspace.id, sectorId);

  if (activity.length === 0) {
    return (
      <p className="text-fg-secondary text-[length:var(--text-small-size)]">
        Nenhuma alteração registrada ainda
      </p>
    );
  }

  const membersByI = new Map(
    members.map((m) => [m.user_id, m.display_name ?? m.email])
  );
  const columnsById = new Map(columns.map((c) => [c.id, c.name]));

  return (
    <ul className="flex flex-col gap-2">
      {activity.map((row) => {
        const actor = row.changed_by
          ? (membersByI.get(row.changed_by) ?? "Alguém")
          : "Sistema";
        return (
          <li
            key={row.id}
            className="text-fg-secondary text-[length:var(--text-small-size)]"
          >
            <span className="text-fg font-medium">{actor}</span>{" "}
            {describe(row, membersByI, columnsById)}
            {" · "}
            <span className="text-fg-muted">
              {formatDistanceToNow(new Date(row.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
