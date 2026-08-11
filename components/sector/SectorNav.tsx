"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconArchive,
  IconDotsVertical,
  IconGripVertical,
  IconPencil,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useRef, type MouseEvent } from "react";

import { useShell } from "@/components/shell/shell-context";
import { useReorderSectors } from "@/lib/queries/useSectors";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Sector } from "@/types/database";

import { ArchiveSectorDialog } from "./ArchiveSectorDialog";
import { SectorForm } from "./SectorForm";

const reveal =
  "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100";

function SectorItem({
  sector,
  active,
  onEdit,
  onArchive,
  guardClick,
}: {
  sector: Sector;
  active: boolean;
  onEdit: () => void;
  onArchive: () => void;
  guardClick: () => boolean;
}) {
  const { setMobileNavOpen } = useShell();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sector.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function handleClick(e: MouseEvent) {
    // Se um arraste acabou de acontecer, não navega.
    if (guardClick()) {
      e.preventDefault();
      return;
    }
    setMobileNavOpen(false);
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group flex items-center rounded-sm ${
        isDragging ? "opacity-60" : ""
      } ${active ? "bg-selected" : "hover:bg-sunken"}`}
    >
      {/* A linha inteira é o alvo de arraste (mouse e teclado). Clique simples
          navega; clique-arrastando reordena. Link ignora Espaço, então o
          Espaço fica livre para o dnd-kit pegar o item por teclado. */}
      <Link
        href={`/setor/${sector.id}`}
        aria-current={active ? "page" : undefined}
        onClick={handleClick}
        aria-describedby={attributes["aria-describedby"]}
        aria-roledescription={attributes["aria-roledescription"]}
        {...listeners}
        className={`flex min-w-0 flex-1 cursor-grab items-center gap-1 py-2 pl-1 pr-1 ${
          active ? "text-fg" : "text-fg-secondary group-hover:text-fg"
        }`}
      >
        <IconGripVertical
          aria-hidden
          size={14}
          stroke={1.5}
          className={`shrink-0 text-fg-muted ${reveal}`}
        />
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: sector.color }}
        />
        <span className="truncate">{sector.name}</span>
      </Link>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={`Ações de ${sector.name}`}
            className={`mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-fg-muted hover:text-fg ${reveal}`}
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
              onSelect={onEdit}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-sunken"
            >
              <IconPencil size={16} stroke={1.5} />
              Editar
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={onArchive}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[length:var(--text-small-size)] text-fg outline-none data-[highlighted]:bg-sunken"
            >
              <IconArchive size={16} stroke={1.5} />
              Arquivar
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </li>
  );
}

export function SectorNav({ sectors }: { sectors: Sector[] }) {
  const workspace = useWorkspace();
  const pathname = usePathname();
  const reorder = useReorderSectors(workspace.id);
  const { openPanel, closePanel } = useShell();

  // Marca que um arraste ocorreu, para suprimir o clique de navegação seguinte.
  const dragged = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function guardClick() {
    if (dragged.current) {
      dragged.current = false;
      return true;
    }
    return false;
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = sectors.map((s) => s.id);
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from >= 0 && to >= 0) reorder.mutate(arrayMove(ids, from, to));
    }
  }

  if (sectors.length === 0) {
    return (
      <p className="px-3 py-2 text-[length:var(--text-small-size)] text-fg-muted">
        Nenhum setor ainda
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => {
        dragged.current = true;
      }}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={sectors.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-1">
          {sectors.map((sector) => (
            <SectorItem
              key={sector.id}
              sector={sector}
              active={pathname === `/setor/${sector.id}`}
              guardClick={guardClick}
              onEdit={() =>
                openPanel({
                  title: "Editar setor",
                  node: (
                    <SectorForm mode="edit" sector={sector} onDone={closePanel} />
                  ),
                })
              }
              onArchive={() =>
                openPanel({
                  title: "Arquivar setor",
                  node: (
                    <ArchiveSectorDialog
                      sector={sector}
                      sectors={sectors}
                      onDone={closePanel}
                    />
                  ),
                })
              }
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
