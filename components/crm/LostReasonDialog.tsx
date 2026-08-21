"use client";

import { Dialog } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

/**
 * Motivo da perda, perguntado DEPOIS do arraste.
 *
 * O card já foi para "Perdido" quando esta caixa aparece — travar o gesto
 * num formulário faria a pessoa desistir de mover, e funil que não se move
 * não serve para nada. Responder é opcional: motivo em branco é melhor do
 * que motivo inventado para fechar a caixa.
 */
export function LostReasonDialog({
  open,
  dealTitle,
  onSave,
  onOpenChange,
}: {
  open: boolean;
  dealTitle: string;
  onSave: (reason: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [motivo, setMotivo] = useState("");

  function fechar() {
    setMotivo("");
    onOpenChange(false);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) fechar();
        else onOpenChange(true);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="tf-glass-strong fixed top-1/2 left-1/2 z-50 w-[min(30rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-md p-5 text-left">
          <Dialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
            Por que perdemos?
          </Dialog.Title>
          <Dialog.Description className="text-fg-secondary mt-1 text-[length:var(--text-small-size)]">
            {dealTitle}. Anotar agora é o que permite, daqui a seis meses, saber
            se o problema é preço ou prazo.
          </Dialog.Description>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const texto = motivo.trim();
              if (texto) onSave(texto);
              fechar();
            }}
            className="mt-4 flex flex-col gap-3"
          >
            <Textarea
              autogrow
              autoFocus
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Preço acima do orçamento, escolheu outro fornecedor, adiou o projeto…"
              aria-label="Motivo da perda"
            />
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">
                  Deixar em branco
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!motivo.trim()}
              >
                Salvar motivo
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
