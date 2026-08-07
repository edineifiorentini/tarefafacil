"use client";

import { useState } from "react";

import { Select } from "@/components/ui/Select";
import { useSectors } from "@/lib/queries/useSectors";
import { useWorkspace } from "@/lib/queries/useWorkspace";

import { KanbanBoard } from "./KanbanBoard";

// Quadro filtrável por setor (design 5.1). O Kanban é sempre por setor.
export function QuadroView() {
  const workspace = useWorkspace();
  const { data: sectors = [] } = useSectors(workspace.id);
  const [selected, setSelected] = useState("");

  const active = selected || sectors[0]?.id || "";

  if (sectors.length === 0) {
    return (
      <div className="p-6">
        <p className="text-fg-secondary">Crie um setor para ver o quadro.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="w-56">
        <Select
          options={sectors.map((s) => ({ value: s.id, label: s.name }))}
          value={active}
          onValueChange={setSelected}
          aria-label="Setor do quadro"
        />
      </div>
      <div className="min-h-0 flex-1">
        {active ? <KanbanBoard sectorId={active} /> : null}
      </div>
    </div>
  );
}
