"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

// Ações em lote da view Lista. Invalida todas as queries de tarefas do
// workspace (prefixo ["tasks", workspaceId] cobre por-setor e "all").
export function useBulkTaskActions(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });

  const complete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("task")
        .update({ completed_at: new Date().toISOString(), cancelled_at: null })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("task")
        .update({ cancelled_at: new Date().toISOString(), completed_at: null })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("task").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const moveToSector = useMutation({
    mutationFn: async ({
      ids,
      sectorId,
    }: {
      ids: string[];
      sectorId: string;
    }) => {
      // column_id some: cada setor tem colunas próprias — sem isso a tarefa
      // poderia "sumir" numa coluna que não existe no novo setor.
      const { error } = await supabase
        .from("task")
        .update({ sector_id: sectorId, column_id: null })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { complete, cancel, remove, moveToSector };
}
