"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { QuickAddInput } from "@/lib/validation/task";
import type { Task, TablesUpdate } from "@/types/database";

import { useSyncTaskEvent } from "./useGcal";

const TASKS = "tasks";

function tasksKey(workspaceId: string, sectorId?: string) {
  return [TASKS, workspaceId, sectorId ?? "all"] as const;
}

// Procura uma tarefa nas listas em cache (para saber se estava sincronizada).
function findInSnapshots(
  snapshots: [unknown, Task[] | undefined][],
  id: string
): Task | undefined {
  for (const [, data] of snapshots) {
    const found = data?.find((t) => t.id === id);
    if (found) return found;
  }
  return undefined;
}

function optimisticTask(input: {
  workspace_id: string;
  sector_id: string;
  title: string;
  due_date: string | null;
}): Task {
  const now = new Date().toISOString();
  return {
    id: `temp-${crypto.randomUUID()}`,
    workspace_id: input.workspace_id,
    sector_id: input.sector_id,
    project_id: null,
    column_id: null,
    client_id: null,
    title: input.title,
    description: null,
    due_date: input.due_date,
    due_time: null,
    due_end_time: null,
    priority: "media",
    assignee_id: null,
    completed_at: null,
    position: 0,
    gcal_sync: false,
    gcal_event_id: null,
    gcal_etag: null,
    gcal_synced_at: null,
    gcal_external_edit_at: null,
    gcal_undo: null,
    gcal_add_meet: false,
    gcal_meet_url: null,
    recurrence_rule: null,
    recurrence_parent_id: null,
    cancelled_at: null,
    service: null,
    estimate_minutes: null,
    created_at: now,
    updated_at: now,
  };
}

export function useTasks(workspaceId: string, sectorId?: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: tasksKey(workspaceId, sectorId),
    queryFn: async () => {
      let query = supabase
        .from("task")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (sectorId) query = query.eq("sector_id", sectorId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Tarefas de um projeto (página do projeto). Chave prefixada por [TASKS, ws],
// então as mutações otimistas (toggle/delete/move) também a atualizam.
export function useProjectTasks(workspaceId: string, projectId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: [TASKS, workspaceId, "project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTask(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: QuickAddInput) => {
      const { data, error } = await supabase
        .from("task")
        .insert({
          workspace_id: workspaceId,
          sector_id: input.sector_id,
          title: input.title,
          due_date: input.due_date || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: [TASKS, workspaceId] });
      const task = optimisticTask({
        workspace_id: workspaceId,
        sector_id: input.sector_id,
        title: input.title,
        due_date: input.due_date || null,
      });
      const snapshots = qc.getQueriesData<Task[]>({
        queryKey: [TASKS, workspaceId],
      });
      // Adiciona no topo das listas que incluem este setor (a do setor e a "all").
      for (const [key, data] of snapshots) {
        const scope = key[2];
        if (data && (scope === "all" || scope === input.sector_id)) {
          qc.setQueryData<Task[]>(key, [task, ...data]);
        }
      }
      return { snapshots };
    },
    onError: (_error, _input, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [TASKS, workspaceId] }),
  });
}

export function useToggleTaskComplete(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const syncEvent = useSyncTaskEvent();

  return useMutation({
    mutationFn: async ({
      id,
      completed,
    }: {
      id: string;
      completed: boolean;
    }) => {
      const { error } = await supabase
        .from("task")
        .update({ completed_at: completed ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: [TASKS, workspaceId] });
      const snapshots = qc.getQueriesData<Task[]>({
        queryKey: [TASKS, workspaceId],
      });
      const hadSync = !!findInSnapshots(snapshots, id)?.gcal_sync;
      const completedAt = completed ? new Date().toISOString() : null;
      qc.setQueriesData<Task[]>(
        { queryKey: [TASKS, workspaceId] },
        (data) =>
          data?.map((t) =>
            t.id === id ? { ...t, completed_at: completedAt } : t
          )
      );
      return { snapshots, hadSync };
    },
    onError: (_error, _input, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: (_data, _error, { id }, ctx) => {
      void qc.invalidateQueries({ queryKey: [TASKS, workspaceId] });
      if (ctx?.hadSync) void syncEvent(id);
    },
  });
}

// Cancela/reabre a demanda — status distinto de concluída (nunca os dois ao
// mesmo tempo). Otimista, sem interação com o Google Agenda por enquanto.
export function useToggleTaskCancel(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, cancel }: { id: string; cancel: boolean }) => {
      const { error } = await supabase
        .from("task")
        .update({
          cancelled_at: cancel ? new Date().toISOString() : null,
          completed_at: cancel ? null : undefined,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, cancel }) => {
      await qc.cancelQueries({ queryKey: [TASKS, workspaceId] });
      const snapshots = qc.getQueriesData<Task[]>({
        queryKey: [TASKS, workspaceId],
      });
      const cancelledAt = cancel ? new Date().toISOString() : null;
      qc.setQueriesData<Task[]>(
        { queryKey: [TASKS, workspaceId] },
        (data) =>
          data?.map((t) =>
            t.id === id
              ? {
                  ...t,
                  cancelled_at: cancelledAt,
                  completed_at: cancel ? null : t.completed_at,
                }
              : t
          )
      );
      return { snapshots };
    },
    onError: (_error, _input, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [TASKS, workspaceId] }),
  });
}

// Conta subtarefas em aberto de uma tarefa (RN-04).
export async function countOpenSubtasks(taskId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("subtask")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .is("completed_at", null);
  if (error) throw error;
  return count ?? 0;
}

