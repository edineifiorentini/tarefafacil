"use client";

import type { ReactNode } from "react";

import { IconX } from "@tabler/icons-react";

import { useShell } from "./shell-context";

/**
 * Cabeçalho fixo e miolo que rola, dentro do modal centralizado.
 *
 * É o mínimo que o painel lateral dava de graça e o modal não dá: um lugar
 * para o título e um jeito de fechar com o dedo.
 *
 * Mora na casca, e não junto da tarefa, porque quem abre modal não é só a
 * tarefa: o formulário de setor também precisa dele, e ele não pode
 * importar nada de `components/task` sem criar um ciclo.
 */
export function ModalFrame({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  const { closeModal } = useShell();

  return (
    <>
      <header className="border-line flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <p className="text-fg text-[length:var(--text-h3-size)] font-medium">
          {titulo}
        </p>
        <button
          type="button"
          onClick={closeModal}
          aria-label="Fechar"
          // 44px de alvo, que é o mínimo para o dedo — o ícone de 20px
          // sozinho seria uma mira, não um botão.
          className="text-fg-secondary hover:text-fg hover:bg-sunken -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors [transition-duration:var(--dur-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <IconX size={20} stroke={1.5} aria-hidden />
        </button>
      </header>

      {/* A rolagem é AQUI, não na página: o cabeçalho fica parado e o fundo
          não rola junto. */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-5">
        {children}
      </div>
    </>
  );
}
