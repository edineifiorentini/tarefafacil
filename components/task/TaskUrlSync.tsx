"use client";

import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

import { useShell, type ModalContent } from "@/components/shell/shell-context";

import { PARAM_TAREFA, useTaskModal } from "./useTaskModal";

/**
 * A tarefa aberta e a barra de endereços contando a mesma história.
 *
 * Montado UMA vez, na casca. Três coisas, e cada uma tinha um jeito de dar
 * errado sozinha:
 *
 * 1. **Fechou o modal → o parâmetro sai.** Vale para todos os caminhos de
 *    fechamento — o X, o Escape, o clique fora, e o fechamento automático
 *    depois de excluir. Amarrar isso a cada botão deixaria um deles para
 *    trás, e a URL passaria a mentir.
 *
 * 2. **Voltar do navegador → fecha.** Sem isto o botão voltar sairia da
 *    página inteira com o modal aberto por cima, que é o comportamento que
 *    faz alguém perder a lista filtrada em que estava.
 *
 * 3. **Link direto abre a tarefa.** Colar um endereço com `?tarefa=` numa
 *    aba nova precisa abrir a demanda, senão o link que alguém mandou no
 *    chat não leva a lugar nenhum.
 *
 * Quem quer a tela inteira tem `/tarefa/[id]`, que é outra rota e não passa
 * por aqui.
 */
export function TaskUrlSync() {
  const { modal, closeModal } = useShell();
  const { abrirTarefa } = useTaskModal();

  // O estado anterior, para distinguir "fechou agora" de "nunca abriu".
  // Sem isso, a primeira renderização — que tem modal nulo — apagaria o
  // parâmetro de um link direto antes de ele chegar a abrir.
  const anterior = useRef<ModalContent>(null);

  useEffect(() => {
    const fechouAgora = anterior.current !== null && modal === null;
    anterior.current = modal;
    if (!fechouAgora) return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has(PARAM_TAREFA)) return;

    // Se fomos NÓS que empilhamos a entrada, voltar é o certo: o histórico
    // fica limpo e o botão voltar não leva de volta para a tarefa que a
    // pessoa acabou de fechar. Em link direto não empilhamos nada, e voltar
    // tiraria a pessoa do app — aí só se corrige o endereço.
    if (window.history.state?.tfTarefa) {
      window.history.back();
      return;
    }
    url.searchParams.delete(PARAM_TAREFA);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [modal]);

  useEffect(() => {
    function aoVoltar() {
      const id = new URL(window.location.href).searchParams.get(PARAM_TAREFA);

      // **`flushSync` porque `popstate` não é evento discreto para o React.**
      //
      // A atualização entra em prioridade normal, e o agendador cede lugar
      // para o resto do trabalho da página até a fila expirar. Medido em
      // 9/set/2026, com a aba visível e em foco: o evento chegava em 42ms e
      // o modal só sumia da tela **4 segundos depois** — contra 213ms
      // fechando pelo X, que é clique e portanto discreto.
      //
      // Quatro segundos de modal pendurado depois de apertar voltar é o
      // tipo de coisa que faz a pessoa apertar de novo, e aí ela sai da
      // página. Resposta a navegação é urgente por definição.
      flushSync(() => {
        // Voltou PARA uma tarefa (o histórico tinha duas) — reabre. Voltou
        // para fora dela, fecha.
        if (id) abrirTarefa(id, { comUrl: false });
        else closeModal();
      });
    }
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, [abrirTarefa, closeModal]);

  // Link direto. Roda uma vez: depois disso quem manda é o histórico.
  const jaConferiu = useRef(false);
  useEffect(() => {
    if (jaConferiu.current) return;
    jaConferiu.current = true;
    const id = new URL(window.location.href).searchParams.get(PARAM_TAREFA);
    if (id) abrirTarefa(id, { comUrl: false });
  }, [abrirTarefa]);

  return null;
}
