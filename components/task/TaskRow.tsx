import { IconCalendarUp, IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";

import { Checkbox } from "@/components/ui/Checkbox";
import type { Sector, Task } from "@/types/database";

import { DueChip } from "./DueChip";
import { SectorDot } from "./SectorDot";

// Linha de tarefa — 48px. A linha toda é alvo de clique (abre detalhe),
// exceto o checkbox (design 8.2).
export function TaskRow({
  task,
  sector,
  onToggle,
  onOpen,
  onDelete,
}: {
  task: Task;
  sector?: Sector;
  onToggle: (completed: boolean) => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const done = task.completed_at !== null;

  return (
    <div className="group flex h-12 items-center gap-3 rounded-sm px-2 hover:bg-sunken">
      <Checkbox
        variant="round"
        checked={done}
        onCheckedChange={(c) => onToggle(c === true)}
        aria-label={done ? "Reabrir tarefa" : "Concluir tarefa"}
      />
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center text-left"
      >
        <span
          className={`truncate ${done ? "text-done line-through" : "text-fg"}`}
        >
          {task.title}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        {task.gcal_external_edit_at ? (
          <IconCalendarUp
            size={14}
            stroke={1.5}
            className="text-fg-muted"
            aria-label="Editado no Google Agenda"
          />
        ) : null}
        {sector ? <SectorDot color={sector.color} name={sector.name} /> : null}
        {task.due_date ? <DueChip date={task.due_date} /> : null}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={`Ações de ${task.title}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-fg-muted opacity-0 transition-opacity hover:text-fg group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            >
              <IconDotsVertical size={16} stroke={1.5} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-50 min-w-40 overflow-hidden rounded-md border border-line bg-card p-1 shadow-[var(--shadow-panel)] data-[state=closed]:[animation:tf-pop-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
            >
              <DropdownMenu.Item
                onSelect={onDelete}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-sunken"
              >
                <IconTrash size={16} stroke={1.5} />
                Excluir
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}
