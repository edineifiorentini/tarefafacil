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
 * resto é este arquivo.
 *
 * **O `QuickAdd` NÃO importa este hook**, e isso é o que evita um ciclo:
 * este arquivo importa o formulário, então o caminho de volta seria
 * circular. Ele recebe `onCriada` e avisa; quem decide o que fazer com a
 * tarefa nova é quem abriu o modal. Formulário não deveria mesmo conhecer
 * o recipiente em que está.
 */

/** O parâmetro que representa a tarefa aberta. */
export const PARAM_TAREFA = "tarefa";

export function useTaskModal() {
  const { openModal, closeModal } = useShell();

  const abrirTarefa = useCallback(
    (taskId: string, opcoes?: { comUrl?: boolean }) => {
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

      // **`history.pushState` direto, e não navegação do Next.**
      //
      // O que se quer é a URL refletir a tarefa aberta e o botão voltar
      // fechá-la. Uma navegação de verdade re-renderiza a página de baixo —
      // e junto vão os filtros, o agrupamento, a ordenação e a posição de
      // rolagem de quem estava na Lista. Preservar isso é o motivo de o
      // modal existir.
      //
      // Vem DEPOIS de abrir: o sincronizador reage ao modal fechar, e
      // empurrar antes o faria ver "sem modal, com parâmetro" e desfazer na
      // hora.
      //
      // `comUrl: false` é para quem já está reagindo à URL — voltar do
      // navegador e link direto —, que empilharia entrada em cima de si
      // mesmo.
      if (opcoes?.comUrl === false || typeof window === "undefined") return;
      const url = new URL(window.location.href);
      url.searchParams.set(PARAM_TAREFA, taskId);
      window.history.pushState(
        { ...window.history.state, tfTarefa: taskId },
        "",
        `${url.pathname}${url.search}${url.hash}`
      );
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
              onCriada={(id) => abrirTarefa(id)}
            />
          </ModalFrame>
        ),
      });
      // A criação NÃO entra na URL: não há tarefa ainda, e um endereço que
      // abre formulário vazio não é link que alguém queira mandar.
    },
    [openModal, abrirTarefa]
  );

  return { abrirTarefa, abrirNovaTarefa, fechar: closeModal };
}
