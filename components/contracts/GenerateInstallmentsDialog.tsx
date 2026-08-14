"use client";

import { AlertDialog } from "radix-ui";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { planInstallments } from "@/lib/contracts/installments";
import { formatCentsBRL } from "@/lib/finance/money";
import {
  useContractInstallments,
  useGenerateContractInstallments,
} from "@/lib/queries/useContractFinance";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Contract } from "@/types/database";

// Confirmação explícita antes de gerar (spec §13.1.2: "usuário confirma
// geração financeira"). Compara com o que já existe (por número de
// parcela) e só mostra/gera o que falta — idempotente mesmo reabrindo.
export function GenerateInstallmentsDialog({
  contract,
  onOpenChange,
}: {
  contract: Contract;
  onOpenChange: (open: boolean) => void;
}) {
  const workspace = useWorkspace();
  const toast = useToast();
  const { data: existing = [] } = useContractInstallments(contract.id);
  const generate = useGenerateContractInstallments(workspace.id);

  const planned = planInstallments(contract);
  const existingNumbers = new Set(existing.map((e) => e.installment_number));
  const missing = planned.filter((p) => !existingNumbers.has(p.number));
  const total = missing.reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <AlertDialog.Root open onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <AlertDialog.Content className="tf-glass-strong fixed top-1/2 left-1/2 z-50 w-[min(28rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-md p-5 text-left">
          <AlertDialog.Title className="text-fg text-[length:var(--text-h3-size)] font-semibold">
            Gerar parcelas no Financeiro
          </AlertDialog.Title>
          <AlertDialog.Description className="text-fg-secondary mt-2">
            {planned.length === 0
              ? "Este contrato precisa de valor e início de vigência preenchidos para gerar parcelas."
              : missing.length === 0
                ? "Todas as parcelas previstas para este contrato já foram geradas."
                : `Isso vai criar ${missing.length} lançamento${missing.length === 1 ? "" : "s"} de entrada, totalizando ${formatCentsBRL(total)}, vinculado${missing.length === 1 ? "" : "s"} a este contrato.`}
          </AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost">Fechar</Button>
            </AlertDialog.Cancel>
            {missing.length > 0 ? (
              <AlertDialog.Action asChild>
                <Button
                  variant="primary"
                  isLoading={generate.isPending}
                  onClick={() => {
                    generate.mutate(contract, {
                      onSuccess: (count) =>
                        toast.show({
                          message: `${count} parcela${count === 1 ? "" : "s"} criada${count === 1 ? "" : "s"} no Financeiro`,
                        }),
                      onError: () =>
                        toast.show({
                          message: "Não foi possível gerar as parcelas",
                        }),
                    });
                  }}
                >
                  Gerar parcelas
                </Button>
              </AlertDialog.Action>
            ) : null}
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
