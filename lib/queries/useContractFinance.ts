"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { planInstallments } from "@/lib/contracts/installments";
import { createClient } from "@/lib/supabase/client";
import type { Contract, FinanceEntry } from "@/types/database";

function installmentsKey(contractId: string) {
  return ["contractInstallments", contractId] as const;
}

// Lançamentos já gerados a partir deste contrato (spec §13.1: origem
// rastreável por source_type/source_id).
export function useContractInstallments(contractId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: installmentsKey(contractId),
    enabled: !!contractId,
    queryFn: async (): Promise<FinanceEntry[]> => {
      const { data, error } = await supabase
        .from("finance_entry")
        .select("*")
        .eq("source_type", "contract")
        .eq("source_id", contractId)
        .order("installment_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// Gera as parcelas que ainda não existem (idempotente: compara com o que
// já foi criado por número de parcela antes de inserir — e o índice único
// parcial no banco cobre a corrida caso o botão seja clicado duas vezes).
export function useGenerateContractInstallments(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (contract: Contract): Promise<number> => {
      const planned = planInstallments(contract);
      if (planned.length === 0) return 0;

      const { data: existing, error: existingError } = await supabase
        .from("finance_entry")
        .select("installment_number")
        .eq("source_type", "contract")
        .eq("source_id", contract.id);
      if (existingError) throw existingError;

      const existingNumbers = new Set(existing.map((e) => e.installment_number));
      const missing = planned.filter((p) => !existingNumbers.has(p.number));
      if (missing.length === 0) return 0;

      const { error } = await supabase.from("finance_entry").insert(
        missing.map((p) => ({
          workspace_id: workspaceId,
          kind: "entrada" as const,
          description: `${contract.title} — parcela ${p.number}/${planned.length}`,
          amount_cents: p.amountCents,
          status: "previsto" as const,
          due_date: p.dueDate,
          category: "Contrato",
          client_id: contract.client_id,
          source_type: "contract",
          source_id: contract.id,
          installment_number: p.number,
        }))
      );
      if (error) throw error;
      return missing.length;
    },
    onSuccess: (_count, contract) => {
      void qc.invalidateQueries({ queryKey: installmentsKey(contract.id) });
      void qc.invalidateQueries({ queryKey: ["finance", workspaceId] });
    },
  });
}
