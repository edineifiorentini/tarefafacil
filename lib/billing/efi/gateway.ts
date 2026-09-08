import "server-only";

import type {
  ChargeStatus,
  CreatePixInput,
  PaymentGateway,
  PixCharge,
} from "../gateway";
import { obterToken } from "./auth";
import type { EfiConfig } from "./config";
import { pedirAEfi } from "./http";

/**
 * A EFI por trás da fronteira `PaymentGateway`.
 *
 * Tudo acima daqui — decidir cobrar, marcar pago, empurrar acesso —
 * continua sem saber que a EFI existe. É o que permitiu escrever e testar a
 * regra de cobrança antes de haver credencial, e o que vai permitir trocar
 * de provedor sem mexer em regra de negócio.
 *
 * **Valores em centavos aqui dentro, reais com dois decimais na EFI.** A
 * conversão acontece num lugar só, na hora de montar o corpo — real com
 * ponto flutuante circulando pelo código é como se perde dinheiro para
 * arredondamento.
 */
export class EfiGateway implements PaymentGateway {
  constructor(private readonly config: EfiConfig) {}

  async createPixCharge(input: CreatePixInput): Promise<PixCharge> {
    const token = await this.autenticar();

    // `cob` é cobrança imediata: nasce, vale por um tempo e expira. É o que
    // o produto precisa — `cobv`, com vencimento, é outra API e outro
    // escopo.
    const corpo = JSON.stringify({
      calendario: { expiracao: input.expiresInSeconds },
      chave: this.config.chavePix,
      valor: { original: centavosParaReais(input.amountCents) },
      // Aparece no extrato de quem paga. A EFI corta em 140 caracteres.
      solicitacaoPagador: input.description.slice(0, 140),
      infoAdicionais: [
        // Só para conciliação nossa. Vai visível no app do banco, então
        // nunca leva dado de cliente — é o id da fatura e nada além.
        { nome: "Referência", valor: input.reference.slice(0, 200) },
      ],
    });

    const resposta = await pedirAEfi(this.config, {
      metodo: "POST",
      caminho: "/v2/cob",
      cabecalhos: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      corpo,
    });

    if (resposta.status !== 200 && resposta.status !== 201) {
      throw new Error(
        `A EFI recusou a criação da cobrança (${resposta.status}). ${resposta.corpo.slice(0, 300)}`
      );
    }

    const dados = JSON.parse(resposta.corpo) as {
      txid?: string;
      pixCopiaECola?: string;
      loc?: { id?: number };
      calendario?: { criacao?: string; expiracao?: number };
    };

    if (!dados.txid) {
      throw new Error("A EFI criou a cobrança mas não devolveu `txid`.");
    }

    // O "copia e cola" vem no `pixCopiaECola`. A IMAGEM do QR code é outro
    // endpoint (`/v2/loc/{id}/qrcode`) — e é opcional, porque na prática as
    // pessoas usam o copia e cola. Buscá-la aqui somaria uma ida de rede a
    // toda cobrança para um dado que a tela pode pedir depois.
    const qrCode = dados.loc?.id
      ? await this.buscarQrCode(dados.loc.id, token)
      : "";

    return {
      providerChargeId: dados.txid,
      qrCode,
      copiaECola: dados.pixCopiaECola ?? "",
      expiresAt: calcularExpiracao(dados.calendario, input.expiresInSeconds),
    };
  }

  async getChargeStatus(providerChargeId: string): Promise<ChargeStatus> {
    const token = await this.autenticar();

    const resposta = await pedirAEfi(this.config, {
      metodo: "GET",
      caminho: `/v2/cob/${encodeURIComponent(providerChargeId)}`,
      cabecalhos: { authorization: `Bearer ${token}` },
    });

    if (resposta.status !== 200) {
      throw new Error(
        `A EFI recusou a consulta da cobrança (${resposta.status}). ${resposta.corpo.slice(0, 300)}`
      );
    }

    const dados = JSON.parse(resposta.corpo) as {
      status?: string;
      pix?: { horario?: string; valor?: string }[];
    };

    // `CONCLUIDA` é o único estado que significa dinheiro recebido. Os
    // outros — ATIVA, REMOVIDA_PELO_USUARIO_RECEBEDOR, REMOVIDA_PELO_PSP —
    // são cobrança viva ou cancelada, nunca paga.
    const paga = dados.status === "CONCLUIDA";
    const primeiro = dados.pix?.[0];

    return {
      paid: paga,
      // A hora do PIX, não a de agora: é ela que vai para o registro e para
      // o extrato de quem conferir depois.
      paidAt: paga && primeiro?.horario ? new Date(primeiro.horario) : null,
      paidAmountCents:
        paga && primeiro?.valor ? reaisParaCentavos(primeiro.valor) : null,
    };
  }

  private async autenticar(): Promise<string> {
    const r = await obterToken(this.config);
    if (!r.ok) throw new Error(r.mensagem);
    return r.token;
  }

  /**
   * A imagem do QR code, em data URI.
   *
   * Falha aqui NÃO derruba a cobrança: ela já existe na EFI e o copia e
   * cola já funciona. Perder a imagem é perder conveniência; perder a
   * cobrança por causa da imagem seria perder a venda.
   */
  private async buscarQrCode(locId: number, token: string): Promise<string> {
    try {
      const r = await pedirAEfi(this.config, {
        metodo: "GET",
        caminho: `/v2/loc/${locId}/qrcode`,
        cabecalhos: { authorization: `Bearer ${token}` },
      });
      if (r.status !== 200) return "";
      const d = JSON.parse(r.corpo) as { imagemQrcode?: string };
      return d.imagemQrcode ?? "";
    } catch {
      return "";
    }
  }
}

/** 9900 → "99.00". A EFI exige ponto e exatamente dois decimais. */
function centavosParaReais(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

/** "99.00" → 9900. `Math.round` porque float não fecha em centavo. */
function reaisParaCentavos(reais: string): number {
  return Math.round(Number.parseFloat(reais) * 100);
}

function calcularExpiracao(
  calendario: { criacao?: string; expiracao?: number } | undefined,
  padraoSegundos: number
): Date {
  const criacao = calendario?.criacao ? new Date(calendario.criacao) : new Date();
  const segundos = calendario?.expiracao ?? padraoSegundos;
  return new Date(criacao.getTime() + segundos * 1000);
}
