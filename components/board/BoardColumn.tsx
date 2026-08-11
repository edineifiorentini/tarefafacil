"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";

// Casca genérica de coluna: cabeçalho, contador e área de soltura.
// Não conhece o tipo dos itens.
export function BoardColumn({
  id,
  name,
  count,
  itemIds,
  children,
  footer,
}: {
  id: string;
  name: string;
  count: number;
  itemIds: string[];
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      aria-label={`${name}, ${count} ${count === 1 ? "item" : "itens"}`}
      className="flex w-72 shrink-0 flex-col rounded-md bg-sunken"
    >
      <header className="flex items-center gap-2 px-3 py-2">
        <span className="text-[length:var(--text-small-size)] font-medium text-fg">
          {name}
        </span>
        <Badge variant="neutral">{count}</Badge>
      </header>
      <div
        ref={setNodeRef}
        className={`flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto rounded-b-md p-2 transition-colors [transition-duration:var(--dur-fast)] ${
          isOver ? "bg-selected" : ""
        }`}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
        {footer}
      </div>
    </section>
  );
}
