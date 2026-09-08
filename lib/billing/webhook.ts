// Recebimento de aviso de pagamento. Só servidor.
//
// QUEM CHAMA ISTO HOJE: ninguém. A cobrança da plataforma está em modo
// manual e nenhum provedor está conectado, então nada envia webhook. Isto
// existe para o dia em que existir — e para que, nesse dia, a única coisa
// nova seja a credencial, não a lógica de conciliação.
//
// AS QUATRO REGRAS DE UM WEBHOOK DE PAGAMENTO, e por que cada uma:
//
// 1. **Autentique antes de ler.** Qualquer um na internet consegue chamar a
//    rota. Sem verificação, uma requisição forjada marca fatura como paga e
//    empurra acesso de graça.
//
// 2. **Seja idempotente.** Provedor reenvia até receber 200, e uma queda de
//    rede no meio faz o mesmo pagamento chegar duas vezes. Sem trava, o
//    segundo aviso empurra o acesso mais um mês. A trava é o índice único
//    (provider, external_id) da 0049 — no banco, não na esperança.
//
// 3. **Responda 200 para o que você entendeu, mesmo sem fazer nada.** Erro
//    5xx faz o provedor reenviar; reenviar um aviso que nunca vai casar com
//    fatura nenhuma gera uma fila infinita que só para quando alguém
//    percebe. Aviso desconhecido é 200 com "ignorado".
//
// 4. **Nunca confie no valor que chegou para decidir O QUE cobrar.** O valor
//    do aviso serve para registrar quanto entrou, não para escolher a
//    fatura: quem escolhe é o identificador do provedor.

import { registrarPagamento } from "@/lib/billing/settle";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type ResultadoDoWebhook = {
  /** O que aconteceu, para o log e para o teste. */
  acao: "quitou" | "repetido" | "sem_fatura" | "fatura_ja_paga" | "ignorado";
  /** Sempre 200 quando o aviso foi entendido — ver regra 3. */
  status: number;
  detalhe?: string;
};

/** O que o processamento precisa saber, já traduzido do formato do provedor. */
export type AvisoDePagamento = {
  provedor: string;
  /** Identificador do EVENTO no provedor. É a chave da idempotência. */
  externalId: string;
  /** Identificador da COBRANÇA no provedor. É o que casa com a fatura. */
  providerChargeId: string | null;
  /** O aviso diz que foi pago? Aviso de "pendente" também chega. */
  pago: boolean;
  valorCents: number | null;
  pagoEm: string | null;
  /** Corpo cru, guardado para conferência depois. */
  payload: Json;
};

/**
 * Confere com o PROVEDOR se a cobrança foi mesmo paga.
 *
 * **Esta é a quinta regra, e ela nasceu de um buraco real.** As quatro do
 * topo assumem que o aviso veio de quem diz ter vindo. Para o Asaas e o
 * Mercado Pago isso se sustenta: token compartilhado e HMAC sobre o corpo.
 * Para a EFI, não — ela autentica por mTLS na camada de transporte, e a
 * Vercel não expõe o certificado do cliente para a função. Sem isso, quem
 * descobrisse a URL poderia postar `{"pix":[{"txid":"…"}]}` e marcar uma
 * fatura como paga.
 *
 * A resposta não é uma autenticação mais esperta: é parar de acreditar no
 * corpo. O aviso vira GATILHO — ele diz "vá olhar" — e quem responde se
 * houve pagamento é o provedor, por uma consulta que sai daqui com o nosso
 * certificado. Aviso forjado passa a não conseguir nada: perguntamos à EFI,
 * e a EFI diz que não foi pago.
 *
 * Quem não passa confirmador continua no comportamento antigo, e isso é
 * deliberado: o Asaas e o Mercado Pago já se autenticam de forma que se
 * sustenta, e obrigá-los a uma ida de rede a mais por aviso seria pagar por
 * uma proteção que eles já têm.
 */
export type Confirmador = (providerChargeId: string) => Promise<{
  pago: boolean;
  valorCents: number | null;
  pagoEm: string | null;
}>;

