import { NextResponse } from "next/server";

import {
  papelAlcanca,
  papelNoWorkspace,
  requireUserAndWorkspace,
} from "@/lib/auth/context";
import { gerarCobranca } from "@/lib/billing/cobranca-do-cliente";
import { painelDaCobranca, painelEmVoltaDe } from "@/lib/billing/painel";

/**
 * A cobrança da PRÓPRIA empresa.
 *
 * **O workspace vem da sessão, nunca do pedido**, e essa é a trava central:
 * com um id no corpo, bastaria trocá-lo para gerar — e ver — a cobrança de
 * outra empresa, com o Pix dela na tela.
 *
 * GET lê o estado e não cria nada, então vale para qualquer membro: saber
 * que a conta está em aberto não é privilégio. Junto vai a situação da
 * ASSINATURA — só o estado, sem valor. A 0049 diz que "nem admin do
 * workspace vê valor", e este é o meio-termo que o dono escolheu em
 * 9/set/2026: qualquer membro sabe se a conta está em dia, e quanto ela
 * custa continua sendo assunto de quem responde por ela.
 *
 * POST gera, e pede `admin`. Quem paga a conta da empresa é quem a
 * administra, e um `viewer` gerando cobrança seria ruído para todo mundo.
 *
 * As duas devolvem o MESMO formato. A tela consulta sozinha a cada poucos
 * segundos e escreve no mesmo cache depois de gerar; dois formatos fariam a
 * tela alternar entre eles.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await painelDaCobranca(ctx.workspaceId));
  } catch (e) {
    console.error("[billing/cobranca] falha ao ler o estado", e);
    return NextResponse.json({ error: "falha" }, { status: 500 });
  }
}

export async function POST() {
  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!papelAlcanca(await papelNoWorkspace(ctx), "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // **500 de corpo vazio não é resposta para uma ação de pagamento.** Era o
  // que esta rota devolvia quando a EFI recusava, e o efeito foi duplo:
  // quem clicava via um erro genérico, e do lado de cá não sobrava nada
  // para investigar. `gerarCobranca` já trata a recusa do provedor e
  // registra o motivo na auditoria; este `catch` é para o resto.
  try {
    // O estado devolvido pelo `gerarCobranca` é o que vale, e não uma
    // releitura do banco: ele carrega a mensagem do que acabou de
    // acontecer — "não foi possível falar com o provedor agora", por
    // exemplo —, e reler por cima trocaria essa frase por outra.
    const cobranca = await gerarCobranca(ctx.workspaceId);
    return NextResponse.json(await painelEmVoltaDe(cobranca, ctx.workspaceId));
  } catch (e) {
    console.error("[billing/cobranca] falha ao gerar", e);
    return NextResponse.json({ error: "falha" }, { status: 500 });
  }
}
