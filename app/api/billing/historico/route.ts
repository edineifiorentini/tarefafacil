import { NextResponse } from "next/server";

import { requireUserAndWorkspace } from "@/lib/auth/context";
import { historicoDeCobrancas } from "@/lib/billing/historico";

/**
 * As cobranças anteriores da PRÓPRIA empresa.
 *
 * **O workspace vem da sessão, nunca do pedido.** É a mesma trava da rota
 * da cobrança corrente: com um id no parâmetro, bastaria trocá-lo para ler
 * o histórico financeiro de outra empresa.
 *
 * O cursor é validado como data civil antes de ir para a consulta. Ele
 * chega pela URL, e um filtro montado com texto de fora é como se abre uma
 * porta que ninguém queria.
 */

export const dynamic = "force-dynamic";

/** "2026-09-05" e nada mais. */
const DATA_CIVIL = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const bruto = new URL(request.url).searchParams.get("cursor");
  const cursor = bruto && DATA_CIVIL.test(bruto) ? bruto : null;

  try {
    return NextResponse.json(
      await historicoDeCobrancas(ctx.workspaceId, { cursor })
    );
  } catch (e) {
    console.error("[billing/historico] falha", e);
    return NextResponse.json({ error: "falha" }, { status: 500 });
  }
}
