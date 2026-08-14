"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Subtask } from "@/types/database";

function subtasksKey(workspaceId: string, taskId: string) {
  return ["subtasks", workspaceId, taskId] as const;
}

export function useSubtasks(workspaceId: string, taskId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: subtasksKey(workspaceId, taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subtask")
        .select("*")
        .eq("task_id", taskId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSubtask(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = subtasksKey(workspaceId, taskId);

  return useMutation({
    mutationFn: async (input: { title: string; due_date?: string | null }) => {
      const current = qc.getQueryData<Subtask[]>(key) ?? [];
      const { error } = await supabase.from("subtask").insert({
        workspace_id: workspaceId,
        task_id: taskId,
        title: input.title,
        due_date: input.due_date ?? null,
        position: current.length,
      });
      if (error) throw error;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Subtask[]>(key) ?? [];
      const optimistic: Subtask = {
        id: `temp-${crypto.randomUUID()}`,
        workspace_id: workspaceId,
        task_id: taskId,
        title: input.title,
        due_date: input.due_date ?? null,
        completed_at: null,
        position: previous.length,
      };
      qc.setQueryData<Subtask[]>(key, [...previous, optimistic]);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useToggleSubtask(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = subtasksKey(workspaceId, taskId);

  return useMutation({
    mutationFn: async ({
      id,
      completed,
    }: {
      id: string;
      completed: boolean;
    }) => {
      const { error } = await supabase
        .from("subtask")
        .update({ completed_at: completed ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Subtask[]>(key) ?? [];
      const completedAt = completed ? new Date().toISOString() : null;
      qc.setQueryData<Subtask[]>(
        key,
        previous.map((s) =>
          s.id === id ? { ...s, completed_at: completedAt } : s
        )
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateSubtask(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = subtasksKey(workspaceId, taskId);

  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      title?: string;
      due_date?: string | null;
    }) => {
      const { error } = await supabase
        .from("subtask")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Subtask[]>(key) ?? [];
      qc.setQueryData<Subtask[]>(
        key,
        previous.map((s) => (s.id === id ? { ...s, ...patch } : s))
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteSubtask(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = subtasksKey(workspaceId, taskId);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subtask").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Subtask[]>(key) ?? [];
      qc.setQueryData<Subtask[]>(
        key,
        previous.filter((s) => s.id !== id)
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
