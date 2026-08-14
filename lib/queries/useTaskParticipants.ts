"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

function participantsKey(taskId: string) {
  return ["taskParticipants", taskId] as const;
}

// Participantes além do responsável principal (task.assignee_id). Retorna só
// os user_id — o painel resolve nome/avatar contra useMembers (já em cache).
export function useTaskParticipants(taskId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: participantsKey(taskId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("task_participant")
        .select("user_id")
        .eq("task_id", taskId);
      if (error) throw error;
      return data.map((d) => d.user_id);
    },
  });
}

export function useAddParticipant(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = participantsKey(taskId);

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("task_participant")
        .insert({ task_id: taskId, user_id: userId, workspace_id: workspaceId });
      if (error && error.code !== "23505") throw error;
    },
    onMutate: async (userId) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<string[]>(key) ?? [];
      if (!previous.includes(userId)) {
        qc.setQueryData<string[]>(key, [...previous, userId]);
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useRemoveParticipant(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = participantsKey(taskId);

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("task_participant")
        .delete()
        .eq("task_id", taskId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onMutate: async (userId) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<string[]>(key) ?? [];
      qc.setQueryData<string[]>(
        key,
        previous.filter((id) => id !== userId)
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
