"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { TaskApproval } from "@/types/database";

/**
 * As respostas do cliente a uma demanda.
 *
 * Estava dentro de `ApprovalHistory`. Saiu porque a lista de materiais
 * também precisa dela — cada versão mostra o que o cliente disse sobre ELA
 * (0093) — e duas cópias da mesma consulta significariam duas chamadas a
 * cada trinta segundos, e as duas telas discordando por alguns segundos
 * enquanto uma atualiza antes da outra.
 */
export function useTaskApprovals(workspaceId: string, taskId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["taskApprovals", taskId],
    queryFn: async (): Promise<TaskApproval[]> => {
      const { data, error } = await supabase
        .from("task_approval")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    // O cliente responde quando quer; enquanto o painel está aberto, vale
    // olhar de vez em quando.
    refetchInterval: 30_000,
  });
}
