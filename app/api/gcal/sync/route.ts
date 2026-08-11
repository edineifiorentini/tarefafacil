import { NextResponse } from "next/server";

import { requireUserAndWorkspace } from "@/lib/gcal/context";
import {
  deleteEvent,
  insertEvent,
  patchEvent,
  taskToEvent,
} from "@/lib/gcal/events";
import { GcalAuthError } from "@/lib/gcal/oauth";
import { getConnection, getFreshAccessToken } from "@/lib/gcal/tokens";

// Reconcilia o evento do Google com o estado atual da tarefa (design 9.4):
// - deve existir (sync ligado, não concluída, com prazo) → insert/patch
// - não deve existir mas tem evento → delete
// Subtarefa nunca chega aqui: vive noutra tabela (RN-02).
export async function POST(request: Request) {
  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let taskId: string | undefined;
  let remove = false;
  try {
    const body = (await request.json()) as {
      taskId?: string;
      remove?: boolean;
    };
    taskId = body.taskId;
    remove = body.remove === true;
  } catch {
    taskId = undefined;
  }
  if (!taskId) {
    return NextResponse.json({ error: "missing_task" }, { status: 400 });
  }

  const { data: task } = await ctx.supabase
    .from("task")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const conn = await getConnection(ctx.workspaceId);
  const shouldExist =
    !remove && task.gcal_sync && !task.completed_at && !!task.due_date;

  // Nada conectado: só é problema se a tarefa quer sincronizar.
  if (!conn || conn.status === "revoked") {
    return shouldExist
      ? NextResponse.json({ error: "not_connected" }, { status: 409 })
      : NextResponse.json({ ok: true, skipped: true });
  }

  const { data: sector } = await ctx.supabase
    .from("sector")
    .select("id, color")
    .eq("id", task.sector_id)
    .maybeSingle();
  const { data: appUser } = await ctx.supabase
    .from("app_user")
    .select("timezone")
    .eq("id", ctx.userId)
    .maybeSingle();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const timeZone = appUser?.timezone ?? "America/Sao_Paulo";

  try {
    const accessToken = await getFreshAccessToken(ctx.workspaceId);

    if (shouldExist && sector) {
      const eventBody = taskToEvent(task, sector, { appUrl, timeZone });
      const result = task.gcal_event_id
        ? await patchEvent(
            accessToken,
            task.gcal_event_id,
            eventBody,
            task.gcal_etag
          )
        : await insertEvent(accessToken, eventBody);

      await ctx.supabase
        .from("task")
        .update({
          gcal_event_id: result.eventId,
          gcal_etag: result.etag,
          gcal_synced_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      return NextResponse.json({ ok: true, eventId: result.eventId });
    }

    if (task.gcal_event_id) {
      await deleteEvent(accessToken, task.gcal_event_id);
      await ctx.supabase
        .from("task")
        .update({
          gcal_event_id: null,
          gcal_etag: null,
          gcal_synced_at: new Date().toISOString(),
        })
        .eq("id", task.id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof GcalAuthError) {
      return NextResponse.json({ error: "reauth" }, { status: 409 });
    }
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
