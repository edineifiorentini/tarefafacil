"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { ShareLink } from "@/types/database";

function key(taskId: string) {
  return ["shareLinks", taskId] as const;
}

/** Links de uma demanda. A RLS já limita ao workspace de quem pergunta. */
export function useShareLinks(taskId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: key(taskId),
    queryFn: async (): Promise<ShareLink[]> => {
      const { data, error } = await supabase
        .from("share_link")
        .select("*")
        .eq("entity_type", "task")
        .eq("entity_id", taskId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateShareLink(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ days }: { days: number }): Promise<ShareLink> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const expira = new Date();
      expira.setDate(expira.getDate() + days);
      const { data, error } = await supabase
        .from("share_link")
        .insert({
          workspace_id: workspaceId,
          entity_type: "task",
          entity_id: taskId,
          expires_at: expira.toISOString(),
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key(taskId) }),
  });
}

/**
 * Revogar não apaga a linha: saber que existiu um link, para onde apontava e
 * quando foi cortado é parte da prestação de contas.
 */
export function useRevokeShareLink(taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("share_link")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key(taskId) }),
  });
}
