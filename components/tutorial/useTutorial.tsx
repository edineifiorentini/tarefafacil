"use client";

import { useCallback } from "react";

import { useShell } from "@/components/shell/shell-context";

import { Tutorial } from "./Tutorial";

/**
 * Abrir o guia, de onde for.
 *
 * Existe para o botão da barra e para a abertura automática chamarem a
 * mesma coisa — é o que garante que o guia que aparece sozinho na primeira
 * vez é exatamente o guia que o botão traz de volta depois.
 */
export function useTutorial() {
  const { openModal } = useShell();

  const abrirTutorial = useCallback(() => {
    openModal({
      titulo: "Como usar o TAFLOW",
      node: <Tutorial />,
      largura: "media",
    });
  }, [openModal]);

  return { abrirTutorial };
}
