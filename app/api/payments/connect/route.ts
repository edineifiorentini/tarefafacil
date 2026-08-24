import { NextResponse } from "next/server";

import { requireUserAndWorkspace } from "@/lib/auth/context";
import { encryptSecret, secretBoxConfigured } from "@/lib/crypto/secretBox";
import {
  PROVIDERS,
  parseEnvironment,
  parseProviderId,
} from "@/lib/payments/registry";
import { auditGateway, canManage } from "@/lib/payments/store";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Conecta a conta de recebimento da empresa.
 *
 * **Confere antes de guardar, sempre.** Credencial que ninguém testou é um
 * problema guardado para o dia em que o cliente precisar receber. E se o
 * provedor estiver fora do ar, a resposta diz isso — não guarda "para
 * conferir depois" e não acusa a credencial de errada.
 *
 * Sem chave de cifra o ambiente RECUSA. Guardar token de cobrança em texto
 * claro "só por enquanto" é como isso fica para sempre.
 */
export async function POST(request: Request) {
  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!secretBoxConfigured()) {
    return NextResponse.json({ error: "sem_cifra" }, { status: 503 });
  }

  if (!(await canManage(ctx.workspaceId, ctx.userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { provider?: unknown; token?: unknown; environment?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const providerId = parseProviderId(body.provider);
  const environment = parseEnvironment(body.environment);
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!providerId || !environment || !token) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const provider = PROVIDERS[providerId];
  const resultado = await provider.verify(token, environment);
  if (!resultado.ok) {
    // 422: a requisição está bem formada, a credencial é que não passou.
    // 503 quando o problema é do outro lado — o cliente pode tentar de novo.
    return NextResponse.json(
      { error: resultado.kind, message: resultado.message },
      { status: resultado.kind === "indisponivel" ? 503 : 422 }
    );
  }

  const db = createAdminClient();
  const { data: anterior } = await db
    .from("payment_gateway")
    .select("provider")
    .eq("workspace_id", ctx.workspaceId)
    .eq("provider", providerId)
    .maybeSingle();

  const { error } = await db.from("payment_gateway").upsert(
    {
      workspace_id: ctx.workspaceId,
      provider: providerId,
      environment,
      credentials: encryptSecret(token),
      account_label: resultado.label || null,
      active: true,
      last_verified_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,provider" }
  );
  if (error) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await auditGateway(
    ctx.workspaceId,
    ctx.userId,
    anterior ? "alterou" : "criou",
    `${anterior ? "Alterou" : "Conectou"} a conta de recebimento ${provider.name} (${
      environment === "producao" ? "produção" : "sandbox"
    })`
  );

  return NextResponse.json({ ok: true, label: resultado.label });
}
