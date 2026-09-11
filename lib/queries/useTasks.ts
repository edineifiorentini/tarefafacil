"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { ordenarDestinos } from "@/lib/tarefas/destinos";
import {
  REPROGRAMACAO_RECUSADA,
  type MotivoDeEscolha,
} from "@/lib/tarefas/reprogramacao";
import { estimateToMinutes, type QuickAddInput } from "@/lib/validation/task";
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

/**
 * Campos opcionais do "Mais detalhes" da criação rápida.
 *
 * Só o que veio preenchido: mandar `undefined` deixa o banco aplicar o
 * default (prioridade "media", por exemplo) em vez de gravar nulo por cima
 * dele. E a mesma função alimenta o insert e a linha otimista — se as duas
 * divergirem, a tarefa pisca com um valor e assenta com outro.
 */
function extrasFrom(input: QuickAddInput) {
  const estimate = estimateToMinutes(input.estimate_hours);
  return {
    ...(input.priority ? { priority: input.priority } : {}),
    ...(input.assignee_id ? { assignee_id: input.assignee_id } : {}),
    ...(input.client_id ? { client_id: input.client_id } : {}),
    ...(input.project_id ? { project_id: input.project_id } : {}),
    ...(input.service ? { service: input.service } : {}),
    ...(input.description ? { description: input.description } : {}),
    // Normalizado aqui, uma vez: o insert e a linha otimista recebem a
    // mesma ordem, e a fileira de logos não pisca trocando de lugar.
    ...(input.destinos?.length
      ? { destinos: ordenarDestinos(input.destinos) }
      : {}),
    ...(estimate !== null ? { estimate_minutes: estimate } : {}),
  };
}

