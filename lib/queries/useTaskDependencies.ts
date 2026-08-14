"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types/database";

function blockedByKey(taskId: string) {
  return ["taskBlockedBy", taskId] as const;
}

// Demandas que bloqueiam esta ("aguarda X terminar"). Sem detecção de ciclo
// completa nesta rodada (só auto-referência, via CHECK no banco).
export function useBlockedByTasks(taskId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: blockedByKey(taskId),
    queryFn: async (): Promise<Task[]> => {
      const { data: links, error: linkError } = await supabase
        .from("task_dependency")
        .select("depends_on_id")
        .eq("task_id", taskId);
      if (linkError) throw linkError;
      const ids = links.map((l) => l.depends_on_id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase.from("task").select("*").in("id", ids);
      if (error) throw error;
      return data;
    },
  });
}

export function useAddDependency(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = blockedByKey(taskId);

  return useMutation({
    mutationFn: async (dependsOnId: string) => {
      const { error } = await supabase.from("task_dependency").insert({
        task_id: taskId,
        depends_on_id: dependsOnId,
        workspace_id: workspaceId,
      });
      // 23505 = já bloqueada por ela; 23514 = auto-referência (CHECK).
      if (error && error.code !== "23505") throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useRemoveDependency(taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = blockedByKey(taskId);

  return useMutation({
    mutationFn: async (dependsOnId: string) => {
      const { error } = await supabase
        .from("task_dependency")
        .delete()
        .eq("task_id", taskId)
        .eq("depends_on_id", dependsOnId);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
