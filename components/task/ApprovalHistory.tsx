"use client";

import { IconCheck, IconPencil } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { parseISO } from "date-fns";

import {
  APPROVAL_LABEL,
  approvalState,
  revisionCount,
} from "@/lib/share/approval";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { TaskApproval } from "@/types/database";

function quando(iso: string): string {
  return parseISO(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function useTaskApprovals(workspaceId: string, taskId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["taskApprovals", taskId],
    queryFn: async (): Promise<TaskApproval[]> => {
      const { data, error } = await supabase
        .from("task_approval")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    // O cliente responde quando quer; enquanto o painel está aberto, vale
    // olhar de vez em quando.
    refetchInterval: 30_000,
  });
}

/**
 * O que o cliente respondeu pelo link público.
 *
 * Mostra o estado atual e a conversa inteira. As idas e vindas importam:
 * "aprovado" depois de quatro pedidos de ajuste conta uma história
 * diferente de "aprovado" de primeira, e essa diferença some se a tela só
 * guardar o resultado.
 */
export function ApprovalHistory({ taskId }: { taskId: string }) {
  const workspace = useWorkspace();
  const { data: respostas = [], isPending } = useTaskApprovals(
    workspace.id,
    taskId
  );

  if (isPending) {
    return (
      <p className="text-fg-muted text-[length:var(--text-caption-size)]">
        Carregando…
      </p>
    );
  }

  const estado = approvalState(respostas);
  const idas = revisionCount(respostas);

  if (estado === "sem_resposta") {
    return (
      <p className="text-fg-muted text-[length:var(--text-caption-size)]">
        {APPROVAL_LABEL.sem_resposta}. Compartilhe o link acima para o cliente
        aprovar ou pedir ajuste.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[length:var(--text-caption-size)] font-medium ${
            estado === "aprovado"
              ? "bg-[var(--status-positive-bg)] text-[var(--status-positive-fg)]"
              : "bg-[var(--status-overdue-bg)] text-[var(--status-overdue-fg)]"
          }`}
        >
          {estado === "aprovado" ? (
            <IconCheck size={13} stroke={2.5} aria-hidden />
          ) : (
            <IconPencil size={13} stroke={2} aria-hidden />
          )}
          {APPROVAL_LABEL[estado]}
        </span>
        {idas > 0 ? (
          <span className="text-fg-muted text-[length:var(--text-caption-size)]">
            {idas === 1 ? "1 pedido de ajuste" : `${idas} pedidos de ajuste`}
          </span>
        ) : null}
      </div>

      <ul className="flex flex-col gap-2">
        {respostas.map((r) => (
          <li
            key={r.id}
            className="border-line bg-sunken rounded-sm border px-3 py-2"
          >
            <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
              <span className="text-fg font-medium">
                {r.author_name ?? "Cliente"}
              </span>{" "}
              {r.decision === "aprovado" ? "aprovou" : "pediu ajuste"} ·{" "}
              {quando(r.created_at)}
            </p>
            {r.comment ? (
              <p className="text-fg mt-1 text-[length:var(--text-small-size)] whitespace-pre-wrap">
                {r.comment}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
