"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Insight } from "@/types/database";

function insightsKey(workspaceId: string, taskId: string) {
  return ["insights", workspaceId, taskId] as const;
}

export function useInsights(workspaceId: string, taskId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: insightsKey(workspaceId, taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insight")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInsight(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = insightsKey(workspaceId, taskId);

  return useMutation({
    mutationFn: async (body: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("insight").insert({
        workspace_id: workspaceId,
        task_id: taskId,
        body,
        author_id: user?.id ?? null,
      });
      if (error) throw error;
    },
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Insight[]>(key) ?? [];
      const optimistic: Insight = {
        id: `temp-${crypto.randomUUID()}`,
        workspace_id: workspaceId,
        task_id: taskId,
        body,
        author_id: null,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<Insight[]>(key, [...previous, optimistic]);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateInsight(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = insightsKey(workspaceId, taskId);

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const { error } = await supabase
        .from("insight")
        .update({ body })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Insight[]>(key) ?? [];
      qc.setQueryData<Insight[]>(
        key,
        previous.map((i) => (i.id === id ? { ...i, body } : i))
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
