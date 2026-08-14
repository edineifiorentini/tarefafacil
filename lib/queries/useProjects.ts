"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { ProjectInput } from "@/lib/validation/project";
import type { Project } from "@/types/database";

const PROJECTS = "projects";

export function useProjects(workspaceId: string, sectorId?: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: [PROJECTS, workspaceId, sectorId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("project")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (sectorId) query = query.eq("sector_id", sectorId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProject(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProjectInput) => {
      const { data, error } = await supabase
        .from("project")
        .insert({
          workspace_id: workspaceId,
          sector_id: input.sector_id,
          name: input.name,
          description: input.description ?? null,
          starts_on: input.starts_on || null,
          ends_on: input.ends_on || null,
          status: input.status,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: [PROJECTS, workspaceId] });
      const now = new Date().toISOString();
      const optimistic: Project = {
        id: `temp-${crypto.randomUUID()}`,
        workspace_id: workspaceId,
        sector_id: input.sector_id,
        name: input.name,
        description: input.description ?? null,
        starts_on: input.starts_on || null,
        ends_on: input.ends_on || null,
        status: input.status,
        archived_at: null,
        created_at: now,
      };
      const snapshots = qc.getQueriesData<Project[]>({
        queryKey: [PROJECTS, workspaceId],
      });
      for (const [key, data] of snapshots) {
        const scope = key[2];
        if (data && (scope === "all" || scope === input.sector_id)) {
          qc.setQueryData<Project[]>(key, [optimistic, ...data]);
        }
      }
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: [PROJECTS, workspaceId] }),
  });
}

export function useUpdateProject(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<ProjectInput>) => {
      const { error } = await supabase
        .from("project")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: [PROJECTS, workspaceId] });
      const snapshots = qc.getQueriesData<Project[]>({
        queryKey: [PROJECTS, workspaceId],
      });
      qc.setQueriesData<Project[]>(
        { queryKey: [PROJECTS, workspaceId] },
        (data) => data?.map((p) => (p.id === id ? { ...p, ...patch } : p))
      );
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: [PROJECTS, workspaceId] }),
  });
}

export function useArchiveProject(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [PROJECTS, workspaceId] });
      const snapshots = qc.getQueriesData<Project[]>({
        queryKey: [PROJECTS, workspaceId],
      });
      qc.setQueriesData<Project[]>(
        { queryKey: [PROJECTS, workspaceId] },
        (data) => data?.filter((p) => p.id !== id)
      );
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: [PROJECTS, workspaceId] }),
  });
}
