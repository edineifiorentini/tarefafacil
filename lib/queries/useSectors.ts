"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { SectorInput } from "@/lib/validation/sector";
import type { Sector } from "@/types/database";

const DEFAULT_COLUMNS = [
  { name: "A fazer", position: 0, is_done_column: false },
  { name: "Fazendo", position: 1, is_done_column: false },
  { name: "Revisão", position: 2, is_done_column: false },
  { name: "Concluído", position: 3, is_done_column: true },
];

function sectorsKey(workspaceId: string) {
  return ["sectors", workspaceId] as const;
}

export function useSectors(workspaceId: string, initialData?: Sector[]) {
  const supabase = createClient();
  return useQuery({
    queryKey: sectorsKey(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sector")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    initialData,
  });
}

export function useCreateSector(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = sectorsKey(workspaceId);

  return useMutation({
    mutationFn: async (input: SectorInput) => {
      const current = qc.getQueryData<Sector[]>(key) ?? [];
      const { data: sector, error } = await supabase
        .from("sector")
        .insert({
          workspace_id: workspaceId,
          name: input.name,
          color: input.color,
          icon: input.icon,
          position: current.length,
        })
        .select()
        .single();
      if (error) throw error;

      const columns = DEFAULT_COLUMNS.map((c) => ({
        ...c,
        workspace_id: workspaceId,
        sector_id: sector.id,
      }));
      const { error: colError } = await supabase
        .from("board_column")
        .insert(columns);
      if (colError) throw colError;

      return sector;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Sector[]>(key) ?? [];
      const optimistic: Sector = {
        id: `temp-${crypto.randomUUID()}`,
        workspace_id: workspaceId,
        name: input.name,
        color: input.color,
        icon: input.icon,
        position: previous.length,
        archived_at: null,
      };
      qc.setQueryData<Sector[]>(key, [...previous, optimistic]);
      return { previous };
    },
    onError: (_error, _input, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateSector(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = sectorsKey(workspaceId);

  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<SectorInput>) => {
      const { error } = await supabase.from("sector").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Sector[]>(key) ?? [];
      qc.setQueryData<Sector[]>(
        key,
        previous.map((s) => (s.id === id ? { ...s, ...patch } : s))
      );
      return { previous };
    },
    onError: (_error, _input, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useReorderSectors(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = sectorsKey(workspaceId);

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, index) =>
          supabase
            .from("sector")
            .update({ position: index })
            .eq("id", id)
            .then(({ error }) => {
              if (error) throw error;
            })
        )
      );
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Sector[]>(key) ?? [];
      const byId = new Map(previous.map((s) => [s.id, s]));
      const reordered = orderedIds
        .map((id, index) => {
          const s = byId.get(id);
          return s ? { ...s, position: index } : null;
        })
        .filter((s): s is Sector => s !== null);
      qc.setQueryData<Sector[]>(key, reordered);
      return { previous };
    },
    onError: (_error, _input, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useArchiveSector(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = sectorsKey(workspaceId);

  return useMutation({
    mutationFn: async ({
      id,
      moveToSectorId,
    }: {
      id: string;
      moveToSectorId?: string;
    }) => {
      // RN-06: mover as tarefas para outro setor (ou arquivá-las junto).
      if (moveToSectorId) {
        const { error: moveError } = await supabase
          .from("task")
          .update({ sector_id: moveToSectorId, column_id: null })
          .eq("sector_id", id);
        if (moveError) throw moveError;
      }
      const { error } = await supabase
        .from("sector")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Sector[]>(key) ?? [];
      qc.setQueryData<Sector[]>(
        key,
        previous.filter((s) => s.id !== id)
      );
      return { previous };
    },
    onError: (_error, _input, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

// Exclui o setor de vez (cascade: apaga tarefas e projetos dele). Irreversível.
export function useDeleteSector(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = sectorsKey(workspaceId);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sector").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Sector[]>(key) ?? [];
      qc.setQueryData<Sector[]>(
        key,
        previous.filter((s) => s.id !== id)
      );
      return { previous };
    },
    onError: (_error, _id, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      void qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
      void qc.invalidateQueries({ queryKey: ["boardColumns", workspaceId] });
    },
  });
}
