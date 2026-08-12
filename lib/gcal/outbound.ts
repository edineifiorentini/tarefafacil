// Reconciliação de saída (app → Google): decide inserir/patch/excluir o evento
// conforme o estado da tarefa. Extraído de /api/gcal/sync para ser reusado pelo
// undo. Recebe o client (RLS ou admin) já resolvido.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import {
  deleteEvent,
  insertEvent,
  patchEvent,
  taskToEvent,
} from "./events";
import { GcalAuthError } from "./oauth";
import { getConnection, getFreshAccessToken } from "./tokens";

export type OutboundResult =
  | { ok: true; eventId?: string; skipped?: boolean }
  | { ok: false; error: "not_connected" | "reauth" | "sync_failed" | "not_found" };

export async function reconcileOutbound(params: {
  supabase: SupabaseClient<Database>;
  workspaceId: string;
  userId: string;
  taskId: string;
  appUrl: string;
  remove?: boolean;
}): Promise<OutboundResult> {
  const { supabase, workspaceId, userId, taskId, appUrl, remove } = params;

  const { data: task } = await supabase
    .from("task")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { ok: false, error: "not_found" };

  const conn = await getConnection(workspaceId);
  const shouldExist =
    !remove && task.gcal_sync && !task.completed_at && !!task.due_date;

  if (!conn || conn.status === "revoked") {
    return shouldExist
      ? { ok: false, error: "not_connected" }
      : { ok: true, skipped: true };
  }

  const { data: sector } = await supabase
    .from("sector")
    .select("id, color")
    .eq("id", task.sector_id)
    .maybeSingle();
  const { data: appUser } = await supabase
    .from("app_user")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();
  const timeZone = appUser?.timezone ?? "America/Sao_Paulo";

  try {
    const accessToken = await getFreshAccessToken(workspaceId);

    if (shouldExist && sector) {
      // Só pede o Meet na criação; se já existe link, mantém.
      const createMeet = task.gcal_add_meet && !task.gcal_meet_url;
      const body = taskToEvent(task, sector, { appUrl, timeZone, createMeet });
      const result = task.gcal_event_id
        ? await patchEvent(accessToken, task.gcal_event_id, body, task.gcal_etag)
        : await insertEvent(accessToken, body);

      await supabase
        .from("task")
        .update({
          gcal_event_id: result.eventId,
          gcal_etag: result.etag,
          gcal_synced_at: new Date().toISOString(),
          ...(result.meetUrl ? { gcal_meet_url: result.meetUrl } : {}),
        })
        .eq("id", task.id);

      return { ok: true, eventId: result.eventId };
    }

    if (task.gcal_event_id) {
      await deleteEvent(accessToken, task.gcal_event_id);
      await supabase
        .from("task")
        .update({
          gcal_event_id: null,
          gcal_etag: null,
          gcal_meet_url: null,
          gcal_synced_at: new Date().toISOString(),
        })
        .eq("id", task.id);
    }
    return { ok: true };
  } catch (e) {
    if (e instanceof GcalAuthError) return { ok: false, error: "reauth" };
    return { ok: false, error: "sync_failed" };
  }
}
