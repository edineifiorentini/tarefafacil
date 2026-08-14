"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { TaskComment } from "@/types/database";

function commentsKey(taskId: string) {
  return ["taskComments", taskId] as const;
}

export function useTaskComments(taskId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: commentsKey(taskId),
    queryFn: async (): Promise<TaskComment[]> => {
      const { data, error } = await supabase
        .from("task_comment")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddComment(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = commentsKey(taskId);

  return useMutation({
    mutationFn: async ({
      body,
      mentionedUserIds,
    }: {
      body: string;
      mentionedUserIds: string[];
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("não autenticado");
      const { error } = await supabase.from("task_comment").insert({
        workspace_id: workspaceId,
        task_id: taskId,
        author_id: user.id,
        body,
        mentioned_user_ids: mentionedUserIds,
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
