"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ImpactoDaExclusao } from "@/lib/clients/deletion";
import { createClient } from "@/lib/supabase/client";
import type {
  Client,
  Task,
  TablesInsert,
  TablesUpdate,
} from "@/types/database";

const CLIENTS = "clients";

function clientsKey(workspaceId: string) {
  return [CLIENTS, workspaceId] as const;
}

export function useClients(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: clientsKey(workspaceId),
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from("client")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useClientDetail(workspaceId: string, clientId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["client", workspaceId, clientId],
    queryFn: async (): Promise<Client> => {
      const { data, error } = await supabase
        .from("client")
        .select("*")
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data;
    },
    initialData: () => {
      const list = qc.getQueryData<Client[]>(clientsKey(workspaceId));
      return list?.find((c) => c.id === clientId);
    },
  });
}

// Demandas (tarefas) vinculadas a um cliente.
export function useClientTasks(workspaceId: string, clientId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["clientTasks", workspaceId, clientId],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("task")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateClient(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"client">, "workspace_id">) => {
      const { data, error } = await supabase
        .from("client")
        .insert({ ...input, workspace_id: workspaceId })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: clientsKey(workspaceId) }),
  });
}

export function useUpdateClient(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: TablesUpdate<"client">;
    }) => {
      const { error } = await supabase
        .from("client")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: (_d, _e, { id }) => {
      void qc.invalidateQueries({ queryKey: clientsKey(workspaceId) });
      void qc.invalidateQueries({ queryKey: ["client", workspaceId, id] });
    },
  });
}

export function useDeleteClient(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client")
        .delete()
        .eq("id", id)
        // Empresa no WHERE, não só na permissão. A RLS já barra, mas é o
        // mesmo cinto usado em `webhooks/endpoints.ts`: um id de outra
        // empresa não deve nem chegar ao ponto de depender de policy.
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: clientsKey(workspaceId) });
      void qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });
}

/**
 * O que a exclusão de um cliente destrói.
 *
 * Existe porque as chaves estrangeiras se comportam de DUAS formas, e a
 * diferença é grave: tarefa e lançamento são `on delete set null` e
 * sobrevivem sem o vínculo, mas contrato e negociação são
 * `on delete cascade` — somem para sempre.
 *
 * Contrato é documento jurídico com o texto congelado no momento da
 * assinatura. Um diálogo que dissesse só "tem certeza?" estaria escondendo
 * exatamente a parte irreversível.
 */
export function useClientImpact(workspaceId: string, clientId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["client-impact", workspaceId, clientId] as const,
    queryFn: async (): Promise<ImpactoDaExclusao> => {
      const contar = async (tabela: "contract" | "deal" | "task" | "finance_entry") => {
        const { count } = await supabase
          .from(tabela)
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("client_id", clientId);
        return count ?? 0;
      };

      const [contratos, negociacoes, tarefas, lancamentos] = await Promise.all([
        contar("contract"),
        contar("deal"),
        contar("task"),
        contar("finance_entry"),
      ]);

      return { contratos, negociacoes, tarefas, lancamentos };
    },
  });
}
