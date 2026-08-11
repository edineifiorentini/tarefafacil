"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconArrowRight, IconDotsVertical } from "@tabler/icons-react";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import type { ReactNode } from "react";

import { BoardColumn } from "./BoardColumn";

export interface BoardColumnData {
  id: string;
  name: string;
  position?: number;
}

export interface BoardProps<T> {
  columns: BoardColumnData[];
  items: T[];
  getItemId: (item: T) => string;
  getColumnId: (item: T) => string;
  getPosition: (item: T) => number;
  renderCard: (item: T) => ReactNode;
  onMove: (itemId: string, toColumnId: string, toPosition: number) => void;
  onColumnCreate?: (name: string) => void;
  onColumnRename?: (id: string, name: string) => void;
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
  columns,
  currentColumnId,
  onMoveToColumn,
  children,
}: {
  id: string;
  columns: BoardColumnData[];
  currentColumnId: string;
  onMoveToColumn: (toColumnId: string) => void;
  children: ReactNode;
}) {
  const { listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const others = columns.filter((c) => c.id !== currentColumnId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${isDragging ? "opacity-50" : ""}`}
    >
      <div {...listeners} className="cursor-grab touch-none">
        {children}
      </div>

      {others.length > 0 ? (
        <div className="absolute right-1 top-1">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="Mover para outra coluna"
                className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-card text-fg-muted opacity-0 shadow-[var(--shadow-peek)] transition-opacity hover:text-fg group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
              >
                <IconDotsVertical size={14} stroke={1.5} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className="z-50 min-w-44 overflow-hidden rounded-md border border-line bg-card p-1 shadow-[var(--shadow-panel)]"
              >
                <DropdownMenu.Label className="px-2 py-1 text-[length:var(--text-caption-size)] text-fg-muted">
                  Mover para
                </DropdownMenu.Label>
                {others.map((col) => (
                  <DropdownMenu.Item
                    key={col.id}
                    onSelect={() => onMoveToColumn(col.id)}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-sunken"
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

export function Board<T>({
  columns,
  items,
  getItemId,
  getColumnId,
  getPosition,
  renderCard,
  onMove,
  emptyColumnSlot,
}: BoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

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
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full gap-3 overflow-x-auto pb-2">
        {columns.map((col) => {
          const colItems = grouped.get(col.id) ?? [];
          return (
            <BoardColumn
              key={col.id}
              id={col.id}
              name={col.name}
              count={colItems.length}
              itemIds={colItems.map(getItemId)}
              footer={emptyColumnSlot?.(col)}
            >
              {colItems.map((item) => {
                const itemId = getItemId(item);
                return (
                  <SortableCard
                    key={itemId}
                    id={itemId}
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
      </div>

      <DragOverlay>
        {activeItem ? <div className="cursor-grabbing">{renderCard(activeItem)}</div> : null}
      </DragOverlay>

      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>
    </DndContext>
  );
}
