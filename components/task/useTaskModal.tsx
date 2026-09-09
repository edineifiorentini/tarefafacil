"use client";

import { useCallback } from "react";

import { ModalFrame } from "@/components/shell/ModalFrame";
import { useShell } from "@/components/shell/shell-context";

import { QuickAdd } from "./QuickAdd";
import { TaskDetailPanel } from "./TaskDetailPanel";

/**
 * Como uma tarefa abre — decidido num lugar só.
 *
 * **São catorze pontos de entrada**: Lista, Quadro, Hoje, Calendário,
 * Dashboard, Chat, notificações, o botão de nova tarefa em três telas e a
 * própria criação, que abre a tarefa recém-criada. Antes cada um montava a
 * chamada à mão, com título e componente repetidos; trocar o recipiente
 * exigia mexer nos catorze.
 *
 * Agora eles chamam `abrirTarefa(id)` e `abrirNovaTarefa()`, e quem decide o
 * resto é este arquivo. As fatias seguintes — abas, aprovação,
 * versionamento — mudam aqui dentro, não lá fora.
 *
 * **O `QuickAdd` NÃO importa este hook**, e isso é o que evita um ciclo:
 * este arquivo importa o formulário, então o caminho de volta seria
 * circular. Ele recebe `onCriada` e avisa; quem decide o que fazer com a
 * tarefa nova é quem abriu o modal. Formulário não deveria mesmo conhecer
 * o recipiente em que está.
 */
export function useTaskModal() {
  const { openModal, closeModal } = useShell();

  const abrirTarefa = useCallback(
    (taskId: string) => {
      openModal({
        titulo: "Tarefa",
        // Mais larga: a tarefa existente tem abas e conteúdo lado a lado.
        largura: "larga",
        node: (
          <ModalFrame titulo="Tarefa">
            <TaskDetailPanel taskId={taskId} />
          </ModalFrame>
        ),
      });
    },
    [openModal]
  );

  const abrirNovaTarefa = useCallback(
    (opcoes?: { setorId?: string }) => {
      openModal({
        titulo: "Nova tarefa",
        // Mais estreita: formulário curto não quer largura, quer foco.
        largura: "media",
        node: (
          <ModalFrame titulo="Nova tarefa">
            <QuickAdd
              defaultSectorId={opcoes?.setorId}
              onCriada={abrirTarefa}
            />
          </ModalFrame>
        ),
      });
    },
    [openModal, abrirTarefa]
  );

  return { abrirTarefa, abrirNovaTarefa, fechar: closeModal };
}
