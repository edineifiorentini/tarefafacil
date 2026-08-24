import { NextResponse } from "next/server";

import { requireUserAndWorkspace } from "@/lib/auth/context";
import { PROVIDERS, parseProviderId } from "@/lib/payments/registry";
import { auditGateway, canManage } from "@/lib/payments/store";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Desconecta a conta de recebimento.
 *
 * Apaga a linha: guardar credencial de quem pediu para desconectar seria
 * guardar o que não deveríamos ter. A trilha registra que aconteceu, sem o
 * token — que é a parte que precisa sobreviver.
 */
export async function POST(request: Request) {
  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await canManage(ctx.workspaceId, ctx.userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { provider?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const providerId = parseProviderId(body.provider);
  if (!providerId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db
    .from("payment_gateway")
    .delete()
    .eq("workspace_id", ctx.workspaceId)
    .eq("provider", providerId);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  await auditGateway(
    ctx.workspaceId,
    ctx.userId,
    "excluiu",
    `Desconectou a conta de recebimento ${PROVIDERS[providerId].name}`
  );

  return NextResponse.json({ ok: true });
}
