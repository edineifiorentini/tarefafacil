import { NextResponse } from "next/server";

import { enviarPendentes } from "@/lib/webhooks/dispatch";

/**
 * Drena a fila de webhooks de saída.
 *
 * Não é tempo real, e não finge ser: a espera entre tentativas já é de
 * minutos, e prometer entrega imediata num cron da Vercel seria promessa que
 * o plano não sustenta. O contrato com o cliente é "chega", não "chega em um
 * segundo".
 *
 * Mesma trava dos outros: sem `CRON_SECRET` a rota fica FECHADA. Uma rota que
 * dispara requisições para URLs de terceiros não pode ficar aberta — seria um
 * amplificador de tráfego com o nosso nome nele.
 */

export const dynamic = "force-dynamic";

function autorizado(request: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  return request.headers.get("authorization") === `Bearer ${segredo}`;
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const resumo = await enviarPendentes();
  console.log("[cron/webhooks]", JSON.stringify(resumo));

  return NextResponse.json(resumo);
}
