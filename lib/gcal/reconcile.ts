// Reconciliação de entrada (Google → app), pura e testável. Recebe uma tarefa
// e o evento vindo do events.list e decide o que fazer. Sem I/O.

import { TASK_ID_PROP } from "./events";

export type GcalEvent = {
  id: string;
  status?: string; // "confirmed" | "tentative" | "cancelled"
  summary?: string;
  description?: string;
  updated?: string; // ISO
  etag?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
};

export type ReconcileTask = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  due_end_time: string | null;
  gcal_event_id: string | null;
  gcal_synced_at: string | null;
};

export type UndoSnapshot = {
  kind: "edited" | "removed";
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  due_end_time: string | null;
};

export type EventPatch = {
  title?: string;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  due_end_time?: string | null;
};

export type ReconcileAction =
  | { type: "ignore" }
  | { type: "delete"; undo: UndoSnapshot }
  | { type: "update"; patch: EventPatch; undo: UndoSnapshot };

export function taskIdOf(event: GcalEvent): string | null {
  return event.extendedProperties?.private?.[TASK_ID_PROP] ?? null;
}

// Remove a linha "Abrir no TAFLOW: …" que adicionamos na saída, para não
// reimportá-la como parte da descrição.
export function stripAppLink(
  description: string | undefined | null
): string | null {
  if (!description) return null;
  const cleaned = description
    .split("\n")
    .filter((line) => !line.startsWith("Abrir no TAFLOW:"))
    .join("\n")
    .trim();
  return cleaned === "" ? null : cleaned;
}

export function eventToPatch(event: GcalEvent): EventPatch {
  const patch: EventPatch = {};
  if (typeof event.summary === "string") patch.title = event.summary;
  patch.description = stripAppLink(event.description);

  const start = event.start;
  if (start?.date) {
    // Dia inteiro
    patch.due_date = start.date;
    patch.due_time = null;
    patch.due_end_time = null;
  } else if (start?.dateTime) {
    // "2026-08-12T14:30:00-03:00" → data e hora de parede
    patch.due_date = start.dateTime.slice(0, 10);
    patch.due_time = start.dateTime.slice(11, 19);
    patch.due_end_time = event.end?.dateTime
      ? event.end.dateTime.slice(11, 19)
      : null;
  }
  return patch;
}

function snapshot(
  task: ReconcileTask,
  kind: UndoSnapshot["kind"]
): UndoSnapshot {
  return {
    kind,
    title: task.title,
    description: task.description,
    due_date: task.due_date,
    due_time: task.due_time,
    due_end_time: task.due_end_time,
  };
}

// last-write-wins por timestamp: só aplica a mudança do Google se o evento foi
// atualizado DEPOIS do nosso último push (gcal_synced_at). Isso evita reimportar
// nossa própria escrita e resolve edição simultânea a favor de quem gravou por
// último. Ver design 9.6.
function googleIsNewer(task: ReconcileTask, event: GcalEvent): boolean {
  if (!event.updated) return false;
  if (!task.gcal_synced_at) return true;
  return (
    new Date(event.updated).getTime() > new Date(task.gcal_synced_at).getTime()
  );
}

export function reconcile(
  task: ReconcileTask,
  event: GcalEvent
): ReconcileAction {
  // Evento não é o que conhecíamos: ignora (não sequestramos outro evento).
  if (task.gcal_event_id && event.id !== task.gcal_event_id) {
    return { type: "ignore" };
  }

  // Apagado no Google → mantém a tarefa, desliga o sync (aceite E16).
  if (event.status === "cancelled") {
    return { type: "delete", undo: snapshot(task, "removed") };
  }

  if (!googleIsNewer(task, event)) return { type: "ignore" };

  return {
    type: "update",
    patch: eventToPatch(event),
    undo: snapshot(task, "edited"),
  };
}
