"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconArrowRight,
  IconDotsVertical,
  IconGripVertical,
  IconPlus,
} from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import type { ReactNode } from "react";

import { BoardColumn } from "./BoardColumn";

export interface BoardColumnData {
  id: string;
  name: string;
  position?: number;
  tone?: string;
  wipLimit?: number | null;
  /** Linha secundária do cabeçalho — texto pronto, montado por quem usa. */
  subtitle?: string;
}

export interface BoardProps<T> {
  columns: BoardColumnData[];
  items: T[];
  getItemId: (item: T) => string;
  getColumnId: (item: T) => string;
  getPosition: (item: T) => number;
  getItemLabel?: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  onMove: (itemId: string, toColumnId: string, toPosition: number) => void;
  onColumnCreate?: (name: string) => void;
  onColumnRename?: (id: string, name: string) => void;
  onColumnDelete?: (id: string) => void;
  onColumnReorder?: (id: string, dir: "left" | "right") => void;
  onColumnWipLimitChange?: (id: string, limit: number | null) => void;
  emptyColumnSlot?: (column: BoardColumnData) => ReactNode;
  isLoading?: boolean;
}

// Posição fracionária: valor entre os vizinhos, sem reescrever a coluna.
function fractionalPosition(positions: number[], index: number): number {
  const before = positions[index - 1];
  const after = positions[index];
  if (before === undefined && after === undefined) return 1;
  if (before === undefined) return after - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}

