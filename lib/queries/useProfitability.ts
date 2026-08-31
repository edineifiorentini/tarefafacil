"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Apontamento, Classificacao, Preco } from "@/lib/finance/profitability";
import type { FinanceRate } from "@/types/database";

/**
 * Dados da rentabilidade (0081).
 *
 * As horas chegam classificadas pela TAREFA, não por si mesmas: quem sabe a
 * que cliente, projeto e setor um trabalho pertence é a demanda em que ele
 * foi apontado. Por isso a consulta desce em `task` — apontamento não tem
 * etiqueta própria e nunca deve ter, senão passa a divergir da demanda.
 */

function chaveRates(workspaceId: string) {
  return ["finance-rates", workspaceId] as const;
}

export function useFinanceRates(workspaceId: string, enabled = true) {
  const supabase = createClient();
  return useQuery({
    queryKey: chaveRates(workspaceId),
    enabled,
    queryFn: async (): Promise<FinanceRate[]> => {
      const { data, error } = await supabase
        .from("finance_rate")
        .select("*")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data;
    },
  });
}

/** Preços no formato que `lib/finance/profitability` espera. */
export function paraPrecos(rates: FinanceRate[]): Preco[] {
  return rates.map((r) => ({ userId: r.user_id, horaCents: r.hora_cents }));
}

/**
 * Grava ou apaga um preço.
 *
 * Valor vazio APAGA a linha em vez de gravar zero — zero significaria "esta
 * hora não custa nada" e entraria na margem inflando-a. Sem linha, as horas
 * daquela pessoa voltam a contar como "sem preço", que é a verdade.
 */
export function useSalvarPreco(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (p: { userId: string | null; horaCents: number | null }) => {
      if (p.horaCents === null) {
        let q = supabase
          .from("finance_rate")
          .delete()
          .eq("workspace_id", workspaceId);
        q = p.userId === null ? q.is("user_id", null) : q.eq("user_id", p.userId);
        const { error } = await q;
        if (error) throw error;
        return;
      }

      // Sem `upsert`: o índice de unicidade do padrão é PARCIAL
      // (`where user_id is null`), e upsert não sabe mirar índice parcial.
      // Apagar e inserir dentro da mesma intenção resolve sem depender
      // disso.
      let del = supabase
        .from("finance_rate")
        .delete()
        .eq("workspace_id", workspaceId);
      del = p.userId === null ? del.is("user_id", null) : del.eq("user_id", p.userId);
      await del;

      const { error } = await supabase.from("finance_rate").insert({
        workspace_id: workspaceId,
        user_id: p.userId,
        hora_cents: p.horaCents,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaveRates(workspaceId) });
    },
  });
}

type LinhaDeTempo = {
  user_id: string;
  minutes: number;
  task: {
    client_id: string | null;
    project_id: string | null;
    sector_id: string | null;
  } | null;
};

/**
 * Horas apontadas, já com a classificação da demanda em que foram lançadas.
 *
 * Apontamento cuja tarefa sumiu volta sem etiqueta nenhuma em vez de ser
 * descartado: a hora foi trabalhada e custou dinheiro, então ela pertence ao
 * balde "sem projeto", não ao esquecimento.
 */
export function useApontamentosClassificados(
  workspaceId: string,
  enabled = true
) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["profit-time", workspaceId] as const,
    enabled,
    queryFn: async (): Promise<(Apontamento & Classificacao)[]> => {
      const { data, error } = await supabase
        .from("task_time_entry")
        .select("user_id, minutes, task:task_id(client_id, project_id, sector_id)")
        .eq("workspace_id", workspaceId);
      if (error) throw error;

      return (data as unknown as LinhaDeTempo[]).map((r) => ({
        userId: r.user_id,
        minutos: r.minutes,
        clientId: r.task?.client_id ?? null,
        projectId: r.task?.project_id ?? null,
        sectorId: r.task?.sector_id ?? null,
      }));
    },
  });
}
