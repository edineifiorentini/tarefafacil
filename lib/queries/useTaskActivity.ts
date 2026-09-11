"use client";

import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO } from "date-fns";

import type { Periodo } from "@/lib/reports/periodo";
import type { LinhaDeReprogramacao } from "@/lib/reports/reprogramacoes";
import { createClient } from "@/lib/supabase/client";
import type { TaskActivity } from "@/types/database";

// Histórico de auditoria — só leitura no cliente; a escrita é feita por um
// trigger SECURITY DEFINER no banco (task_log_activity, migration 0025).
export function useTaskActivity(taskId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["taskActivity", taskId],
    queryFn: async (): Promise<TaskActivity[]> => {
      const { data, error } = await supabase
        .from("task_activity")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

/**
 * As reprogramações de prazo de uma empresa num período (0099), para o
 * relatório.
 *
 * Só as linhas de prazo COM motivo — a consulta que o índice parcial da 0099
 * cobre — e só três colunas. O corte fino do período vem depois, no fuso de
 * quem lê (`reprogramacoesDoPeriodo`, regra 15); aqui a janela sobra um dia
 * antes e um depois, o que cobre qualquer fuso do Brasil.
 */
export function useReprogramacoesDoPeriodo(
  workspaceId: string,
  periodo: Periodo
) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["reportReschedules", workspaceId, periodo.de, periodo.ate],
    queryFn: async (): Promise<LinhaDeReprogramacao[]> => {
      const desde = format(addDays(parseISO(periodo.de), -1), "yyyy-MM-dd");
      const antesDe = format(addDays(parseISO(periodo.ate), 2), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("task_activity")
        .select("task_id, motivo, created_at")
        .eq("workspace_id", workspaceId)
        .eq("field", "due_date")
        .not("motivo", "is", null)
        .gte("created_at", desde)
        .lt("created_at", antesDe);
      if (error) throw error;
      return data;
    },
    // Como as etapas: o relatório não muda a cada foco de janela.
    refetchOnWindowFocus: false,
  });
}
