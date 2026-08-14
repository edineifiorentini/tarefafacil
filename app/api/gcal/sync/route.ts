import { NextResponse } from "next/server";

import { requireUserAndWorkspace } from "@/lib/gcal/context";
import { reconcileOutbound } from "@/lib/gcal/outbound";

// Reconcilia o evento do Google com o estado atual da tarefa (design 9.4).
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const result = await reconcileOutbound({
    supabase: ctx.supabase,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    taskId,
    appUrl,
    remove,
  });

  if (result.ok) {
    return NextResponse.json({ ok: true, eventId: result.eventId });
  }
  const statusByError = {
    not_found: 404,
    not_connected: 409,
    reauth: 409,
    sync_failed: 500,
  } as const;
  return NextResponse.json(
    { error: result.error },
    { status: statusByError[result.error] }
  );
}
