"use client";

import { IconArchive } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  useArchiveProject,
  useUnarchiveProject,
} from "@/lib/queries/useProjects";
import { useWorkspace } from "@/lib/queries/useWorkspace";

/**
 * Arquivar um projeto.
 *
 * **Arquivar não apaga nada.** As demandas continuam existindo e continuam
 * apontando para o projeto; ele é que sai das listas. É diferente da
 * exclusão de cliente, que tem cascata — por isso aqui o texto é curto e não
 * assusta.
 *
 * O `Desfazer` no aviso é o que torna a ação segura. Sem ele, um clique
 * errado tiraria o projeto de todas as telas sem caminho de volta, porque a
 * interface não lista projeto arquivado.
 */
export function ProjectActions({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const workspace = useWorkspace();
  const { openPanel, closePanel } = useShell();
  const toast = useToast();
  const router = useRouter();
  const arquivar = useArchiveProject(workspace.id);
  const desarquivar = useUnarchiveProject(workspace.id);

  function confirmar() {
    arquivar.mutate(projectId, {
      onSuccess: () => {
        closePanel();
        toast.show({
          message: "Projeto arquivado",
          actionLabel: "Desfazer",
          onAction: () =>
            desarquivar.mutate(projectId, {
              onSuccess: () => toast.show({ message: "Projeto restaurado" }),
            }),
          // Mais tempo que o padrão: desfazer só serve se a pessoa ainda o
          // alcançar, e ela acabou de mudar de tela.
          duration: 8000,
        });
        router.push("/hoje");
      },
      onError: () => toast.show({ message: "Não foi possível arquivar" }),
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      leadingIcon={IconArchive}
      onClick={() =>
        openPanel({
          title: "Arquivar projeto",
          node: (
            <div className="flex flex-col gap-4">
              <p className="text-fg-secondary">
                Arquivar <strong className="text-fg">{projectName}</strong> o
                tira das listas. As demandas continuam onde estão.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={closePanel}>
                  Cancelar
                </Button>
                <Button
                  variant="secondary"
                  isLoading={arquivar.isPending}
                  onClick={confirmar}
                >
                  Arquivar projeto
                </Button>
              </div>
            </div>
          ),
        })
      }
    >
      Arquivar
    </Button>
  );
}
