"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Subtask } from "@/types/database";

function datedSubtasksKey(workspaceId: string) {
  return ["datedSubtasks", workspaceId] as const;
}

// Subtarefas com data e em aberto — aparecem na Visão Hoje no dia correspondente.
export function useDatedSubtasks(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: datedSubtasksKey(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subtask")
        .select("*")
        .eq("workspace_id", workspaceId)
        .not("due_date", "is", null)
        .is("completed_at", null)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// Concluir uma etapa a partir da Hoje: some da lista (só mostramos as abertas).
export function useToggleDatedSubtask(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = datedSubtasksKey(workspaceId);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subtask")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", id);
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
