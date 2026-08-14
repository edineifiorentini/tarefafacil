"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
      const { error } = await supabase.from("client").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: clientsKey(workspaceId) });
      void qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });
}
