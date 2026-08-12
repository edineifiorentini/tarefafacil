"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Tag } from "@/types/database";

export type Progress = { done: number; total: number };

// Progresso (subtarefas concluídas/total) de vários cards de uma vez.
export function useSubtaskProgress(workspaceId: string, taskIds: string[]) {
  const supabase = createClient();
  const key = [...taskIds].sort();
  return useQuery({
    queryKey: ["subtaskProgress", workspaceId, key],
    enabled: taskIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subtask")
        .select("task_id, completed_at")
        .in("task_id", taskIds);
      if (error) throw error;
      const map = new Map<string, Progress>();
      for (const s of data) {
        const cur = map.get(s.task_id) ?? { done: 0, total: 0 };
        cur.total += 1;
        if (s.completed_at) cur.done += 1;
        map.set(s.task_id, cur);
      }
      return map;
    },
  });
}

// Tags de vários cards de uma vez.
export function useTaskTagsBulk(workspaceId: string, taskIds: string[]) {
  const supabase = createClient();
  const key = [...taskIds].sort();
  return useQuery({
    queryKey: ["taskTagsBulk", workspaceId, key],
    enabled: taskIds.length > 0,
    queryFn: async () => {
      const { data: links, error } = await supabase
        .from("task_tag")
        .select("task_id, tag_id")
        .in("task_id", taskIds);
      if (error) throw error;

      const tagIds = [...new Set((links ?? []).map((l) => l.tag_id))];
      const tagsById = new Map<string, Tag>();
      if (tagIds.length > 0) {
        const { data: tags } = await supabase
          .from("tag")
          .select("*")
          .in("id", tagIds);
        for (const t of tags ?? []) tagsById.set(t.id, t);
      }

      const map = new Map<string, Tag[]>();
      for (const l of links ?? []) {
        const tag = tagsById.get(l.tag_id);
        if (!tag) continue;
        const arr = map.get(l.task_id) ?? [];
        arr.push(tag);
        map.set(l.task_id, arr);
      }
      return map;
    },
  });
}
