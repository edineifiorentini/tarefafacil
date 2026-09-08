import { NextResponse } from "next/server";

import { lerConfigEfi } from "@/lib/billing/efi/config";
import { EfiGateway } from "@/lib/billing/efi/gateway";
import {
  autenticar,
  ehProvedorDeWebhook,
  traduzir,
  type ProvedorDeWebhook,
} from "@/lib/billing/webhook-auth";
import { processarAviso, type Confirmador } from "@/lib/billing/webhook";

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

  const resultado = await processarAviso(aviso, confirmadorPara(provedor));

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

/**
 * Quem confere o pagamento com o provedor, quando dá para conferir.
 *
 * Só a EFI recebe confirmador, e o motivo é a diferença de autenticação: ela
 * se identifica por mTLS, que a Vercel não entrega para a função, então o
 * corpo do aviso não prova origem. Perguntar de volta com o nosso
 * certificado resolve — e torna aviso forjado inútil.
 *
 * Asaas e Mercado Pago já se autenticam de um jeito que se sustenta (token
 * compartilhado e HMAC sobre o corpo). Somar uma ida de rede a cada aviso
 * deles seria pagar por uma proteção que eles já têm.
 *
 * Sem credencial configurada, devolve `undefined`: aí a rota volta ao
 * comportamento antigo em vez de recusar tudo. Cobrança manual não usa
 * webhook, e derrubar a rota por falta de variável trocaria funcionamento
 * reduzido por nenhum.
 */
function confirmadorPara(provedor: ProvedorDeWebhook): Confirmador | undefined {
  if (provedor !== "efi") return undefined;

  const cfg = lerConfigEfi();
  if (!cfg.ok) {
    console.warn(`[webhook/efi] sem confirmação: ${cfg.motivo}`);
    return undefined;
  }

  const gateway = new EfiGateway(cfg.config);
  return async (providerChargeId: string) => {
    const s = await gateway.getChargeStatus(providerChargeId);
    return {
      pago: s.paid,
      valorCents: s.paidAmountCents,
      pagoEm: s.paidAt ? s.paidAt.toISOString() : null,
    };
  };
}
