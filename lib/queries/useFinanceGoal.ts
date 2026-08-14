"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { FinanceGoal } from "@/types/database";

function goalKey(workspaceId: string, month: string) {
  return ["financeGoal", workspaceId, month] as const;
}

// Uma meta por mês (spec 8.5: "manter histórico de metas por mês") — cada
// mês navegado no painel busca (ou não tem ainda) a sua própria meta.
export function useFinanceGoal(workspaceId: string, month: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: goalKey(workspaceId, month),
    queryFn: async (): Promise<FinanceGoal | null> => {
      const { data, error } = await supabase
        .from("finance_goal")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("month", month)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSetFinanceGoal(workspaceId: string, month: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetCents: number) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("finance_goal").upsert(
        {
          workspace_id: workspaceId,
          month,
          target_cents: targetCents,
          created_by: user?.id ?? null,
        },
        { onConflict: "workspace_id,month" }
      );
      if (error) throw error;
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: goalKey(workspaceId, month) }),
  });
}
