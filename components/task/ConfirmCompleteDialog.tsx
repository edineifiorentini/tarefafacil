"use client";

import { AlertDialog } from "radix-ui";

import { Button } from "@/components/ui/Button";

// RN-04: concluir tarefa com subtarefas em aberto pede confirmação.
export function ConfirmCompleteDialog({
  open,
  count,
  onOpenChange,
  onCompleteAll,
  onCompleteTaskOnly,
}: {
  open: boolean;
  count: number;
  onOpenChange: (open: boolean) => void;
  onCompleteAll: () => void;
  onCompleteTaskOnly: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[90] bg-black/40 data-[state=closed]:[animation:tf-fade-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-fade-in_var(--dur-base)_var(--ease-out)]" />
        <AlertDialog.Content className="tf-glass-strong fixed top-1/2 left-1/2 z-[95] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg p-6 data-[state=closed]:[animation:tf-dialog-out_var(--dur-fast)_ease-in] data-[state=open]:[animation:tf-dialog-in_var(--dur-base)_var(--ease-out)]">
          <AlertDialog.Title className="text-fg text-[length:var(--text-h3-size)] font-medium">
            Concluir tarefa?
          </AlertDialog.Title>
          <AlertDialog.Description className="text-fg-secondary mt-2">
            {count} {count === 1 ? "etapa em aberto" : "etapas em aberto"}.
            Concluir mesmo assim?
          </AlertDialog.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost">Cancelar</Button>
            </AlertDialog.Cancel>
            <Button variant="secondary" onClick={onCompleteTaskOnly}>
              Concluir só a tarefa
            </Button>
            <Button variant="primary" onClick={onCompleteAll}>
              Concluir tudo
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
