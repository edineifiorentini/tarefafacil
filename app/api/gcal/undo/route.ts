import { NextResponse } from "next/server";

import { requireUserAndWorkspace } from "@/lib/auth/context";
import { reconcileOutbound } from "@/lib/gcal/outbound";
import { undoIsFresh } from "@/lib/gcal/pull";
import type { UndoSnapshot } from "@/lib/gcal/reconcile";
import type { TablesUpdate } from "@/types/database";

// Desfaz uma edição/remoção vinda do Google (até 24h): restaura os campos
// anteriores e reflete de volta no Google — nossa versão passa a valer.
export async function POST(request: Request) {
  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let taskId: string | undefined;
  try {
    const body = (await request.json()) as { taskId?: string };
    taskId = body.taskId;
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

  const undo = task.gcal_undo as unknown as UndoSnapshot | null;
  if (!undo) {
    return NextResponse.json({ error: "nothing_to_undo" }, { status: 400 });
  }
  if (!undoIsFresh(task.gcal_external_edit_at)) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  const patch: TablesUpdate<"task"> = {
    title: undo.title,
    description: undo.description,
    due_date: undo.due_date,
    due_time: undo.due_time,
    due_end_time: undo.due_end_time,
    gcal_external_edit_at: null,
    gcal_undo: null,
  };
  // Se tinha sido removida no Google, reativa o sync para recriar o evento.
  if (undo.kind === "removed") patch.gcal_sync = true;

  await ctx.supabase.from("task").update(patch).eq("id", task.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  await reconcileOutbound({
    supabase: ctx.supabase,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    taskId,
    appUrl,
  });

  return NextResponse.json({ ok: true });
}
