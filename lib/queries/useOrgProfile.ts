"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { TablesUpdate, WorkspaceProfile } from "@/types/database";

function profileKey(workspaceId: string) {
  return ["orgProfile", workspaceId] as const;
}

/**
 * Dados da organização (o "contratado" dos contratos). Uma linha por
 * workspace; pode não existir ainda, então o retorno é anulável.
 */
export function useOrgProfile(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: profileKey(workspaceId),
    queryFn: async (): Promise<WorkspaceProfile | null> => {
      const { data, error } = await supabase
        .from("workspace_profile")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveOrgProfile(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: Omit<TablesUpdate<"workspace_profile">, "workspace_id">
    ) => {
      // upsert: a primeira gravação cria a linha, as seguintes atualizam.
      const { error } = await supabase
        .from("workspace_profile")
        .upsert(
          { ...patch, workspace_id: workspaceId },
          { onConflict: "workspace_id" }
        );
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: profileKey(workspaceId) }),
  });
}
