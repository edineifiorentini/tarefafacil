"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { BoardColumn } from "@/types/database";

function columnsKey(workspaceId: string, sectorId: string) {
  return ["boardColumns", workspaceId, sectorId] as const;
}

export function useBoardColumns(workspaceId: string, sectorId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: columnsKey(workspaceId, sectorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_column")
        .select("*")
        .eq("sector_id", sectorId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateColumn(workspaceId: string, sectorId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = columnsKey(workspaceId, sectorId);

  return useMutation({
    mutationFn: async (name: string) => {
      const cols = qc.getQueryData<BoardColumn[]>(key) ?? [];
      const position =
        cols.reduce((m, c) => Math.max(m, c.position), -1) + 1;
      const { error } = await supabase.from("board_column").insert({
        workspace_id: workspaceId,
        sector_id: sectorId,
        name,
        position,
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useRenameColumn(workspaceId: string, sectorId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = columnsKey(workspaceId, sectorId);

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("board_column")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BoardColumn[]>(key);
      qc.setQueryData<BoardColumn[]>(key, (cols) =>
        cols?.map((c) => (c.id === id ? { ...c, name } : c))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteColumn(workspaceId: string, sectorId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = columnsKey(workspaceId, sectorId);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("board_column")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BoardColumn[]>(key);
      qc.setQueryData<BoardColumn[]>(key, (cols) =>
        cols?.filter((c) => c.id !== id)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
      // Tarefas da coluna removida ficam sem coluna (DB: on delete set null).
      void qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });
}

// Move a coluna uma posição para a esquerda/direita (troca com a vizinha).
export function useReorderColumn(workspaceId: string, sectorId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = columnsKey(workspaceId, sectorId);

  return useMutation({
    mutationFn: async ({ id, dir }: { id: string; dir: "left" | "right" }) => {
      // Lê a ordem ATUAL (sem otimismo aqui — o otimismo é aplicado à parte,
      // para não trocar as posições duas vezes).
      const cols = [...(qc.getQueryData<BoardColumn[]>(key) ?? [])].sort(
        (a, b) => a.position - b.position
      );
      const i = cols.findIndex((c) => c.id === id);
      const j = dir === "left" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= cols.length) return;
      const a = cols[i];
      const b = cols[j];
      // Se as posições coincidirem (dados antigos), normaliza usando o índice.
      const posA = a.position === b.position ? i : a.position;
      const posB = a.position === b.position ? j : b.position;
      const { error: e1 } = await supabase
        .from("board_column")
        .update({ position: posB })
        .eq("id", a.id);
      const { error: e2 } = await supabase
        .from("board_column")
        .update({ position: posA })
        .eq("id", b.id);
      if (e1 || e2) throw e1 ?? e2;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
