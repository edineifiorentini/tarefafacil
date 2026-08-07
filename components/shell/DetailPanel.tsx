"use client";

import { IconX } from "@tabler/icons-react";
import { Dialog } from "radix-ui";

import { useShell } from "./shell-context";

/**
 * Painel de detalhe de 400px que desliza sobre o conteúdo (design 5.2).
 * role="dialog" com foco preso e retorno de foco (Radix). Abaixo de 1280px
 * (xl) vira sheet com overlay escurecido; a partir de 1280px o overlay é
 * transparente para o usuário não perder o contexto. Conteúdo vem do contexto.
 */
export function DetailPanel() {
  const { panel, closePanel } = useShell();
  const open = panel !== null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) closePanel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)] xl:bg-transparent" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-line bg-card shadow-[var(--shadow-panel)] outline-none data-[state=open]:[animation:tf-slide-in-right_var(--dur-slow)_var(--ease-out)]"
        >
          <div className="flex items-center justify-between border-b border-line p-[var(--space-panel-pad)]">
            <Dialog.Title className="text-[length:var(--text-h3-size)] font-medium text-fg">
              {panel?.title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Fechar painel"
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-fg-secondary transition-colors [transition-duration:var(--dur-fast)] hover:text-fg"
            >
              <IconX size={20} stroke={1.5} />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-auto p-[var(--space-panel-pad)]">
            {panel?.node}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
