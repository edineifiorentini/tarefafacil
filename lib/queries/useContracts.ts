"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { freezeContractBody } from "@/lib/contracts/snapshot";
import { createClient } from "@/lib/supabase/client";
import type {
  Contract,
  ContractStatus,
  TablesInsert,
  TablesUpdate,
} from "@/types/database";

function contractsKey(workspaceId: string) {
  return ["contracts", workspaceId] as const;
}

/**
 * `enabled` segue o mesmo critério de `useFinanceEntries`: contrato é visível
 * só para dono/admin (RLS), então não vale disparar a consulta para quem vai
 * receber lista vazia.
 */
export function useContracts(workspaceId: string, enabled = true) {
  const supabase = createClient();
  return useQuery({
    enabled,
    queryKey: contractsKey(workspaceId),
    queryFn: async (): Promise<Contract[]> => {
      const { data, error } = await supabase
        .from("contract")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateContract(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<TablesInsert<"contract">, "workspace_id">
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("contract").insert({
        ...input,
        workspace_id: workspaceId,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: contractsKey(workspaceId) }),
  });
}

export function useUpdateContract(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: TablesUpdate<"contract">;
    }) => {
      const { error } = await supabase
        .from("contract")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: contractsKey(workspaceId) }),
  });
}

// Transição de estado (rascunho -> enviado -> assinado -> ativo, ou
// encerrado/cancelado a qualquer momento). Assinatura externa: grava
// data + link do documento junto quando fornecidos.
export function useSetContractStatus(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      signedAt,
      signedDocumentUrl,
    }: {
      id: string;
      status: ContractStatus;
      signedAt?: string | null;
      signedDocumentUrl?: string | null;
    }) => {
      const patch: TablesUpdate<"contract"> = { status };
      if (signedAt !== undefined) patch.signed_at = signedAt;
      if (signedDocumentUrl !== undefined)
        patch.signed_document_url = signedDocumentUrl;
      const { error } = await supabase
        .from("contract")
        .update(patch)
        .eq("id", id);
      if (error) throw error;

      // Spec §9.4: ao deixar de ser rascunho o texto é congelado. A partir
      // daqui nem editar o modelo nem corrigir o cadastro do cliente muda
      // o documento — o que foi enviado é o que vale.
      if (status !== "rascunho") {
        await freezeContractBody(supabase, id);
      }

      // Spec §13.1.6: cancelar o contrato cancela as parcelas futuras AINDA
      // NÃO pagas geradas a partir dele — as já confirmadas (recebidas)
      // ficam intactas, preservando o histórico realizado.
      if (status === "cancelado") {
        const today = new Date().toISOString().slice(0, 10);
        const { error: financeError } = await supabase
          .from("finance_entry")
          .update({ status: "cancelado" })
          .eq("source_type", "contract")
          .eq("source_id", id)
          .eq("status", "previsto")
          .gte("due_date", today);
        if (financeError) throw financeError;
      }
    },
    onSettled: (_d, _e, { id }) => {
      void qc.invalidateQueries({ queryKey: contractsKey(workspaceId) });
      void qc.invalidateQueries({ queryKey: ["finance", workspaceId] });
      void qc.invalidateQueries({ queryKey: ["contractInstallments", id] });
    },
  });
}

export function useDeleteContract(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contract").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: contractsKey(workspaceId) }),
  });
}
