import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/admin/admin";
import { registrarEventoDePlataforma } from "@/lib/admin/audit";
import { runBilling } from "@/lib/billing/run";

/**
 * Roda a cobrança do mês.
 *
 * **Simulação é o padrão.** Só cobra de verdade quem manda
 * `simulacao: false` E digita a palavra de confirmação. Não é excesso de
 * zelo: esta é a única rota do sistema que emite fatura para cliente pagante,
 * e um clique errado gera cobrança em cima de gente real.
 *
 * A execução real é auditada com o resumo — quantas faturas, quanto no
 * total. A simulação não é: ela não muda nada, e encher a auditoria de
 * "simulou" esconderia as linhas que importam.
 */

/** O que precisa ser digitado para a cobrança real sair. */
const CONFIRMACAO = "COBRAR";

export async function POST(request: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let corpo: { simulacao?: boolean; confirmacao?: string };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Default seguro: qualquer coisa que não seja exatamente `false` simula.
  const simulacao = corpo.simulacao !== false;

  if (!simulacao && (corpo.confirmacao ?? "").trim() !== CONFIRMACAO) {
    return NextResponse.json(
      {
        error: "confirmacao_invalida",
        message: `Digite ${CONFIRMACAO} para emitir as faturas de verdade`,
      },
      { status: 400 }
    );
  }

  const resumo = await runBilling({ simulacao });

  if (!simulacao) {
    await registrarEventoDePlataforma({
      autor: admin.email,
      acao: "criou",
      entidade: "subscription_charge",
      entidadeId: null,
      resumo: `rodou a cobrança: ${resumo.criadas} faturas, ${(resumo.totalCents / 100).toFixed(2)} no total`,
      detalhes: {
        provedor: resumo.provedor,
        avaliadas: resumo.avaliadas,
        criadas: resumo.criadas,
        jaExistiam: resumo.jaExistiam,
        erros: resumo.erros,
        totalCents: resumo.totalCents,
      },
    });
  }

  return NextResponse.json(resumo);
}
