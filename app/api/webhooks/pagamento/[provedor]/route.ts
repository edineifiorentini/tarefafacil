import { NextResponse } from "next/server";

import {
  autenticar,
  ehProvedorDeWebhook,
  traduzir,
} from "@/lib/billing/webhook-auth";
import { processarAviso } from "@/lib/billing/webhook";

/**
 * Recebe aviso de pagamento do provedor.
 *
 * ROTA PÚBLICA por necessidade — provedor não tem cookie de sessão. Quem
 * autoriza é `BILLING_WEBHOOK_SECRET`, conferido antes de qualquer leitura
 * do corpo. Sem a variável a rota responde 503 e não faz nada: fechada, como
 * os crons.
 *
 * O corpo é lido como TEXTO primeiro. A assinatura do Mercado Pago é sobre
 * os bytes exatos que chegaram; `await request.json()` e depois
 * `JSON.stringify` devolve outra coisa (ordem de chaves, espaços) e a
 * verificação falharia para requisições legítimas.
 *
 * Sobre os códigos de resposta: 200 é a regra, não a exceção. Provedor
 * reenvia enquanto não receber 2xx, e reenviar um aviso que nunca vai casar
 * com fatura nenhuma cria uma fila que só para quando alguém percebe. 5xx
 * fica reservado para falha real de banco, onde reenviar é justamente o
 * certo.
 */

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provedor: string }> }
) {
  const { provedor } = await params;

  if (!ehProvedorDeWebhook(provedor)) {
    return NextResponse.json(
      { erro: "provedor desconhecido" },
      { status: 404 }
    );
  }

  const corpoCru = await request.text();

  const auth = autenticar(provedor, request.headers, corpoCru);
  if (!auth.ok) {
    // Sem detalhe na resposta: dizer "assinatura inválida" versus "token
    // inválido" para quem está tentando adivinhar entrega o mecanismo.
    console.warn(`[webhook/${provedor}] recusado: ${auth.erro}`);
    return NextResponse.json(
      { erro: "não autorizado" },
      { status: auth.status }
    );
  }

  let corpo: unknown;
  try {
    corpo = JSON.parse(corpoCru);
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const aviso = traduzir(provedor, corpo);
  if (!aviso) {
    // 200: reenviar não vai mudar o formato. Fica no log para quem for
    // ajustar a tradução quando o primeiro aviso real chegar.
    console.warn(
      `[webhook/${provedor}] corpo não reconhecido:`,
      corpoCru.slice(0, 500)
    );
    return NextResponse.json({ ok: true, acao: "ignorado" });
  }

  const resultado = await processarAviso(aviso);

  console.log(
    `[webhook/${provedor}]`,
    JSON.stringify({
      acao: resultado.acao,
      evento: aviso.externalId,
      cobranca: aviso.providerChargeId,
      detalhe: resultado.detalhe,
    })
  );

  return NextResponse.json(
    { ok: resultado.status < 400, acao: resultado.acao },
    { status: resultado.status }
  );
}
