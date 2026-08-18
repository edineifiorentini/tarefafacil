"use client";

import { AlertDialog } from "radix-ui";

import { Button } from "@/components/ui/Button";

/**
 * Confirmação de exclusão. Excluir demanda leva junto subtarefas,
 * comentários, tempo registrado e anexos — e não há desfazer.
 *
 * `AlertDialog` e não `Dialog`: o papel de alerta prende o foco e faz o
 * leitor de tela anunciar que há uma decisão a tomar, que é o ponto de uma
 * confirmação destrutiva.
 */
export function ConfirmDeleteDialog({
  open,
  title,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  /** Título da demanda, para a pessoa conferir que é a certa. */
  title: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[90] bg-black/40 data-[state=closed]:[animation:tf-fade-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]" />
        <AlertDialog.Content className="tf-glass-strong fixed top-1/2 left-1/2 z-[95] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg p-6 data-[state=closed]:[animation:tf-dialog-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-dialog-in_var(--dur-base)_var(--ease-out)]">
          <AlertDialog.Title className="text-fg text-[length:var(--text-h3-size)] font-medium">
            Excluir demanda?
          </AlertDialog.Title>
          <AlertDialog.Description className="text-fg-secondary mt-2 wrap-anywhere">
            &ldquo;{title}&rdquo; sai junto com subtarefas, comentários, tempo
            registrado e anexos. Não dá para desfazer.
          </AlertDialog.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost">Cancelar</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant="danger" onClick={onConfirm}>
                Excluir
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
