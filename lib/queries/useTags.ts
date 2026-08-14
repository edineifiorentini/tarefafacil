"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Tag } from "@/types/database";

const TAG_PALETTE = ["violeta", "azul", "coral", "rosa", "grafite"];

function taskTagsKey(workspaceId: string, taskId: string) {
  return ["taskTags", workspaceId, taskId] as const;
}

// Todas as tags do workspace (para filtros).
export function useAllTags(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["tags", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tag")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useTaskTags(workspaceId: string, taskId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: taskTagsKey(workspaceId, taskId),
    queryFn: async () => {
      const { data: links, error: linkError } = await supabase
        .from("task_tag")
        .select("tag_id")
        .eq("task_id", taskId);
      if (linkError) throw linkError;
      const ids = links.map((l) => l.tag_id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("tag")
        .select("*")
        .in("id", ids)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddTaskTag(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = taskTagsKey(workspaceId, taskId);

  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      const { data: existing } = await supabase
        .from("tag")
        .select("id")
        .eq("workspace_id", workspaceId)
        .ilike("name", trimmed)
        .maybeSingle();

      let tagId = existing?.id;
      if (!tagId) {
        const color =
          TAG_PALETTE[trimmed.toLowerCase().charCodeAt(0) % TAG_PALETTE.length];
        const { data: created, error: createError } = await supabase
          .from("tag")
          .insert({ workspace_id: workspaceId, name: trimmed, color })
          .select("id")
          .single();
        if (createError) throw createError;
        tagId = created.id;
      }

      const { error } = await supabase
        .from("task_tag")
        .insert({ task_id: taskId, tag_id: tagId });
      // 23505 = já vinculada; ignora.
      if (error && error.code !== "23505") throw error;
    },
    onMutate: async (name) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Tag[]>(key) ?? [];
      const trimmed = name.trim();
      if (
        previous.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())
      ) {
        return { previous };
      }
      const optimistic: Tag = {
        id: `temp-${crypto.randomUUID()}`,
        workspace_id: workspaceId,
        name: trimmed,
        color:
          TAG_PALETTE[trimmed.toLowerCase().charCodeAt(0) % TAG_PALETTE.length],
      };
      qc.setQueryData<Tag[]>(key, [...previous, optimistic]);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useRemoveTaskTag(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = taskTagsKey(workspaceId, taskId);

  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from("task_tag")
        .delete()
        .eq("task_id", taskId)
        .eq("tag_id", tagId);
      if (error) throw error;
    },
    onMutate: async (tagId) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Tag[]>(key) ?? [];
      qc.setQueryData<Tag[]>(
        key,
        previous.filter((t) => t.id !== tagId)
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
