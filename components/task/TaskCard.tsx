import { IconBan } from "@tabler/icons-react";

import { Tag, type TagColor } from "@/components/ui/Tag";
import type { Progress } from "@/lib/queries/useCardMeta";
import type { Tag as TagType, Task } from "@/types/database";

import { AssigneeAvatar } from "./AssigneeAvatar";
import { DueChip } from "./DueChip";
import { PriorityBadge } from "./PriorityBadge";

// Card de tarefa dentro do Board. Borda de 1px, cantos suaves, com tags e
// progresso das subtarefas (forma moderna).
export function TaskCard({
  task,
  onOpen,
  tags = [],
  progress,
}: {
  task: Task;
  onOpen: () => void;
  tags?: TagType[];
  progress?: Progress;
}) {
  const done = task.completed_at !== null;
  const cancelled = task.cancelled_at !== null;
  const closed = done || cancelled;
  const hasMeta =
    task.due_date !== null ||
    (!closed && task.priority !== "media" && task.priority !== "sem_prioridade") ||
    task.assignee_id !== null;
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-lg border border-line bg-card p-3.5 text-left transition-[border-color,box-shadow] [transition-duration:var(--dur-fast)] hover:border-line-strong hover:shadow-[var(--shadow-peek)]"
    >
      <p
        className={`pr-6 font-medium text-[length:var(--text-small-size)] ${
          closed ? "text-done line-through" : "text-fg"
        }`}
      >
        {task.title}
      </p>

      {cancelled ? (
        <span className="mt-1 inline-flex items-center gap-1 text-[length:var(--text-caption-size)] text-fg-muted">
          <IconBan size={12} stroke={2} aria-hidden />
          Cancelada
        </span>
      ) : null}

      {tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((t) => (
            <Tag key={t.id} color={(t.color ?? "neutral") as TagColor}>
              {t.name}
            </Tag>
          ))}
        </div>
      ) : null}

      {hasMeta ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {task.due_date ? (
            <DueChip date={task.due_date} time={task.due_time} />
          ) : null}
          {!closed ? <PriorityBadge priority={task.priority} /> : null}
          <span className="ml-auto">
            <AssigneeAvatar assigneeId={task.assignee_id} />
          </span>
        </div>
      ) : null}

      {pct !== null ? (
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-[var(--fill-brand)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="tnum text-[length:var(--text-caption-size)] text-fg-muted">
            {pct}%
          </span>
        </div>
      ) : null}
    </button>
  );
}
