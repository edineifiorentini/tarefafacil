// Qual provedor de pagamento a cobrança do SaaS usa. Só servidor.
//
// Este arquivo existe para uma decisão só, e ela é de segurança: **nunca
// cair no gateway falso por acidente**. Um `FakeGateway` ativo em produção
// diria "pago" para dinheiro que não entrou, e o acesso seria empurrado de
// graça — o pior tipo de bug, porque não dá erro em lugar nenhum.

import { FakeGateway, type PaymentGateway } from "./gateway";

export type ModoDeCobranca =
  | {
      /**
       * MANUAL: a fatura nasce no sistema, sem QR code. O dono envia a
       * cobrança por fora (Pix, boleto, o que for) e registra o pagamento
       * aqui, o que empurra o acesso.
       *
       * Não é um estado provisório envergonhado: é como a maioria dos SaaS
       * pequenos começa, e fecha o ciclo inteiro sem depender de
       * credencial de provedor.
       */
      modo: "manual";
    }
  | { modo: "gateway"; nome: string; gateway: PaymentGateway };

/**
 * Decide o modo a partir do ambiente.
 *
 * `BILLING_PROVIDER` aceita:
 *   - ausente ou "manual" → cobrança manual (o padrão).
 *   - "fake" → só fora de produção, e só com BILLING_FAKE_OK=1. As duas
 *     travas juntas de propósito: uma variável esquecida no painel da Vercel
 *     não deve ser suficiente para o sistema começar a dizer que recebeu.
 *
 * Provedor de verdade (EFI) ainda não tem implementação: ela precisa de
 * certificado mTLS, que não existe aqui. Quando existir, entra como mais um
 * ramo — e nada acima desta função muda, que é justamente o motivo de a
 * fronteira `PaymentGateway` existir.
 */
export function resolveProvider(): ModoDeCobranca {
  const escolhido = (process.env.BILLING_PROVIDER ?? "manual").toLowerCase();

  if (escolhido === "fake") {
    const permitido =
      process.env.NODE_ENV !== "production" &&
      process.env.BILLING_FAKE_OK === "1";
    if (!permitido) {
      console.warn(
        "[cobrança] BILLING_PROVIDER=fake ignorado: só vale fora de produção e com BILLING_FAKE_OK=1. Usando cobrança manual."
      );
      return { modo: "manual" };
    }
    return { modo: "gateway", nome: "fake", gateway: new FakeGateway() };
  }

  if (escolhido !== "manual") {
    console.warn(
      `[cobrança] BILLING_PROVIDER="${escolhido}" não tem implementação. Usando cobrança manual.`
    );
  }

  return { modo: "manual" };
}

/** Nome gravado em `subscription_charge.provider`. */
export function nomeDoProvedor(modo: ModoDeCobranca): string {
  return modo.modo === "manual" ? "manual" : modo.nome;
}
