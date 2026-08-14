"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { FinanceEntry, TablesInsert, TablesUpdate } from "@/types/database";

function financeKey(workspaceId: string) {
  return ["finance", workspaceId] as const;
}

// Busca tudo (sem recorte de mês) — a agregação/filtro roda no cliente,
// mesmo padrão do Dashboard e da view Lista de Demandas.
export function useFinanceEntries(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: financeKey(workspaceId),
    queryFn: async (): Promise<FinanceEntry[]> => {
      const { data, error } = await supabase
        .from("finance_entry")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateFinanceEntry(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"finance_entry">, "workspace_id">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("finance_entry").insert({
        ...input,
        workspace_id: workspaceId,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: financeKey(workspaceId) }),
  });
}

export function useUpdateFinanceEntry(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: TablesUpdate<"finance_entry">;
    }) => {
      const { error } = await supabase.from("finance_entry").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: financeKey(workspaceId) }),
  });
}

// Marca como recebida/paga (confirmado) na data informada, ou reabre
// (volta para 'previsto', limpa a data de confirmação).
export function useConfirmFinanceEntry(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      confirmedOn,
    }: {
      id: string;
      confirmedOn: string | null; // null = reabrir
    }) => {
      const { error } = await supabase
        .from("finance_entry")
        .update({
          status: confirmedOn ? "confirmado" : "previsto",
          confirmed_at: confirmedOn,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: financeKey(workspaceId) }),
  });
}

export function useDeleteFinanceEntry(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_entry").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: financeKey(workspaceId) }),
  });
}