function SortableCard({
  id,
  label,
  columns,
  currentColumnId,
  onMoveToColumn,
  children,
}: {
  id: string;
  label: string;
  columns: BoardColumnData[];
  currentColumnId: string;
  onMoveToColumn: (toColumnId: string) => void;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const others = columns.filter((c) => c.id !== currentColumnId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="listitem"
      className={`group relative ${isDragging ? "opacity-50" : ""}`}
    >
      <div {...listeners} className="cursor-grab touch-none">
        {children}
      </div>

      {/* Handle de teclado: Tab foca, Espaço pega, setas movem, Espaço solta,
          Esc cancela (dnd-kit KeyboardSensor). Também arrasta com o ponteiro. */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Mover ${label}`}
        className="bg-card text-fg-muted hover:text-fg absolute top-1 left-1 inline-flex h-6 w-6 items-center justify-center rounded-sm opacity-0 shadow-[var(--shadow-peek)] transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
      >
        <IconGripVertical size={14} stroke={1.5} />
      </button>

      {others.length > 0 ? (
        <div className="absolute top-1 right-1">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="Mover para outra coluna"
                className="bg-card text-fg-muted hover:text-fg inline-flex h-6 w-6 items-center justify-center rounded-sm opacity-0 shadow-[var(--shadow-peek)] transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
              >
                <IconDotsVertical size={14} stroke={1.5} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className="tf-glass-strong z-50 min-w-44 overflow-hidden rounded-md p-1 data-[state=closed]:[animation:tf-pop-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-pop-in_var(--dur-fast)_var(--ease-out)]"
              >
                <DropdownMenu.Label className="text-fg-muted px-2 py-1 text-[length:var(--text-caption-size)]">
                  Mover para
                </DropdownMenu.Label>
                {others.map((col) => (
                  <DropdownMenu.Item
                    key={col.id}
                    onSelect={() => onMoveToColumn(col.id)}
                    className="text-fg data-[highlighted]:bg-hover flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] outline-none"
                  >
                    <IconArrowRight size={14} stroke={1.5} />
                    {col.name}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      ) : null}
    </div>
  );
}

function AddColumn({ onCreate }: { onCreate: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-line text-fg-secondary hover:bg-hover hover:text-fg flex h-10 w-72 shrink-0 items-center gap-2 rounded-md border border-dashed px-3 text-[length:var(--text-small-size)] whitespace-nowrap transition-colors [transition-duration:var(--dur-fast)]"
      >
        <IconPlus size={16} stroke={1.5} />
        Adicionar coluna
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed) {
          onCreate(trimmed);
          setName("");
          setOpen(false);
        }
      }}
      className="bg-sunken flex w-72 shrink-0 flex-col gap-2 rounded-md p-2"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da coluna"
        aria-label="Nome da nova coluna"
        className="border-line bg-card text-fg placeholder:text-fg-muted h-8 rounded-sm border px-2 text-[length:var(--text-small-size)]"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="h-8 rounded-sm bg-[var(--button-primary-bg)] px-3 text-[length:var(--text-small-size)] whitespace-nowrap text-[var(--button-primary-fg)] hover:bg-[var(--button-primary-bg-hover)]"
        >
          Adicionar
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setName("");
          }}
          className="text-fg-secondary hover:bg-card hover:text-fg h-8 rounded-sm px-3 text-[length:var(--text-small-size)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function Board<T>({
  columns,
  items,
  getItemId,
  getColumnId,
  getPosition,
  getItemLabel,
  renderCard,
  onMove,
  onColumnCreate,
  onColumnRename,
  onColumnDelete,
  onColumnReorder,
  onColumnWipLimitChange,
  emptyColumnSlot,
}: BoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function labelFor(id: string): string {
    const col = columns.find((c) => c.id === id);
    if (col) return col.name;
    const item = items.find((it) => getItemId(it) === id);
    return item && getItemLabel ? getItemLabel(item) : "item";
  }

  // Anúncios em pt-BR para o leitor de tela durante o arraste por teclado.
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Pegou ${labelFor(String(active.id))}`,
    onDragOver: ({ active, over }) =>
      over
        ? `${labelFor(String(active.id))} sobre ${labelFor(String(over.id))}`
        : "",
    onDragEnd: ({ active, over }) =>
      over
        ? `${labelFor(String(active.id))} solto sobre ${labelFor(String(over.id))}`
        : `Soltou ${labelFor(String(active.id))}`,
    onDragCancel: ({ active }) =>
      `Movimento de ${labelFor(String(active.id))} cancelado`,
  };

  // Agrupa itens por coluna, ordenados por posição.
  const grouped = new Map<string, T[]>();
  for (const col of columns) grouped.set(col.id, []);
  for (const item of items) {
    const list = grouped.get(getColumnId(item));
    if (list) list.push(item);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => getPosition(a) - getPosition(b));
  }

  function columnIdOf(id: string): string | null {
    if (columns.some((c) => c.id === id)) return id;
    const item = items.find((it) => getItemId(it) === id);
    return item ? getColumnId(item) : null;
  }

  function announceMove(toColumnId: string, index: number, total: number) {
    const col = columns.find((c) => c.id === toColumnId);
    setLiveMessage(
      `Movido para ${col?.name ?? "coluna"}, posição ${index + 1} de ${total}`
    );
  }

  function moveTo(itemId: string, toColumnId: string, index: number) {
    const dest = (grouped.get(toColumnId) ?? []).filter(
      (it) => getItemId(it) !== itemId
    );
    const clamped = Math.max(0, Math.min(index, dest.length));
    const position = fractionalPosition(dest.map(getPosition), clamped);
    onMove(itemId, toColumnId, position);
    announceMove(toColumnId, clamped, dest.length + 1);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const itemId = String(active.id);
    const overId = String(over.id);
    const toColumnId = columnIdOf(overId);
    if (!toColumnId) return;

    const dest = (grouped.get(toColumnId) ?? []).filter(
      (it) => getItemId(it) !== itemId
    );
    let index: number;
    if (columns.some((c) => c.id === overId)) {
      index = dest.length;
    } else {
      const overIdx = dest.findIndex((it) => getItemId(it) === overId);
      index = overIdx < 0 ? dest.length : overIdx;
    }
    moveTo(itemId, toColumnId, index);
  }

  const activeItem = activeId
    ? items.find((it) => getItemId(it) === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{ announcements }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full gap-3 overflow-x-auto pb-2">
        {columns.map((col, colIndex) => {
          const colItems = grouped.get(col.id) ?? [];
          return (
            <BoardColumn
              key={col.id}
              id={col.id}
              name={col.name}
              subtitle={col.subtitle}
              tone={col.tone}
              count={colItems.length}
              wipLimit={col.wipLimit}
              itemIds={colItems.map(getItemId)}
              footer={emptyColumnSlot?.(col)}
              onWipLimitChange={
                onColumnWipLimitChange
                  ? (limit) => onColumnWipLimitChange(col.id, limit)
                  : undefined
              }
              onRename={
                onColumnRename
                  ? (name) => onColumnRename(col.id, name)
                  : undefined
              }
              onDelete={
                onColumnDelete && columns.length > 1
                  ? () => onColumnDelete(col.id)
                  : undefined
              }
              onMoveLeft={
                onColumnReorder && colIndex > 0
                  ? () => onColumnReorder(col.id, "left")
                  : undefined
              }
              onMoveRight={
                onColumnReorder && colIndex < columns.length - 1
                  ? () => onColumnReorder(col.id, "right")
                  : undefined
              }
            >
              {colItems.map((item) => {
                const itemId = getItemId(item);
                return (
                  <SortableCard
                    key={itemId}
                    id={itemId}
                    label={getItemLabel ? getItemLabel(item) : "item"}
                    columns={columns}
                    currentColumnId={col.id}
                    onMoveToColumn={(toColumnId) =>
                      moveTo(itemId, toColumnId, Number.MAX_SAFE_INTEGER)
                    }
                  >
                    {renderCard(item)}
                  </SortableCard>
                );
              })}
            </BoardColumn>
          );
        })}

        {onColumnCreate ? <AddColumn onCreate={onColumnCreate} /> : null}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="cursor-grabbing">{renderCard(activeItem)}</div>
        ) : null}
      </DragOverlay>

      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>
    </DndContext>
  );
}