function optimisticTask(
  input: {
    workspace_id: string;
    sector_id: string;
    title: string;
    due_date: string | null;
  },
  extras: ReturnType<typeof extrasFrom> = {}
): Task {
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
    destinos: [],
    // O gatilho da 0099 faz o primeiro prazo virar o original; a linha
    // otimista já nasce assim para não piscar "reprogramado".
    prazo_original: input.due_date,
    prazo_motivo: null,
    created_at: now,
    updated_at: now,
    // Por último, para os opcionais do "Mais detalhes" cobrirem os padrões
    // acima. Só as chaves que vieram preenchidas existem em `extras`.
    ...extras,
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

/**
 * O que a criação leva junto além dos campos da tarefa.
 *
 * Fora do schema do formulário de propósito: são AÇÕES pedidas ali, não
 * colunas de `task`. Misturá-las na validação faria o zod guardar coisas
 * que nunca vão para a tabela.
 */
type ExtrasDaCriacao = {
  /** Títulos digitados antes de a demanda existir. */
  subtarefas?: string[];
  /** Já abrir o acompanhamento para o cliente. */
  gerarLink?: boolean;
};

export function useCreateTask(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: QuickAddInput & ExtrasDaCriacao) => {
      const { data, error } = await supabase
        .from("task")
        .insert({
          workspace_id: workspaceId,
          sector_id: input.sector_id,
          title: input.title,
          due_date: input.due_date || null,
          ...extrasFrom(input),
        })
        .select()
        .single();
      if (error) throw error;

      // **O que vem a seguir só pode nascer DEPOIS da demanda existir**:
      // `subtask.task_id` e `share_link.entity_id` apontam para ela.
      //
      // E falhar aqui NÃO desfaz a tarefa. Ela já está no banco; jogar erro
      // faria a interface desfazer a criação otimista e sumir com uma
      // demanda que existe — trocando um problema pequeno por um grande. O
      // que não veio junto é devolvido para quem chamou avisar.
      const naoVeio: string[] = [];

      const titulos = (input.subtarefas ?? [])
        .map((t) => t.trim())
        .filter(Boolean);
      if (titulos.length > 0) {
        const { error: erro } = await supabase.from("subtask").insert(
          titulos.map((title, i) => ({
            workspace_id: workspaceId,
            task_id: data.id,
            title,
            position: i,
          }))
        );
        if (erro) naoVeio.push("as subtarefas");
      }

      if (input.gerarLink) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const expira = new Date();
        expira.setDate(expira.getDate() + 30);
        const { error: erro } = await supabase.from("share_link").insert({
          workspace_id: workspaceId,
          entity_type: "task",
          entity_id: data.id,
          expires_at: expira.toISOString(),
          created_by: user?.id ?? null,
        });
        if (erro) naoVeio.push("o link do cliente");
      }

      return { ...data, naoVeio };
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: [TASKS, workspaceId] });
      const task = optimisticTask(
        {
          workspace_id: workspaceId,
          sector_id: input.sector_id,
          title: input.title,
          due_date: input.due_date || null,
        },
        extrasFrom(input)
      );
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
      qc.setQueriesData<Task[]>({ queryKey: [TASKS, workspaceId] }, (data) =>
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
      qc.setQueriesData<Task[]>({ queryKey: [TASKS, workspaceId] }, (data) =>
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
      qc.setQueriesData<Task[]>({ queryKey: [TASKS, workspaceId] }, (data) =>
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
      qc.setQueriesData<Task[]>({ queryKey: [TASKS, workspaceId] }, (data) =>
        data?.filter((t) => t.id !== task.id)
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
      qc.setQueriesData<Task[]>({ queryKey: [TASKS, workspaceId] }, (data) =>
        data?.map((t) => (t.id === id ? { ...t, ...patch } : t))
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
      qc.setQueriesData<Task[]>({ queryKey: [TASKS, workspaceId] }, (data) =>
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

// ----------------------------------------------------- reprogramar prazo

/**
 * Muda um prazo que já existe, com motivo (0099).
 *
 * Vai por RPC e não pelo `useUpdateTask` porque o motivo precisa chegar ao
 * histórico NA MESMA transação da data: a função guarda o motivo numa
 * configuração da transação, troca a data, e o gatilho grava os dois
 * juntos. Um `update` comum registraria "motivo não informado".
 *
 * Otimista como o resto: o prazo novo aparece na hora, e o prazo original
 * — se ainda não existia — passa a ser o atual, como o gatilho fará.
 */
export function useReprogramarPrazo(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const syncEvent = useSyncTaskEvent();

  return useMutation({
    mutationFn: async (p: {
      id: string;
      prazo: string | null;
      motivo: MotivoDeEscolha;
      observacao: string | null;
    }) => {
      const { data, error } = await supabase.rpc("reprogramar_prazo", {
        p_task: p.id,
        p_prazo: p.prazo,
        p_motivo: p.motivo,
        p_observacao: p.observacao,
      });
      if (error) throw error;
      // `false`: a demanda perdeu o prazo, ou ganhou exatamente esta data,
      // entre abrir a janela e confirmar — ou a RLS não deixou.
      if (data === false) throw new Error(REPROGRAMACAO_RECUSADA);
    },
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: [TASKS, workspaceId] });
      const snapshots = qc.getQueriesData<Task[]>({
        queryKey: [TASKS, workspaceId],
      });
      const aplicar = (t: Task): Task =>
        t.id === p.id
          ? {
              ...t,
              due_date: p.prazo,
              prazo_motivo: p.motivo,
              prazo_original: t.prazo_original ?? t.due_date,
            }
          : t;
      qc.setQueriesData<Task[]>({ queryKey: [TASKS, workspaceId] }, (data) =>
        data?.map(aplicar)
      );
      const prevDetail = qc.getQueryData<Task>(taskKey(workspaceId, p.id));
      if (prevDetail) {
        qc.setQueryData<Task>(taskKey(workspaceId, p.id), aplicar(prevDetail));
      }
      // Como no concluir: quem sincroniza com o Google leva a data nova
      // para o evento.
      const hadSync = !!(
        findInSnapshots(snapshots, p.id)?.gcal_sync ?? prevDetail?.gcal_sync
      );
      return { snapshots, prevDetail, hadSync };
    },
    onError: (_erro, p, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      if (ctx?.prevDetail) {
        qc.setQueryData(taskKey(workspaceId, p.id), ctx.prevDetail);
      }
    },
    onSettled: (_d, erro, p, ctx) => {
      void qc.invalidateQueries({ queryKey: [TASKS, workspaceId] });
      void qc.invalidateQueries({ queryKey: taskKey(workspaceId, p.id) });
      // O histórico ganhou uma linha com o motivo.
      void qc.invalidateQueries({ queryKey: ["taskActivity", p.id] });
      if (!erro && ctx?.hadSync) void syncEvent(p.id);
    },
  });
}
