import "server-only";

import { registrarEventoDePlataforma } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";

import { estadoAtual, type EstadoDaCobranca } from "./cobranca-do-cliente";
import { resolveProvider } from "./provider";
import { registrarPagamento } from "./settle";

/**
 * Perguntar ao provedor o que aconteceu com uma fatura aberta.
 *
 * **O webhook continua sendo a fonte oficial.** Isto é a rede embaixo dele,
 * e ela existe porque a rede era necessária: em 9/set/2026 um pagamento de
 * verdade chegou, foi notificado no horário e não quitou nada. O único
 * alerta possível era um cliente reclamando que pagou.
 *
 * Aviso se perde de várias formas — rede caindo, deploy no meio do envio, o
 * provedor desistindo depois de N tentativas, um defeito nosso como o
 * daquele dia. Todas terminam igual: o dinheiro entrou e o acesso não.
 *
 * QUEM CHAMA: o botão "Verificar agora" da tela de assinatura. A tela em si
 * NÃO chama isto a cada consulta — ela lê o banco, que é barato. Misturar
 * as duas coisas transformaria uma tela aberta numa torneira contra a API
 * do provedor.
 *
 * O QUE ISTO NÃO FAZ: decidir que algo foi pago. Quem decide é o provedor,
 * respondendo a uma consulta autenticada que sai daqui com o nosso
 * certificado. O navegador não participa da decisão em momento nenhum.
 */

/**
 * Quanto tempo uma conferência vale antes de valer a pena repetir.
 *
 * Pix cai em segundos, então quinze é curto o bastante para quem está
 * olhando a tela e longo o bastante para um clique nervoso não virar uma
 * ida de rede por segundo.
 */
export const INTERVALO_DE_CONFERENCIA_MS = 15_000;

export type ResultadoDaConferencia = {
  estado: EstadoDaCobranca;
  /** O que a conferência fez, para o log e para o teste. */
  acao: "quitou" | "sem_novidade" | "expirou" | "recente" | "nada_a_conferir";
  detalhe?: string;
};

export async function conferirCobranca(
  workspaceId: string,
  agora = new Date()
): Promise<ResultadoDaConferencia> {
  const db = createAdminClient();

  const { data: aberta } = await db
    .from("subscription_charge")
    .select("id, provider, provider_charge_id, expires_at, provider_checked_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "aberta")
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Nada aberto: a resposta honesta é o estado de agora, sem inventar
  // conferência nenhuma.
  if (!aberta) {
    return {
      estado: await estadoAtual(workspaceId, agora),
      acao: "nada_a_conferir",
    };
  }

  // Conferida agora há pouco: devolve o que já se sabe. Isto é o que segura
  // o clique repetido — a trava mora no banco, não na memória de uma
  // instância que a Vercel descarta a qualquer momento.
  if (
    aberta.provider_checked_at &&
    agora.getTime() - new Date(aberta.provider_checked_at).getTime() <
      INTERVALO_DE_CONFERENCIA_MS
  ) {
    return { estado: await estadoAtual(workspaceId, agora), acao: "recente" };
  }

  const modo = resolveProvider();

  // Sem provedor ou sem identificador não há a quem perguntar. Marcar como
  // conferida ainda assim seria mentir para a próxima chamada.
  if (modo.modo !== "gateway" || !aberta.provider_charge_id) {
    return {
      estado: await estadoAtual(workspaceId, agora),
      acao: "nada_a_conferir",
      detalhe:
        modo.modo === "manual"
          ? "cobrança manual"
          : "fatura sem identificador no provedor",
    };
  }

  let situacao: Awaited<ReturnType<typeof modo.gateway.getChargeStatus>>;
  try {
    situacao = await modo.gateway.getChargeStatus(aberta.provider_charge_id);
  } catch (e) {
    // Provedor fora do ar não é "não pago". Não marca a conferência, para a
    // próxima tentativa acontecer sem esperar o intervalo.
    const motivo = e instanceof Error ? e.message : String(e);
    console.error(
      `[conciliação] não deu para conferir ${aberta.id}: ${motivo}`
    );
    return {
      estado: await estadoAtual(workspaceId, agora),
      acao: "sem_novidade",
      detalhe: motivo,
    };
  }

  await db
    .from("subscription_charge")
    .update({ provider_checked_at: agora.toISOString() })
    .eq("id", aberta.id);

  if (situacao.paid) {
    const r = await registrarPagamento({
      chargeId: aberta.id,
      valorCents: situacao.paidAmountCents ?? undefined,
      pagoEm: situacao.paidAt?.toISOString(),
      // Autor diferente do webhook de propósito: na hora de investigar um
      // pagamento contestado, "o aviso chegou" e "nós fomos procurar" são
      // confiabilidades diferentes.
      autor: "sistema:conciliacao",
      motivo: "Pagamento encontrado ao conferir a cobrança com o provedor",
    });

    if (r.ok) {
      // Quitar por conciliação significa que o aviso NÃO chegou (ou não foi
      // processado). Isso é falha de integração, não rotina — fica
      // registrado para alguém investigar por que o webhook não resolveu.
      await registrarEventoDePlataforma({
        autor: "sistema",
        acao: "alterou",
        entidade: "subscription_charge",
        entidadeId: aberta.id,
        resumo: "pagamento encontrado pela conciliação, não pelo aviso",
        detalhes: {
          workspaceId,
          provedor: aberta.provider,
          cobranca: aberta.provider_charge_id,
          acessoAte: r.acessoAte,
        },
      });

      return {
        estado: await estadoAtual(workspaceId, agora),
        acao: "quitou",
        detalhe: `acesso estendido até ${r.acessoAte}`,
      };
    }

    // `ja_paga` aqui é corrida com o webhook: ele ganhou, e está tudo certo.
    return {
      estado: await estadoAtual(workspaceId, agora),
      acao: r.erro === "ja_paga" ? "quitou" : "sem_novidade",
      detalhe: r.mensagem,
    };
  }

  // Não pago e com o prazo vencido: fecha a fatura em vez de deixá-la
  // parecendo viva até a varredura diária passar. É o mesmo efeito de
  // `expirarVencidas`, aplicado à linha que o cliente está olhando agora.
  const vencida =
    aberta.expires_at !== null &&
    new Date(aberta.expires_at).getTime() <= agora.getTime();

  if (vencida) {
    await db
      .from("subscription_charge")
      .update({ status: "expirada" })
      .eq("id", aberta.id)
      .eq("status", "aberta");

    return { estado: await estadoAtual(workspaceId, agora), acao: "expirou" };
  }

  return {
    estado: await estadoAtual(workspaceId, agora),
    acao: "sem_novidade",
  };
}
