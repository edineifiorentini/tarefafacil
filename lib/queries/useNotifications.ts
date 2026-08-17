"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types/database";

/**
 * Notificações de evento. A RLS já limita ao destinatário, então não há
 * filtro por usuário aqui — filtrar de novo no cliente só daria a impressão
 * de que a segurança mora no frontend.
 */

/** Teto do que o sino carrega. Ninguém rola 200 avisos. */
const LIMIT = 50;

function notificationsKey(workspaceId: string) {
  return ["notifications", workspaceId] as const;
}

export function useNotifications(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: notificationsKey(workspaceId),
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notification")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(LIMIT);
      if (error) throw error;
      return data;
    },
    // O sino é periférico: revalida ao voltar para a aba, sem ficar
    // batendo no banco enquanto a pessoa trabalha.
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });
}

export function useMarkNotificationRead(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = notificationsKey(workspaceId);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notification")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const anterior = qc.getQueryData<Notification[]>(key);
      const agora = new Date().toISOString();
      qc.setQueryData<Notification[]>(key, (rows) =>
        rows?.map((r) => (r.id === id ? { ...r, read_at: agora } : r))
      );
      return { anterior };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.anterior) qc.setQueryData(key, ctx.anterior);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useMarkAllNotificationsRead(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = notificationsKey(workspaceId);

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notification")
        .update({ read_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId)
        .is("read_at", null);
      if (error) throw error;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const anterior = qc.getQueryData<Notification[]>(key);
      const agora = new Date().toISOString();
      qc.setQueryData<Notification[]>(key, (rows) =>
        rows?.map((r) => (r.read_at ? r : { ...r, read_at: agora }))
      );
      return { anterior };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.anterior) qc.setQueryData(key, ctx.anterior);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
