"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/types/database";

const SERVICES = "services";

function servicesKey(workspaceId: string) {
  return [SERVICES, workspaceId] as const;
}

/**
 * Catálogo de serviços do workspace.
 *
 * Traz ativos e inativos: quem administra precisa ver o que desativou para
 * reativar, e quem escolhe filtra na tela.
 */
export function useServices(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: servicesKey(workspaceId),
    queryFn: async (): Promise<Service[]> => {
      const { data, error } = await supabase
        .from("service")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export type ServiceInput = {
  name: string;
  priceCents: number;
  unit: string | null;
  notes: string | null;
};

export function useCreateService(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ServiceInput) => {
      const { error } = await supabase.from("service").insert({
        workspace_id: workspaceId,
        name: input.name,
        price_cents: input.priceCents,
        unit: input.unit,
        notes: input.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: servicesKey(workspaceId) });
    },
  });
}

export function useUpdateService(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<
        Pick<Service, "name" | "price_cents" | "unit" | "notes" | "active">
      >;
    }) => {
      const { error } = await supabase
        .from("service")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: servicesKey(workspaceId) });
      const antes = qc.getQueryData<Service[]>(servicesKey(workspaceId));
      qc.setQueryData<Service[]>(servicesKey(workspaceId), (data) =>
        data?.map((s) => (s.id === id ? { ...s, ...patch } : s))
      );
      return { antes };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.antes) qc.setQueryData(servicesKey(workspaceId), ctx.antes);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: servicesKey(workspaceId) });
    },
  });
}

/**
 * Exclusão de verdade, para o serviço cadastrado errado no primeiro dia.
 *
 * O caminho normal é DESATIVAR: serviço que saiu de linha continua existindo
 * porque negociação antiga guarda o nome e o valor que ele tinha. Excluir só
 * some com a linha do catálogo — nada do que já foi vendido muda.
 */
export function useDeleteService(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: servicesKey(workspaceId) });
    },
  });
}
