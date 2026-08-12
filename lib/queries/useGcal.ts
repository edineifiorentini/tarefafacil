"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import { useToast } from "@/components/ui/Toast";
import type { GcalStatusResponse } from "@/lib/gcal/types";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types/database";

const GCAL_STATUS_KEY = ["gcal-status"] as const;
const POLL_INTERVAL_MS = 60_000;

export function useGcalStatus() {
  return useQuery<GcalStatusResponse>({
    queryKey: GCAL_STATUS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/gcal/status");
      if (!res.ok) throw new Error("Falha ao ler status do Google");
      return res.json();
    },
    staleTime: 60_000,
  });
}

type SyncResult = { ok: boolean; error?: string };

async function postSync(taskId: string, remove = false): Promise<SyncResult> {
  const res = await fetch("/api/gcal/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ taskId, remove }),
  });
  if (res.ok) return { ok: true };
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: false, error: body.error };
}

// Dispara a reconciliação do evento no servidor. Trata reauth (banner) e
// falta de conexão (aviso). Best-effort — não bloqueia a UI da tarefa.
export function useSyncTaskEvent() {
  const qc = useQueryClient();
  const toast = useToast();

  return useCallback(
    async (taskId: string, opts?: { remove?: boolean }) => {
      const result = await postSync(taskId, opts?.remove ?? false);
      if (result.ok) return;
      if (result.error === "reauth") {
        void qc.invalidateQueries({ queryKey: GCAL_STATUS_KEY });
        toast.show({ message: "Reconecte o Google Agenda em Configurações" });
      } else if (result.error === "not_connected") {
        toast.show({ message: "Conecte o Google Agenda em Configurações" });
      } else if (result.error === "sync_failed") {
        toast.show({ message: "Não foi possível sincronizar com o Google" });
      }
    },
    [qc, toast]
  );
}

// Liga/desliga o sync de uma tarefa: grava gcal_sync (otimista) e reconcilia
// o evento. Nasce desligado (regra 10).
export function useToggleTaskSync(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const syncEvent = useSyncTaskEvent();

  return useMutation({
    mutationFn: async ({ id, sync }: { id: string; sync: boolean }) => {
      const { error } = await supabase
        .from("task")
        .update({ gcal_sync: sync })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, sync }) => {
      await qc.cancelQueries({ queryKey: ["task", workspaceId, id] });
      const prev = qc.getQueryData<Task>(["task", workspaceId, id]);
      qc.setQueryData<Task>(["task", workspaceId, id], (t) =>
        t ? { ...t, gcal_sync: sync } : t
      );
      qc.setQueriesData<Task[]>({ queryKey: ["tasks", workspaceId] }, (data) =>
        data?.map((t) => (t.id === id ? { ...t, gcal_sync: sync } : t))
      );
      return { prev };
    },
    onError: (_e, { id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(["task", workspaceId, id], ctx.prev);
    },
    onSuccess: (_data, { id }) => {
      void syncEvent(id);
    },
    onSettled: (_d, _e, { id }) => {
      void qc.invalidateQueries({ queryKey: ["task", workspaceId, id] });
    },
  });
}

// Liga/desliga o Google Meet de uma tarefa. Ligar implica sincronizar
// (o Meet vive no evento da agenda), então também garante gcal_sync.
export function useToggleTaskMeet(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const syncEvent = useSyncTaskEvent();

  return useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) => {
      const patch = on
        ? { gcal_add_meet: true, gcal_sync: true }
        : { gcal_add_meet: false };
      const { error } = await supabase.from("task").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, on }) => {
      await qc.cancelQueries({ queryKey: ["task", workspaceId, id] });
      const prev = qc.getQueryData<Task>(["task", workspaceId, id]);
      qc.setQueryData<Task>(["task", workspaceId, id], (t) =>
        t
          ? { ...t, gcal_add_meet: on, gcal_sync: on ? true : t.gcal_sync }
          : t
      );
      return { prev };
    },
    onError: (_e, { id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(["task", workspaceId, id], ctx.prev);
    },
    onSuccess: (_data, { id }) => {
      void syncEvent(id);
    },
    onSettled: (_d, _e, { id }) => {
      void qc.invalidateQueries({ queryKey: ["task", workspaceId, id] });
    },
  });
}

// Polling de entrada (Google → app): a cada 60s enquanto conectado e com a aba
// visível, puxa o delta e invalida as tarefas mudadas. Sem setState em effect.
export function useGcalPoller(workspaceId: string) {
  const qc = useQueryClient();
  const { data: status } = useGcalStatus();
  const connected = status?.connected ?? false;

  useEffect(() => {
    if (!connected) return;

    async function tick() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/gcal/pull", { method: "POST" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          changed?: number;
          error?: string;
        };
        if (data.error === "reauth") {
          void qc.invalidateQueries({ queryKey: GCAL_STATUS_KEY });
        } else if (data.changed && data.changed > 0) {
          void qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
          void qc.invalidateQueries({ queryKey: ["task", workspaceId] });
        }
      } catch {
        // silencioso: tenta de novo no próximo ciclo
      }
    }

    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    void tick(); // pull imediato ao conectar/montar
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [connected, workspaceId, qc]);
}

// Desfaz a edição/remoção vinda do Google (até 24h).
export function useUndoExternalEdit(workspaceId: string) {
  const qc = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch("/api/gcal/undo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (res.status === 410) throw new Error("expired");
      if (!res.ok) throw new Error("undo_failed");
    },
    onSuccess: (_d, taskId) => {
      void qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      void qc.invalidateQueries({ queryKey: ["task", workspaceId, taskId] });
    },
    onError: (e) => {
      toast.show({
        message:
          e instanceof Error && e.message === "expired"
            ? "O prazo para desfazer (24h) expirou"
            : "Não foi possível desfazer",
      });
    },
  });
}

// Dispensa o marcador de edição externa (sem desfazer a mudança).
export function useDismissExternalEdit(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("task")
        .update({ gcal_external_edit_at: null, gcal_undo: null })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: (_d, taskId) => {
      void qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      void qc.invalidateQueries({ queryKey: ["task", workspaceId, taskId] });
    },
  });
}
