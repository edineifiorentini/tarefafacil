import { NextResponse } from "next/server";

import { requireUserAndWorkspace } from "@/lib/auth/context";
import { secretBoxConfigured } from "@/lib/crypto/secretBox";
import { listStatus } from "@/lib/payments/store";

/**
 * Situação das contas de recebimento da empresa.
 *
 * Devolve o que a tela mostra e nada além: provedor, ambiente, apelido da
 * conta e quando foi conferida. O token nunca sai do servidor, nem
 * mascarado.
 *
 * `configured` diz se o ambiente sabe guardar segredo. Sem a chave de
 * cifra a tela mostra o motivo em vez de um formulário que vai recusar
 * salvar no fim.
 */
export async function GET() {
  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const gateways = await listStatus(ctx.workspaceId);
  return NextResponse.json({
    configured: secretBoxConfigured(),
    gateways,
  });
}
