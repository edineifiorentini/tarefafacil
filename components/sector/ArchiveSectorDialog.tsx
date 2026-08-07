"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useArchiveSector } from "@/lib/queries/useSectors";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Sector } from "@/types/database";

export function ArchiveSectorDialog({
  sector,
  sectors,
  onDone,
}: {
  sector: Sector;
  sectors: Sector[];
  onDone: () => void;
}) {
  const workspace = useWorkspace();
  const archive = useArchiveSector(workspace.id);
  const others = sectors.filter((s) => s.id !== sector.id);

  const [mode, setMode] = useState<"move" | "together">(
    others.length > 0 ? "move" : "together"
  );
  const [target, setTarget] = useState(others[0]?.id ?? "");

  function confirm() {
    archive.mutate({
      id: sector.id,
      moveToSectorId: mode === "move" ? target : undefined,
    });
    onDone();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-fg-secondary">
        Arquivar <strong className="text-fg">{sector.name}</strong>. O que fazer
        com as tarefas dele?
      </p>

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Destino das tarefas</legend>

        {others.length > 0 ? (
          <>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="dest"
                checked={mode === "move"}
                onChange={() => setMode("move")}
              />
              <span className="text-fg">Mover as tarefas para outro setor</span>
            </label>
            {mode === "move" ? (
              <div className="pl-6">
                <Select
                  options={others.map((o) => ({ value: o.id, label: o.name }))}
                  value={target}
                  onValueChange={setTarget}
                  aria-label="Setor de destino"
                />
              </div>
            ) : null}
          </>
        ) : null}

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="dest"
            checked={mode === "together"}
            onChange={() => setMode("together")}
          />
          <span className="text-fg">Arquivar o setor e as tarefas juntos</span>
        </label>
      </fieldset>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={confirm}
          disabled={mode === "move" && !target}
        >
          Arquivar
        </Button>
      </div>
    </div>
  );
}
