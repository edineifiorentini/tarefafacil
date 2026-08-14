"use client";

import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { useDeleteSector } from "@/lib/queries/useSectors";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Sector } from "@/types/database";

export function DeleteSectorDialog({
  sector,
  onDone,
}: {
  sector: Sector;
  onDone: () => void;
}) {
  const workspace = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const del = useDeleteSector(workspace.id);

  function confirm() {
    del.mutate(sector.id, {
      onSuccess: () => {
        onDone();
        if (pathname === `/setor/${sector.id}`) router.push("/hoje");
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-fg-secondary">
        Excluir <strong className="text-fg">{sector.name}</strong> apaga o setor
        e <strong className="text-fg">todas as tarefas e projetos dele</strong>,
        de forma permanente. Não dá para desfazer.
      </p>
      <p className="text-fg-muted text-[length:var(--text-small-size)]">
        Para preservar as tarefas, use <strong>Arquivar</strong> em vez de
        excluir.
      </p>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button variant="danger" isLoading={del.isPending} onClick={confirm}>
          Excluir setor
        </Button>
      </div>
    </div>
  );
}
