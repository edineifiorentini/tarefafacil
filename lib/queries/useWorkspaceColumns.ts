"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { BoardColumn } from "@/types/database";

/**
 * Todas as colunas de quadro do workspace, numa consulta só.
 *
 * **Por que existe, se já há `useBoardColumns`.** Aquele é por setor, e faz
 * sentido no quadro: você olha um setor de cada vez. A Lista cruza setores
 * — uma tela com doze setores faria doze requisições para escrever doze
 * palavras. Aqui é uma.
 *
 * O que ela alimenta é a coluna "Status" da Lista. **O TAFLOW não tem um
 * campo de status na demanda**: o estado vem de `completed_at` e
 * `cancelled_at`, e a etapa do fluxo é a COLUNA em que a demanda está no
 * quadro do setor dela. Por isso "Em produção" existe se — e só se — alguém
 * criou essa coluna. Nada é inventado aqui.
 *
 * Cada setor tem o seu conjunto, então duas colunas podem se chamar
 * "Revisão" em setores diferentes. Para a Lista isso não é problema: o que
 * se mostra é o nome da coluna da demanda, e ele é o nome certo para ela.
 */
export function useWorkspaceColumns(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["boardColumns", workspaceId, "todas"],
    queryFn: async (): Promise<BoardColumn[]> => {
      const { data, error } = await supabase
        .from("board_column")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    // Coluna de quadro muda raramente — não vale refazer a consulta a cada
    // volta para a aba.
    staleTime: 5 * 60_000,
  });
}
