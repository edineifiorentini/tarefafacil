"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

/**
 * Define ou tira o gestor de um setor (0082).
 *
 * Passa por RPC, e não por `update`, porque a coluna `responsavel_id` NÃO
 * tem grant de escrita para o cliente: a policy de `sector` deixa qualquer
 * `member` escrever na tabela, e sem esse corte um funcionário se nomearia
 * gestor do próprio setor.
 *
 * Quem autoriza é o `has_role` dentro da função, no banco. A tela esconder o
 * seletor é conveniência, não segurança.
 */
export function useDefinirGestor(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (p: { setorId: string; pessoaId: string | null }) => {
      const { error } = await supabase.rpc("definir_gestor_de_setor", {
        setor: p.setorId,
        pessoa: p.pessoaId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sectors", workspaceId] });
    },
  });
}
