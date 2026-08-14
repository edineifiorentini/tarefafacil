import {
  IconBan,
  IconCalendarUp,
  IconDotsVertical,
  IconRotate,
  IconTrash,
} from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";

import { Checkbox } from "@/components/ui/Checkbox";
import type { Sector, Task } from "@/types/database";

import { AssigneeAvatar } from "./AssigneeAvatar";
import { DueChip } from "./DueChip";
import { PriorityBadge } from "./PriorityBadge";
import { SectorDot } from "./SectorDot";

// Linha de tarefa — 48px. A linha toda é alvo de clique (abre detalhe),
// exceto o checkbox (design 8.2).
export function TaskRow({
  task,
  sector,
  onToggle,
  onOpen,
  onDelete,
  onToggleCancel,
  selected,
  onSelectChange,
}: {
  task: Task;
  sector?: Sector;
  onToggle: (completed: boolean) => void;
  onOpen: () => void;
  onDelete: () => void;
  onToggleCancel?: (cancel: boolean) => void;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
}) {
  const done = task.completed_at !== null;
  const cancelled = task.cancelled_at !== null;
  const closed = done || cancelled;

  return (
    <div className="group flex h-14 items-center gap-3 rounded-md px-3 hover:bg-sunken">
      {onSelectChange ? (
        <Checkbox
          checked={!!selected}
          onCheckedChange={(c) => onSelectChange(c === true)}
          aria-label={selected ? "Remover da seleção" : "Selecionar demanda"}
        />
      ) : null}
      <Checkbox
        variant="round"
        checked={done}
        disabled={cancelled}
        onCheckedChange={(c) => onToggle(c === true)}
        aria-label={done ? "Reabrir demanda" : "Concluir demanda"}
      />
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span
          className={`truncate ${closed ? "text-done line-through" : "text-fg"}`}
        >
          {task.title}
        </span>
        {cancelled ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-[length:var(--text-caption-size)] text-fg-muted">
            <IconBan size={12} stroke={2} aria-hidden />
            Cancelada
          </span>
        ) : null}
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
        {!closed ? <PriorityBadge priority={task.priority} /> : null}
        {task.due_date ? (
          <DueChip date={task.due_date} time={task.due_time} />
        ) : null}
        <AssigneeAvatar assigneeId={task.assignee_id} />
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
              {onToggleCancel ? (
                <DropdownMenu.Item
                  onSelect={() => onToggleCancel(!cancelled)}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-sunken"
                >
                  {cancelled ? (
                    <IconRotate size={16} stroke={1.5} />
                  ) : (
                    <IconBan size={16} stroke={1.5} />
                  )}
                  {cancelled ? "Reabrir demanda" : "Cancelar demanda"}
                </DropdownMenu.Item>
              ) : null}
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
