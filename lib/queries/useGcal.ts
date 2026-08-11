"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useToast } from "@/components/ui/Toast";
import type { GcalStatusResponse } from "@/lib/gcal/types";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types/database";

const GCAL_STATUS_KEY = ["gcal-status"] as const;

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
