import { Badge } from "@/components/ui/Badge";
import type { Task } from "@/types/database";

import { DueChip } from "./DueChip";

// Card de tarefa dentro do Board. Borda de 1px, sem sombra (card em fluxo).
export function TaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const done = task.completed_at !== null;
  const hasMeta = task.due_date !== null || task.priority === "alta";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-md border border-line bg-card p-3 text-left transition-colors [transition-duration:var(--dur-fast)] hover:border-line-strong"
    >
      <p
        className={`pr-6 text-[length:var(--text-small-size)] ${
          done ? "text-done line-through" : "text-fg"
        }`}
      >
        {task.title}
      </p>
      {hasMeta ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {task.due_date ? (
            <DueChip date={task.due_date} time={task.due_time} />
          ) : null}
          {task.priority === "alta" ? (
            <Badge variant="overdue">Alta</Badge>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}
