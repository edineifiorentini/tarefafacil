import { NextResponse } from "next/server";

import {
  papelAlcanca,
  papelNoWorkspace,
  requireUserAndWorkspace,
} from "@/lib/auth/context";
import { estadoAtual, gerarCobranca } from "@/lib/billing/cobranca-do-cliente";

/**
 * A cobrança da PRÓPRIA empresa.
 *
 * **O workspace vem da sessão, nunca do pedido**, e essa é a trava central:
 * com um id no corpo, bastaria trocá-lo para gerar — e ver — a cobrança de
 * outra empresa, com o Pix dela na tela.
 *
 * GET lê o estado e não cria nada, então vale para qualquer membro: saber
 * que a conta está em aberto não é privilégio.
 *
 * POST gera, e pede `admin`. Quem paga a conta da empresa é quem a
 * administra, e um `viewer` gerando cobrança seria ruído para todo mundo.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const estado = await estadoAtual(ctx.workspaceId);
  return NextResponse.json(estado);
}

export async function POST() {
  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!papelAlcanca(await papelNoWorkspace(ctx), "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const estado = await gerarCobranca(ctx.workspaceId);
  return NextResponse.json(estado);
}
