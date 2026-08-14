// Sincronização de entrada (Google → app). events.list incremental por
// syncToken; 410 → resync completo da janela de ±90 dias. Usa o client admin
// (funciona tanto pelo poller autenticado quanto pelo webhook sem sessão),
// sempre escopado por workspace_id.

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

import { GcalAuthError } from "./oauth";
import { reconcile, taskIdOf, type GcalEvent } from "./reconcile";
import { getConnection, getFreshAccessToken } from "./tokens";

const CAL_EVENTS =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type ListResponse = {
  items?: GcalEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

export type PullResult = {
  changed: number;
  error?: "reauth" | "pull_failed";
};

type Admin = ReturnType<typeof createAdminClient>;

async function applyEvent(
  admin: Admin,
  workspaceId: string,
  event: GcalEvent
): Promise<boolean> {
  const taskId = taskIdOf(event);
  if (!taskId) return false; // evento alheio: não importamos a agenda inteira

  const { data: task } = await admin
    .from("task")
    .select(
      "id, title, description, due_date, due_time, due_end_time, gcal_event_id, gcal_synced_at"
    )
    .eq("id", taskId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!task) return false;

  const action = reconcile(task, event);
  if (action.type === "ignore") return false;

  const now = new Date().toISOString();

  if (action.type === "delete") {
    await admin
      .from("task")
      .update({
        gcal_sync: false,
        gcal_event_id: null,
        gcal_etag: null,
        gcal_external_edit_at: now,
        gcal_undo: action.undo as unknown as Json,
      })
      .eq("id", task.id);
    return true;
  }

  await admin
    .from("task")
    .update({
      ...action.patch,
      gcal_etag: event.etag ?? null,
      // Consome esta versão do evento para não reaplicá-la.
      gcal_synced_at: event.updated ?? now,
      gcal_external_edit_at: now,
      gcal_undo: action.undo as unknown as Json,
    })
    .eq("id", task.id);
  return true;
}

export async function pullChanges(workspaceId: string): Promise<PullResult> {
  const conn = await getConnection(workspaceId);
  if (!conn || conn.status === "revoked") return { changed: 0 };

  let accessToken: string;
  try {
    accessToken = await getFreshAccessToken(workspaceId);
  } catch {
    return { changed: 0, error: "reauth" };
  }

  const admin = createAdminClient();
  let syncToken = conn.sync_token;
  let pageToken: string | undefined;
  let newSyncToken: string | undefined;
  let retriedFull = false;
  let changed = 0;

  try {
    let done = false;
    while (!done) {
      const url = new URL(CAL_EVENTS);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("showDeleted", "true");
      url.searchParams.set("maxResults", "250");
      if (syncToken) {
        url.searchParams.set("syncToken", syncToken);
      } else {
        const now = Date.now();
        url.searchParams.set(
          "timeMin",
          new Date(now - WINDOW_MS).toISOString()
        );
        url.searchParams.set(
          "timeMax",
          new Date(now + WINDOW_MS).toISOString()
        );
      }
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url, {
        headers: { authorization: `Bearer ${accessToken}` },
      });

      if (res.status === 401) throw new GcalAuthError("token");
      if (res.status === 410) {
        // syncToken expirado: reinicia com a janela completa (uma vez).
        if (retriedFull) throw new Error("resync loop");
        retriedFull = true;
        syncToken = null;
        pageToken = undefined;
        await admin
          .from("google_connection")
          .update({ sync_token: null })
          .eq("workspace_id", workspaceId);
        continue;
      }
      if (!res.ok) throw new Error(`events.list ${res.status}`);

      const data = (await res.json()) as ListResponse;
      for (const event of data.items ?? []) {
        if (await applyEvent(admin, workspaceId, event)) changed++;
      }

      pageToken = data.nextPageToken;
      if (data.nextSyncToken) newSyncToken = data.nextSyncToken;
      if (!pageToken) done = true;
    }

    if (newSyncToken && newSyncToken !== conn.sync_token) {
      await admin
        .from("google_connection")
        .update({ sync_token: newSyncToken })
        .eq("workspace_id", workspaceId);
    }
    return { changed };
  } catch (e) {
    if (e instanceof GcalAuthError) return { changed, error: "reauth" };
    return { changed, error: "pull_failed" };
  }
}

// Restaura a tarefa a partir do snapshot de desfazer, se dentro de 24h.
export function undoIsFresh(externalEditAt: string | null): boolean {
  if (!externalEditAt) return false;
  return Date.now() - new Date(externalEditAt).getTime() < DAY_MS;
}
