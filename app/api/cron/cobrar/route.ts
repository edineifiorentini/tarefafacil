import { NextResponse } from "next/server";

import { runBilling } from "@/lib/billing/run";
import {
  aplicarCancelamentosAgendados,
  expirarVencidas,
} from "@/lib/billing/settle";

/**
 * Rotina diária da cobrança.
 *
 * **Nasce em simulação e assim continua até alguém decidir o contrário.**
 * `BILLING_AUTO=1` é o que autoriza este cron a emitir fatura de verdade.
 * Sem a variável ele roda, calcula tudo, escreve o resultado no log e não
 * cria nada — dá para acompanhar por semanas antes de ligar.
 *
 * O motivo de o agendamento existir mesmo desligado: um cron que só é criado
 * no dia em que se decide cobrar estreia sem nunca ter rodado. Assim, quando
 * a variável for ligada, a única coisa nova é a escrita.
 *
 * As duas tarefas de manutenção rodam SEMPRE, com ou sem a variável, porque
 * nenhuma delas cobra ninguém: expirar fatura vencida e aplicar cancelamento
 * agendado são a limpeza que faz os estados da tela corresponderem à
 * realidade.
 */

export const dynamic = "force-dynamic";

function autorizado(request: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  // Sem segredo configurado a rota fica FECHADA. Uma rota de cobrança aberta
  // é pior do que um cron que não roda: o cron parado se percebe no fim do
  // mês, a rota aberta não se percebe nunca.
  if (!segredo) return false;
  return request.headers.get("authorization") === `Bearer ${segredo}`;
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const automatico = process.env.BILLING_AUTO === "1";

  const expiradas = await expirarVencidas();
  const encerradas = await aplicarCancelamentosAgendados();
  const resumo = await runBilling({ simulacao: !automatico });

  const saida = {
    modo: automatico ? "cobrança real" : "simulação",
    provedor: resumo.provedor,
    faturasExpiradas: expiradas,
    assinaturasEncerradas: encerradas,
    avaliadas: resumo.avaliadas,
    aCobrar: resumo.aCobrar,
    criadas: resumo.criadas,
    jaExistiam: resumo.jaExistiam,
    erros: resumo.erros,
    totalCents: resumo.totalCents,
  };

  // O log é a interface deste cron enquanto ele estiver em simulação: é onde
  // se confere, mês a mês, se ele cobraria as pessoas certas.
  console.log("[cron/cobrar]", JSON.stringify(saida));

  if (resumo.erros > 0) {
    console.error(
      "[cron/cobrar] falhas:",
      JSON.stringify(resumo.linhas.filter((l) => l.resultado === "erro"))
    );
  }

  return NextResponse.json(saida);
}
