"use client";

import { useQuery } from "@tanstack/react-query";

import { hasAnyFilter, type SearchFilters } from "@/lib/search/filters";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types/database";

export function useSearch(workspaceId: string, filters: SearchFilters) {
  const supabase = createClient();
  const active = hasAnyFilter(filters);

  return useQuery({
    queryKey: ["search", workspaceId, filters],
    enabled: active,
    // Mantém os resultados anteriores enquanto a próxima busca carrega.
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase.rpc("search_tasks", {
        q: filters.q.trim(),
        p_sectors: filters.sectors.length ? filters.sectors : null,
        p_tags: filters.tags.length ? filters.tags : null,
        p_priorities: filters.priorities.length ? filters.priorities : null,
        p_status: filters.status,
        p_due_from: filters.dueFrom,
        p_due_to: filters.dueTo,
        p_service: filters.service.trim() || null,
      });
      if (error) throw error;
      // A RPC roda sob RLS (pode abranger vários workspaces do usuário);
      // limita ao workspace ativo.
      return (data ?? []).filter((t) => t.workspace_id === workspaceId);
    },
  });
}
