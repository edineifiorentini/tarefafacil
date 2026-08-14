"use client";

import { useQuery } from "@tanstack/react-query";

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
