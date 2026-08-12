"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  IconArrowLeft,
  IconArrowRight,
  IconDotsVertical,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";

// Casca genérica de coluna: cabeçalho, contador e área de soltura.
// Não conhece o tipo dos itens. Gerenciamento (renomear/mover/excluir) só
// aparece quando os callbacks são passados.
export function BoardColumn({
  id,
  name,
  count,
  itemIds,
  children,
  footer,
  onRename,
  onDelete,
  onMoveLeft,
  onMoveRight,
}: {
  id: string;
  name: string;
  count: number;
  itemIds: string[];
  children: ReactNode;
  footer?: ReactNode;
  onRename?: (name: string) => void;
  onDelete?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const manageable = !!(onRename || onDelete || onMoveLeft || onMoveRight);

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename?.(trimmed);
    else setDraft(name);
    setEditing(false);
  }

  return (
    <section
      aria-label={`${name}, ${count} ${count === 1 ? "item" : "itens"}`}
      className="flex w-72 shrink-0 flex-col rounded-md bg-sunken"
    >
      <header className="flex items-center gap-2 px-3 py-2">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(name);
                setEditing(false);
              }
            }}
            aria-label="Nome da coluna"
            className="h-6 min-w-0 flex-1 rounded-sm border border-line bg-card px-1 text-[length:var(--text-small-size)] font-medium text-fg"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-[length:var(--text-small-size)] font-medium text-fg">
            {name}
          </span>
        )}
        <Badge variant="neutral">{count}</Badge>

        {manageable && !editing ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label={`Ações da coluna ${name}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-fg-muted transition-colors [transition-duration:var(--dur-fast)] hover:bg-card hover:text-fg data-[state=open]:bg-card"
              >
                <IconDotsVertical size={14} stroke={1.5} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className="z-50 min-w-40 overflow-hidden rounded-md border border-line bg-card p-1 shadow-[var(--shadow-panel)] data-[state=closed]:[animation:tf-pop-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
              >
                {onRename ? (
                  <DropdownMenu.Item
                    onSelect={() => {
                      setDraft(name);
                      setEditing(true);
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-sunken"
                  >
                    <IconPencil size={14} stroke={1.5} />
                    Renomear
                  </DropdownMenu.Item>
                ) : null}
                {onMoveLeft ? (
                  <DropdownMenu.Item
                    onSelect={() => onMoveLeft()}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-sunken"
                  >
                    <IconArrowLeft size={14} stroke={1.5} />
                    Mover para esquerda
                  </DropdownMenu.Item>
                ) : null}
                {onMoveRight ? (
                  <DropdownMenu.Item
                    onSelect={() => onMoveRight()}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-sunken"
                  >
                    <IconArrowRight size={14} stroke={1.5} />
                    Mover para direita
                  </DropdownMenu.Item>
                ) : null}
                {onDelete ? (
                  <DropdownMenu.Item
                    onSelect={() => onDelete()}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-overdue outline-none data-[highlighted]:bg-sunken"
                  >
                    <IconTrash size={14} stroke={1.5} />
                    Excluir coluna
                  </DropdownMenu.Item>
                ) : null}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : null}
      </header>

      <div
        ref={setNodeRef}
        className={`flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto rounded-b-md p-2 transition-colors [transition-duration:var(--dur-fast)] ${
          isOver ? "bg-selected" : ""
        }`}
      >
        <div role="list" aria-label={name} className="flex flex-col gap-2">
          <SortableContext
            items={itemIds}
            strategy={verticalListSortingStrategy}
          >
            {children}
          </SortableContext>
        </div>
        {footer}
      </div>
    </section>
  );
}
