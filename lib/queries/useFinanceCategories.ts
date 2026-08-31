"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { FinanceCategory } from "@/types/database";

/**
 * Categorias financeiras (0081).
 *
 * O banco tem índice único sobre o nome NORMALIZADO, então tentar criar
 * "marketing" onde já existe "Marketing" volta com 23505. Aqui esse caso
 * não é erro: é reaproveitamento. Quem está lançando uma despesa não quer
 * uma mensagem sobre unicidade, quer a categoria que já existe.
 */

function chave(workspaceId: string) {
  return ["finance-categories", workspaceId] as const;
}

/** Duas grafias do mesmo nome são o mesmo nome. Espelha o índice do banco. */
export function mesmaCategoria(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function useFinanceCategories(workspaceId: string, enabled = true) {
  const supabase = createClient();
  return useQuery({
    queryKey: chave(workspaceId),
    enabled,
    queryFn: async (): Promise<FinanceCategory[]> => {
      const { data, error } = await supabase
        .from("finance_category")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Cria uma categoria, ou devolve a que já existe com aquele nome.
 *
 * A corrida entre duas abas é resolvida pelo banco, não por uma consulta
 * antes: conferir e depois inserir deixa uma janela em que as duas passam.
 * Aqui a inserção é tentada, e o 23505 vira busca.
 */
export function useCreateFinanceCategory(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (nome: string): Promise<FinanceCategory> => {
      const name = nome.trim();
      const { data, error } = await supabase
        .from("finance_category")
        .insert({ workspace_id: workspaceId, name })
        .select()
        .single();

      if (!error && data) return data;

      // 23505 = já existe com esse nome normalizado. Busca e usa.
      if (error?.code === "23505") {
        const { data: existentes } = await supabase
          .from("finance_category")
          .select("*")
          .eq("workspace_id", workspaceId);
        const achada = (existentes ?? []).find((c) =>
          mesmaCategoria(c.name, name)
        );
        if (achada) return achada;
      }

      throw error ?? new Error("Não foi possível criar a categoria");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chave(workspaceId) });
    },
  });
}
