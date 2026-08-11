import { NextResponse } from "next/server";

import { pullChanges } from "@/lib/gcal/pull";
import { findWorkspaceByChannel } from "@/lib/gcal/watch";

// Webhook do Google (events.watch). Rota PÚBLICA (o Google não tem sessão) —
// liberada no proxy.ts. Identifica o workspace pelo canal e puxa o delta.
export async function POST(request: Request) {
  const channelId = request.headers.get("x-goog-channel-id");
  const state = request.headers.get("x-goog-resource-state");

  // "sync" é o ping inicial de confirmação do canal — nada a fazer.
  if (state === "sync" || !channelId) {
    return new NextResponse(null, { status: 200 });
  }

  const workspaceId = await findWorkspaceByChannel(channelId);
  if (workspaceId) {
    await pullChanges(workspaceId);
  }
  return new NextResponse(null, { status: 200 });
}
