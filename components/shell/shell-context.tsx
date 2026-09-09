"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export type PanelContent = { title: string; node: ReactNode } | null;

/**
 * Conteúdo do modal centralizado.
 *
 * **`titulo` é o nome ACESSÍVEL, não o cabeçalho desenhado.** Quem abre o
 * modal desenha o próprio topo — a tarefa mostra código, título editável,
 * status, prioridade, setor e menu de ações, coisas que um cabeçalho
 * genérico não sabe montar. O `titulo` vai para um `Dialog.Title` invisível,
 * que é o que o leitor de tela anuncia ao abrir.
 *
 * `largura` separa os dois usos: criar pede pouco espaço e a tarefa
 * existente pede o dobro, com abas e conteúdo lado a lado. Uma largura só
 * deixaria a criação larga demais ou a tarefa apertada.
 */
export type ModalContent = {
  titulo: string;
  node: ReactNode;
  largura?: "media" | "larga";
} | null;

type ShellContextValue = {
  panel: PanelContent;
  openPanel: (content: { title: string; node: ReactNode }) => void;
  closePanel: () => void;
  modal: ModalContent;
  openModal: (content: NonNullable<ModalContent>) => void;
  closeModal: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

/**
 * Estado da casca: painel lateral, modal centralizado e navegação mobile.
 *
 * **São dois recipientes, e é de propósito.** O painel de 400px continua
 * servindo cliente, contrato, projeto e negócio do funil — leituras curtas,
 * onde deslizar por cima sem perder o contexto é a coisa certa. A tarefa
 * saiu de lá porque não cabia: formulário longo espremido em 400px vira
 * rolagem infinita, e a tarefa existente ainda ganhou abas.
 */
export function ShellProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<PanelContent>(null);
  const [modal, setModal] = useState<ModalContent>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const openPanel = useCallback(
    (content: { title: string; node: ReactNode }) => setPanel(content),
    []
  );
  const closePanel = useCallback(() => setPanel(null), []);

  const openModal = useCallback(
    (content: NonNullable<ModalContent>) => setModal(content),
    []
  );
  const closeModal = useCallback(() => setModal(null), []);

  const value = useMemo<ShellContextValue>(
    () => ({
      panel,
      openPanel,
      closePanel,
      modal,
      openModal,
      closeModal,
      mobileNavOpen,
      setMobileNavOpen,
    }),
    [panel, openPanel, closePanel, modal, openModal, closeModal, mobileNavOpen]
  );

  return (
    <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
  );
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell deve ser usado dentro de ShellProvider");
  return ctx;
}
