"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { AuditLog } from "@/types/database";

/**
 * Trilha de auditoria. A RLS já limita a dono e admin — não há filtro de
 * papel aqui para não dar a impressão de que o controle mora no cliente.
 */
const PAGE = 100;

export function useAuditLog(workspaceId: string, enabled = true) {
  const supabase = createClient();
  return useQuery({
    enabled,
    queryKey: ["auditLog", workspaceId],
    queryFn: async (): Promise<AuditLog[]> => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(PAGE);
      if (error) throw error;
      return data;
    },
  });
}
