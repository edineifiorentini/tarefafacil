import { NextResponse } from "next/server";

import { requireUserAndWorkspace } from "@/lib/auth/context";
import { pullChanges } from "@/lib/gcal/pull";

// Polling de entrada: chamado pelo cliente a cada ~60s enquanto a aba está
// visível. Puxa o delta do Google e aplica nas tarefas.
export async function POST() {
  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await pullChanges(ctx.workspaceId);
  return NextResponse.json(result);
}
