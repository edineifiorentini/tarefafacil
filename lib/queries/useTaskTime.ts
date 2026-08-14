"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { TaskTimeEntry } from "@/types/database";

function timeKey(taskId: string) {
  return ["taskTime", taskId] as const;
}

export function useTimeEntries(taskId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: timeKey(taskId),
    queryFn: async (): Promise<TaskTimeEntry[]> => {
      const { data, error } = await supabase
        .from("task_time_entry")
        .select("*")
        .eq("task_id", taskId)
        .order("logged_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddTimeEntry(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = timeKey(taskId);

  return useMutation({
    mutationFn: async ({
      minutes,
      note,
    }: {
      minutes: number;
      note: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("não autenticado");
      const { error } = await supabase.from("task_time_entry").insert({
        workspace_id: workspaceId,
        task_id: taskId,
        user_id: user.id,
        minutes,
        note,
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteTimeEntry(taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = timeKey(taskId);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("task_time_entry")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TaskTimeEntry[]>(key) ?? [];
      qc.setQueryData<TaskTimeEntry[]>(
        key,
        prev.filter((e) => e.id !== id)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
