import { NextResponse } from "next/server";

import { requireUserAndWorkspace } from "@/lib/auth/context";
import { conferirCobranca } from "@/lib/billing/conciliar";
import { painelEmVoltaDe } from "@/lib/billing/painel";

/**
 * "Verificar agora": pergunta ao provedor o que aconteceu com a fatura.
 *
 * **O navegador nunca marca nada como pago.** Ele pede uma conferência; a
 * decisão vem do provedor, por uma consulta autenticada que sai do
 * servidor com o nosso certificado. Uma resposta 200 daqui significa "eu
 * fui olhar", nunca "está pago" — o que está pago é o que o corpo diz.
 *
 * A rota é de LEITURA para quem chama, mas causa efeito: se o pagamento
 * estiver lá, a fatura é quitada e o acesso estendido. Por isso é POST.
 *
 * Vale para qualquer membro, e não só para quem administra. Conferir se o
 * próprio pagamento caiu não é privilégio, e a alternativa — deixar quem
 * pagou sem resposta porque não é admin — é pior que o risco, que é uma
 * ida de rede a mais.
 *
 * A frequência é segurada dentro de `conferirCobranca`, pelo
 * `provider_checked_at` da própria fatura: clique repetido devolve o estado
 * conhecido sem falar com o provedor de novo. A trava mora no banco porque
 * memória de instância a Vercel descarta quando quer.
 */

export const dynamic = "force-dynamic";

export async function POST() {
  const ctx = await requireUserAndWorkspace();
  if (!ctx) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const r = await conferirCobranca(ctx.workspaceId);
    // Mesmo formato do GET: a tela escreve esta resposta no cache que a
    // consulta automática usa, e dois formatos a fariam alternar entre eles.
    return NextResponse.json(await painelEmVoltaDe(r.estado, ctx.workspaceId));
  } catch (e) {
    console.error("[billing/conferir] falha", e);
    // Mensagem sem alarme: não conseguir conferir agora não significa que o
    // pagamento se perdeu, e a próxima tentativa é automática.
    return NextResponse.json({ error: "indisponivel" }, { status: 503 });
  }
}
