"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { ContractTemplate } from "@/types/database";

function templatesKey(workspaceId: string) {
  return ["contractTemplates", workspaceId] as const;
}

export function useContractTemplates(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: templatesKey(workspaceId),
    queryFn: async (): Promise<ContractTemplate[]> => {
      const { data, error } = await supabase
        .from("contract_template")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateContractTemplate(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, body }: { name: string; body: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("contract_template").insert({
        workspace_id: workspaceId,
        name,
        body,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: templatesKey(workspaceId) }),
  });
}

/**
 * Editar o corpo sobe a versão. Contratos já enviados guardam o próprio
 * snapshot, então não são afetados — a versão serve para saber qual texto
 * originou cada contrato.
 */
export function useUpdateContractTemplate(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      body,
      currentVersion,
      bodyChanged,
    }: {
      id: string;
      name: string;
      body: string;
      currentVersion: number;
      bodyChanged: boolean;
    }) => {
      const { error } = await supabase
        .from("contract_template")
        .update({
          name,
          body,
          version: bodyChanged ? currentVersion + 1 : currentVersion,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: templatesKey(workspaceId) }),
  });
}

/** Arquiva em vez de apagar: contratos antigos apontam para o modelo. */
export function useArchiveContractTemplate(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contract_template")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: templatesKey(workspaceId) }),
  });
}