export async function processarAviso(
  aviso: AvisoDePagamento,
  confirmar?: Confirmador
): Promise<ResultadoDoWebhook> {
  const db = createAdminClient();

  // REGRA 2, e ela vem antes de qualquer efeito: se este evento já foi
  // registrado, para aqui. O índice único é quem decide, não uma consulta
  // seguida de insert — entre a consulta e o insert cabe o segundo aviso.
  const { error: erroEvento } = await db.from("payment_event").insert({
    provider: aviso.provedor,
    external_id: aviso.externalId,
    payload: aviso.payload,
  });

  if (erroEvento) {
    if (erroEvento.code === "23505") {
      return {
        acao: "repetido",
        status: 200,
        detalhe: "evento já processado",
      };
    }
    // Falha real de banco: aí sim vale reenviar, porque o aviso não foi
    // guardado e o pagamento se perderia.
    return { acao: "ignorado", status: 500, detalhe: erroEvento.message };
  }

  if (!aviso.pago) {
    return {
      acao: "ignorado",
      status: 200,
      detalhe: "aviso não é de pagamento confirmado",
    };
  }

  if (!aviso.providerChargeId) {
    return {
      acao: "ignorado",
      status: 200,
      detalhe: "aviso sem identificador de cobrança",
    };
  }

  // REGRA 4: quem escolhe a fatura é o identificador, nunca o valor.
  const { data: fatura } = await db
    .from("subscription_charge")
    .select("id, status")
    .eq("provider", aviso.provedor)
    .eq("provider_charge_id", aviso.providerChargeId)
    .maybeSingle();

  if (!fatura) {
    // 200 de propósito (regra 3): pode ser cobrança criada fora daqui, ou de
    // outro ambiente do mesmo provedor. Reenviar não vai fazer aparecer.
    return {
      acao: "sem_fatura",
      status: 200,
      detalhe: `nenhuma fatura com ${aviso.providerChargeId}`,
    };
  }

  if (fatura.status === "paga") {
    return { acao: "fatura_ja_paga", status: 200 };
  }

  // REGRA 5: confirmar com o provedor antes de quitar.
  //
  // Roda DEPOIS de achar a fatura, e não antes, por dois motivos: aviso que
  // não casa com fatura nenhuma não merece uma ida de rede, e a consulta é
  // o passo mais caro da rotina.
  let valorCents = aviso.valorCents;
  let pagoEm = aviso.pagoEm;

  if (confirmar) {
    let confirmacao: Awaited<ReturnType<Confirmador>>;
    try {
      confirmacao = await confirmar(aviso.providerChargeId);
    } catch (e) {
      // Falha ao CONFERIR não é aviso inválido: pode ser a API do provedor
      // fora do ar. 500 para o provedor reenviar — é exatamente o caso em
      // que reenviar resolve.
      return {
        acao: "ignorado",
        status: 500,
        detalhe: `não foi possível confirmar com o provedor: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    if (!confirmacao.pago) {
      // O aviso disse que pagou e o provedor diz que não. 200 para não
      // gerar fila de reenvio, e o corpo cru já está em `payment_event`
      // para quem for investigar.
      return {
        acao: "ignorado",
        status: 200,
        detalhe: "o provedor não confirma o pagamento desta cobrança",
      };
    }

    // O valor que vale é o do provedor, não o do aviso.
    valorCents = confirmacao.valorCents;
    pagoEm = confirmacao.pagoEm;
  }

  const resultado = await registrarPagamento({
    chargeId: fatura.id,
    valorCents: valorCents ?? undefined,
    pagoEm: pagoEm ?? undefined,
    // O autor é o provedor, não uma pessoa. A auditoria precisa distinguir
    // "o sistema recebeu" de "alguém marcou à mão" — são confiabilidades
    // diferentes quando se investiga um pagamento contestado.
    autor: `webhook:${aviso.provedor}`,
    motivo: `Pagamento confirmado pelo provedor (evento ${aviso.externalId})`,
  });

  if (!resultado.ok) {
    // `ja_paga` aqui é corrida entre dois avisos simultâneos: o outro ganhou,
    // e está tudo certo.
    if (resultado.erro === "ja_paga") {
      return { acao: "fatura_ja_paga", status: 200 };
    }
    return { acao: "ignorado", status: 500, detalhe: resultado.mensagem };
  }

  return {
    acao: "quitou",
    status: 200,
    detalhe: `acesso estendido até ${resultado.acessoAte}`,
  };
}
