import { NextResponse } from "next/server";

import { requireUserAndWorkspace } from "@/lib/gcal/context";
import { revokeToken } from "@/lib/gcal/oauth";
import { deleteConnection, getConnection } from "@/lib/gcal/tokens";
import { stopWatch } from "@/lib/gcal/watch";

// Desconecta: revoga o token no Google, apaga a conexão local e desliga o
// sync das tarefas (limpa os ids de evento). Eventos já criados no Google
// permanecem — não há token após a revogação para removê-los.
export async function POST() {
  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const conn = await getConnection(ctx.workspaceId);
  if (conn) {
    await stopWatch(
      ctx.workspaceId,
      conn.channel_id,
      conn.channel_resource_id
    );
    if (conn.refresh_token) await revokeToken(conn.refresh_token);
  }
  await deleteConnection(ctx.workspaceId);

  await ctx.supabase
    .from("task")
    .update({ gcal_sync: false, gcal_event_id: null, gcal_etag: null })
    .eq("workspace_id", ctx.workspaceId)
    .not("gcal_event_id", "is", null);

  return NextResponse.json({ ok: true });
}
