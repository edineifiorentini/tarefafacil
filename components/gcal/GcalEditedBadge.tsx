"use client";

import { IconCalendarUp, IconX } from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  useDismissExternalEdit,
  useUndoExternalEdit,
} from "@/lib/queries/useGcal";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import type { Task } from "@/types/database";

// Marcador de origem externa (design 9.6): sempre visível após sync de entrada,
// com desfazer por 24h.
export function GcalEditedBadge({ task }: { task: Task }) {
  const workspace = useWorkspace();
  const undo = useUndoExternalEdit(workspace.id);
  const dismiss = useDismissExternalEdit(workspace.id);

  if (!task.gcal_external_edit_at) return null;

  const editedAt = new Date(task.gcal_external_edit_at);
  const snapshot = task.gcal_undo as { kind?: string } | null;
  const removed = snapshot?.kind === "removed";
  const label = removed
    ? "Removido no Google Agenda"
    : "Editado no Google Agenda";
  // formatDistanceToNow calcula "há X" internamente; o limite de 24h para
  // desfazer é validado no servidor (retorna 410 se expirou).
  const ago = formatDistanceToNow(editedAt, { addSuffix: true, locale: ptBR });

  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-sunken px-3 py-2 text-[length:var(--text-caption-size)] text-fg-secondary">
      <IconCalendarUp
        size={14}
        stroke={1.5}
        aria-hidden
        className="shrink-0 text-fg-muted"
      />
      <span>
        {label} · {ago}
      </span>
      <button
        type="button"
        onClick={() => undo.mutate(task.id)}
        disabled={undo.isPending}
        className="text-fg-link disabled:opacity-50"
      >
        Desfazer
      </button>
      <button
        type="button"
        onClick={() => dismiss.mutate(task.id)}
        aria-label="Dispensar aviso"
        className="ml-auto shrink-0 text-fg-muted hover:text-fg"
      >
        <IconX size={14} stroke={1.5} />
      </button>
    </div>
  );
}
