// Autenticação do webhook de pagamento e tradução do corpo de cada provedor.
//
// Separado de `webhook.ts` porque são duas responsabilidades com ritmos
// diferentes: a conciliação é estável, e esta parte muda a cada provedor que
// entra. Também é o que permite testar a conciliação sem forjar assinatura.

import { createHmac, timingSafeEqual } from "node:crypto";

import type { Json } from "@/types/database";

import type { AvisoDePagamento } from "./webhook";

export type ProvedorDeWebhook = "mercado_pago" | "asaas" | "efi";

export function ehProvedorDeWebhook(v: unknown): v is ProvedorDeWebhook {
  return v === "mercado_pago" || v === "asaas" || v === "efi";
}

/**
 * Compara sem vazar por tempo.
 *
 * Comparação normal de string sai no primeiro caractere diferente, e a
 * diferença de microssegundos deixa adivinhar o segredo byte a byte. Aqui
 * o custo é o mesmo para qualquer entrada.
 *
 * Tamanhos diferentes já respondem falso: `timingSafeEqual` joga exceção
 * quando os buffers não têm o mesmo tamanho, e o tamanho de um segredo não
 * é o que se está protegendo.
 */
export function segredoConfere(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * O webhook está ligado?
 *
 * Sem `BILLING_WEBHOOK_SECRET` a rota fica FECHADA, como os crons. É o mesmo
 * raciocínio: um webhook de pagamento aberto aceita "está pago" de qualquer
 * um na internet, e o prejuízo é acesso liberado sem dinheiro.
 */
export function webhookConfigurado(): boolean {
  return (process.env.BILLING_WEBHOOK_SECRET ?? "").length >= 16;
}

export type ResultadoDaAutenticacao =
  { ok: true } | { ok: false; status: number; erro: string };

/**
 * Confere se o aviso veio mesmo do provedor.
 *
 * Cada um faz de um jeito, e a diferença NÃO é cosmética:
 *
 * - **Asaas** manda um token fixo que você mesmo define no painel dele. É
 *   um segredo compartilhado: basta comparar.
 * - **Mercado Pago** assina o corpo com HMAC-SHA256. É mais forte, porque
 *   um token fixo vazado serve para sempre e uma assinatura só vale para
 *   aquele corpo.
 * - **EFI** não manda nada. Ela se identifica por mTLS na camada de
 *   transporte, e a Vercel não entrega o certificado do cliente para a
 *   função — não é limitação de configuração, é o formato da plataforma.
 *
 * **Para a EFI, a CONFIRMAÇÃO é a autenticação** (regra 5 em `webhook.ts`).
 * O aviso dela entra sem token e não decide nada sozinho: `processarAviso`
 * pergunta à EFI, com o nosso certificado, se aquela cobrança foi paga —
 * e é a resposta da EFI que vale, inclusive o valor.
 *
 * O que um aviso forjado consegue, então: uma linha em `payment_event` e
 * uma consulta à EFI que vai dizer "não foi pago". Nada de acesso
 * estendido, nada de fatura quitada. O custo é limitado e conhecido; a
 * alternativa era um webhook que nunca funciona, porque exigiria da EFI um
 * cabeçalho que ela não tem como enviar.
 *
 * Isto NÃO afrouxa Asaas nem Mercado Pago: os dois mandam prova de origem
 * e continuam sendo conferidos.
 */
export function autenticar(
  provedor: ProvedorDeWebhook,
  cabecalhos: Headers,
  corpoCru: string
): ResultadoDaAutenticacao {
  const segredo = process.env.BILLING_WEBHOOK_SECRET;
  if (!segredo || segredo.length < 16) {
    return { ok: false, status: 503, erro: "webhook não configurado" };
  }

  if (provedor === "mercado_pago") {
    const assinatura = cabecalhos.get("x-signature-hmac");
    if (!assinatura) {
      return { ok: false, status: 401, erro: "assinatura ausente" };
    }
    const esperada = createHmac("sha256", segredo)
      .update(corpoCru)
      .digest("hex");
    return segredoConfere(assinatura, esperada)
      ? { ok: true }
      : { ok: false, status: 401, erro: "assinatura inválida" };
  }

  // A EFI não tem como mandar token: ver o bloco acima. A confirmação
  // com o provedor é quem faz esse papel, e ela roda em processarAviso.
  if (provedor === "efi") return { ok: true };

  // Asaas: segredo compartilhado no cabeçalho.
  const token =
    cabecalhos.get("asaas-access-token") ??
    cabecalhos.get("authorization")?.replace(/^Bearer /, "") ??
    "";
  return segredoConfere(token, segredo)
    ? { ok: true }
    : { ok: false, status: 401, erro: "token inválido" };
}

/**
 * Traduz o corpo do provedor para o formato interno.
 *
 * Devolve `null` quando o corpo não é reconhecível — e quem chama responde
 * 200 mesmo assim, porque reenviar não vai mudar o formato.
 *
 * RESSALVA HONESTA: estes formatos vêm da documentação, não de tráfego real.
 * Nenhum provedor está conectado, então nunca chegou um aviso de verdade
 * aqui. Quando o primeiro chegar, é este arquivo que pode precisar de
 * ajuste.
 *
 * ONDE OLHAR quando precisar desse ajuste, porque não é mais um lugar só:
 *
 *   - corpo que esta função NÃO reconhece sai no log da rota, cru e
 *     inteiro — é exatamente o caso em que a leitura falhou;
 *   - corpo reconhecido que casa com uma fatura nossa fica em
 *     `payment_event`;
 *   - corpo reconhecido que NÃO casa com fatura nenhuma não fica em lugar
 *     nenhum, e isso é regra: a chave Pix que recebe as cobranças também
 *     recebe boleto e carnê da empresa, então boa parte desses avisos é
 *     sobre pagamento de terceiro. Guardá-los seria colecionar nome e
 *     documento de gente que não tem nada a ver com o produto.
 */
export function traduzir(
  provedor: ProvedorDeWebhook,
  corpo: unknown
): AvisoDePagamento | null {
  if (typeof corpo !== "object" || corpo === null) return null;
  const c = corpo as Record<string, unknown>;

  if (provedor === "asaas") {
    const evento = typeof c.event === "string" ? c.event : "";
    const pagamento = (c.payment ?? {}) as Record<string, unknown>;
    const id = typeof pagamento.id === "string" ? pagamento.id : null;
    if (!id) return null;

    return {
      provedor,
      // O Asaas não manda id de evento próprio: a chave é o pagamento mais o
      // tipo do evento, senão "recebido" e "confirmado" do mesmo pagamento
      // colidiriam e o segundo seria descartado como repetido.
      externalId: `${evento}:${id}`,
      providerChargeId: id,
      pago: evento === "PAYMENT_RECEIVED" || evento === "PAYMENT_CONFIRMED",
      valorCents: emCentavos(pagamento.value),
      pagoEm:
        typeof pagamento.paymentDate === "string"
          ? pagamento.paymentDate
          : null,
      payload: corpo as Json,
    };
  }

  if (provedor === "mercado_pago") {
    const dados = (c.data ?? {}) as Record<string, unknown>;
    const id = typeof dados.id === "string" ? dados.id : null;
    if (!id) return null;

    return {
      provedor,
      externalId:
        typeof c.id === "string" || typeof c.id === "number"
          ? String(c.id)
          : id,
      providerChargeId: id,
      // O Mercado Pago avisa que ALGO mudou e espera que se consulte a API
      // para saber o quê. Sem credencial não dá para consultar, então só o
      // que vier explícito no corpo conta como pago.
      pago: c.action === "payment.updated" && c.status === "approved",
      valorCents: emCentavos(c.transaction_amount),
      pagoEm: typeof c.date_approved === "string" ? c.date_approved : null,
      payload: corpo as Json,
    };
  }

  // EFI (Pix): a notificação traz uma lista de Pix recebidos.
  const pix = Array.isArray(c.pix) ? c.pix : [];
  const primeiro = (pix[0] ?? {}) as Record<string, unknown>;
  const txid = typeof primeiro.txid === "string" ? primeiro.txid : null;
  if (!txid) return null;

  return {
    provedor,
    externalId:
      typeof primeiro.endToEndId === "string" ? primeiro.endToEndId : txid,
    providerChargeId: txid,
    pago: true,
    valorCents: emCentavos(primeiro.valor),
    pagoEm: typeof primeiro.horario === "string" ? primeiro.horario : null,
    payload: corpo as Json,
  };
}

/**
 * Reais para centavos, sem passar por float.
 *
 * `Math.round(19.99 * 100)` dá 1999, mas `2.675 * 100` dá 267.49999999999997
 * e arredonda para baixo. Em cobrança isso é dinheiro perdido de um lado ou
 * cobrado a mais do outro, e ninguém percebe até alguém conferir extrato.
 */
function emCentavos(valor: unknown): number | null {
  if (typeof valor === "number") {
    return Math.round(valor * 100);
  }
  if (typeof valor !== "string") return null;

  const limpo = valor.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  const [inteiro, decimal = ""] = limpo.split(".");
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));
}
