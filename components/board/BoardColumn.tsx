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
  IconGauge,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import type { ReactNode } from "react";

// Casca genérica de coluna: cabeçalho, contador e área de soltura.
// Não conhece o tipo dos itens. Gerenciamento (renomear/mover/excluir) só
// aparece quando os callbacks são passados.
export function BoardColumn({
  id,
  name,
  tone,
  count,
  wipLimit,
  itemIds,
  children,
  footer,
  onRename,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onWipLimitChange,
}: {
  id: string;
  name: string;
  tone?: string;
  count: number;
  wipLimit?: number | null;
  itemIds: string[];
  children: ReactNode;
  footer?: ReactNode;
  onRename?: (name: string) => void;
  onDelete?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onWipLimitChange?: (limit: number | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [editingWip, setEditingWip] = useState(false);
  const [wipDraft, setWipDraft] = useState(wipLimit ? String(wipLimit) : "");

  const manageable = !!(
    onRename ||
    onDelete ||
    onMoveLeft ||
    onMoveRight ||
    onWipLimitChange
  );
  const overWip = !!wipLimit && count > wipLimit;

  function commitWipLimit() {
    const trimmed = wipDraft.trim();
    const parsed = trimmed ? Number.parseInt(trimmed, 10) : null;
    onWipLimitChange?.(parsed && parsed > 0 ? parsed : null);
    setEditingWip(false);
  }
  const dot = `var(--tone-${tone ?? "neutral"})`;
  const pillBg = `color-mix(in srgb, ${dot} 14%, var(--surface-card))`;

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename?.(trimmed);
    else setDraft(name);
    setEditing(false);
  }

  return (
    <section
      aria-label={`${name}, ${count} ${count === 1 ? "item" : "itens"}`}
      className="bg-sunken flex w-72 shrink-0 flex-col rounded-md"
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
            className="border-line bg-card text-fg h-6 min-w-0 flex-1 rounded-sm border px-1 text-[length:var(--text-small-size)] font-medium"
          />
        ) : (
          <span
            className="text-fg inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[length:var(--text-small-size)] font-medium"
            style={{ backgroundColor: pillBg }}
          >
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: dot }}
            />
            <span className="truncate">{name}</span>
          </span>
        )}
        {editingWip ? (
          <input
            autoFocus
            inputMode="numeric"
            value={wipDraft}
            onChange={(e) => setWipDraft(e.target.value.replace(/\D/g, ""))}
            onBlur={commitWipLimit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitWipLimit();
              if (e.key === "Escape") {
                setWipDraft(wipLimit ? String(wipLimit) : "");
                setEditingWip(false);
              }
            }}
            aria-label="Limite de trabalho em progresso"
            placeholder="sem limite"
            className="border-line bg-card tnum text-fg h-6 w-16 rounded-sm border px-1 text-[length:var(--text-caption-size)]"
          />
        ) : (
          <span
            className={`tnum text-[length:var(--text-caption-size)] ${
              overWip ? "text-overdue font-medium" : "text-fg-muted"
            }`}
            title={
              overWip ? "Limite de trabalho em progresso excedido" : undefined
            }
          >
            {wipLimit ? `${count}/${wipLimit}` : count}
          </span>
        )}
        <span className="flex-1" />

        {manageable && !editing ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label={`Ações da coluna ${name}`}
                className="text-fg-muted hover:bg-card hover:text-fg data-[state=open]:bg-card inline-flex h-6 w-6 items-center justify-center rounded-sm transition-colors [transition-duration:var(--dur-fast)]"
              >
                <IconDotsVertical size={14} stroke={1.5} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                // Sem isto, o Radix devolve o foco ao botão de ações ao
                // fechar — o que dispara onBlur no input de renomear/WIP
                // que acabou de abrir, fechando-o antes do usuário ver.
                onCloseAutoFocus={(e) => e.preventDefault()}
                className="tf-glass-strong z-50 min-w-40 overflow-hidden rounded-md p-1 data-[state=closed]:[animation:tf-pop-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
              >
                {onRename ? (
                  <DropdownMenu.Item
                    onSelect={() => {
                      setDraft(name);
                      setEditing(true);
                    }}
                    className="text-fg data-[highlighted]:bg-sunken flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
                  >
                    <IconPencil size={14} stroke={1.5} />
                    Renomear
                  </DropdownMenu.Item>
                ) : null}
                {onMoveLeft ? (
                  <DropdownMenu.Item
                    onSelect={() => onMoveLeft()}
                    className="text-fg data-[highlighted]:bg-sunken flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
                  >
                    <IconArrowLeft size={14} stroke={1.5} />
                    Mover para esquerda
                  </DropdownMenu.Item>
                ) : null}
                {onMoveRight ? (
                  <DropdownMenu.Item
                    onSelect={() => onMoveRight()}
                    className="text-fg data-[highlighted]:bg-sunken flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
                  >
                    <IconArrowRight size={14} stroke={1.5} />
                    Mover para direita
                  </DropdownMenu.Item>
                ) : null}
                {onWipLimitChange ? (
                  <DropdownMenu.Item
                    onSelect={() => {
                      setWipDraft(wipLimit ? String(wipLimit) : "");
                      setEditingWip(true);
                    }}
                    className="text-fg data-[highlighted]:bg-sunken flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
                  >
                    <IconGauge size={14} stroke={1.5} />
                    {wipLimit
                      ? "Alterar limite de WIP"
                      : "Definir limite de WIP"}
                  </DropdownMenu.Item>
                ) : null}
                {onDelete ? (
                  <DropdownMenu.Item
                    onSelect={() => onDelete()}
                    className="text-overdue data-[highlighted]:bg-sunken flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
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