// Conclui a tarefa e, opcionalmente, todas as subtarefas em aberto (RN-04).
export function useCompleteTask(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const syncEvent = useSyncTaskEvent();

  return useMutation({
    mutationFn: async ({
      id,
      alsoSubtasks,
    }: {
      id: string;
      alsoSubtasks: boolean;
    }) => {
      const now = new Date().toISOString();
      if (alsoSubtasks) {
        const { error: subError } = await supabase
          .from("subtask")
          .update({ completed_at: now })
          .eq("task_id", id)
          .is("completed_at", null);
        if (subError) throw subError;
      }
      const { error } = await supabase
        .from("task")
        .update({ completed_at: now })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: [TASKS, workspaceId] });
      const snapshots = qc.getQueriesData<Task[]>({
        queryKey: [TASKS, workspaceId],
      });
      const hadSync = !!findInSnapshots(snapshots, id)?.gcal_sync;
      const now = new Date().toISOString();
      qc.setQueriesData<Task[]>(
        { queryKey: [TASKS, workspaceId] },
        (data) =>
          data?.map((t) => (t.id === id ? { ...t, completed_at: now } : t))
      );
      return { snapshots, hadSync };
    },
    onError: (_error, _input, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: (_data, _error, { id }, ctx) => {
      void qc.invalidateQueries({ queryKey: [TASKS, workspaceId] });
      if (ctx?.hadSync) void syncEvent(id);
    },
  });
}

export function useDeleteTask(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const toast = useToast();
  const syncEvent = useSyncTaskEvent();

  // Remove otimista + exclui no banco após 10s, a menos que desfaça.
  return useCallback(
    (task: Task) => {
      const snapshots = qc.getQueriesData<Task[]>({
        queryKey: [TASKS, workspaceId],
      });
      qc.setQueriesData<Task[]>(
        { queryKey: [TASKS, workspaceId] },
        (data) => data?.filter((t) => t.id !== task.id)
      );

      let undone = false;
      const timer = window.setTimeout(() => {
        if (undone) return;
        void (async () => {
          // Remove o evento no Google antes de apagar a linha (o servidor
          // precisa da tarefa para achar o evento). Basta existir um evento
          // vinculado — mesmo que o sync esteja desligado.
          if (task.gcal_event_id) {
            await syncEvent(task.id, { remove: true });
          }
          await supabase.from("task").delete().eq("id", task.id);
          void qc.invalidateQueries({ queryKey: [TASKS, workspaceId] });
        })();
      }, 10_000);

      toast.show({
        message: "Tarefa excluída",
        actionLabel: "Desfazer",
        duration: 10_000,
        onAction: () => {
          undone = true;
          window.clearTimeout(timer);
          snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
        },
      });
    },
    [qc, supabase, toast, syncEvent, workspaceId]
  );
}

function taskKey(workspaceId: string, taskId: string) {
  return ["task", workspaceId, taskId] as const;
}

// Detalhe de uma tarefa. initialData vem da lista já em cache (sem flash).
export function useTaskDetail(workspaceId: string, taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useQuery({
    queryKey: taskKey(workspaceId, taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task")
        .select("*")
        .eq("id", taskId)
        .single();
      if (error) throw error;
      return data;
    },
    initialData: () => {
      const lists = qc.getQueriesData<Task[]>({
        queryKey: [TASKS, workspaceId],
      });
      for (const [, data] of lists) {
        const found = data?.find((t) => t.id === taskId);
        if (found) return found;
      }
      return undefined;
    },
  });
}

// Atualização parcial (autosave). Otimista na lista e no detalhe.
export function useUpdateTask(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: TablesUpdate<"task">;
    }) => {
      const { error } = await supabase.from("task").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: [TASKS, workspaceId] });
      const snapshots = qc.getQueriesData<Task[]>({
        queryKey: [TASKS, workspaceId],
      });
      qc.setQueriesData<Task[]>(
        { queryKey: [TASKS, workspaceId] },
        (data) => data?.map((t) => (t.id === id ? { ...t, ...patch } : t))
      );
      const prevDetail = qc.getQueryData<Task>(taskKey(workspaceId, id));
      if (prevDetail) {
        qc.setQueryData<Task>(taskKey(workspaceId, id), {
          ...prevDetail,
          ...patch,
        });
      }
      return { snapshots, prevDetail };
    },
    onError: (_error, { id }, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      if (ctx?.prevDetail) {
        qc.setQueryData(taskKey(workspaceId, id), ctx.prevDetail);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [TASKS, workspaceId] }),
  });
}

// Move no Kanban: muda coluna + posição (fracionária). Soltar em coluna de
// conclusão marca completed_at; sair dela reabre.
export function useMoveTask(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      columnId,
      position,
      completed,
    }: {
      id: string;
      columnId: string;
      position: number;
      completed: boolean;
    }) => {
      const { error } = await supabase
        .from("task")
        .update({
          column_id: columnId,
          position,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, columnId, position, completed }) => {
      await qc.cancelQueries({ queryKey: [TASKS, workspaceId] });
      const snapshots = qc.getQueriesData<Task[]>({
        queryKey: [TASKS, workspaceId],
      });
      const completedAt = completed ? new Date().toISOString() : null;
      qc.setQueriesData<Task[]>(
        { queryKey: [TASKS, workspaceId] },
        (data) =>
          data?.map((t) =>
            t.id === id
              ? {
                  ...t,
                  column_id: columnId,
                  position,
                  completed_at: completedAt,
                }
              : t
          )
      );
      return { snapshots };
    },
    onError: (_error, _input, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [TASKS, workspaceId] }),
  });
}
