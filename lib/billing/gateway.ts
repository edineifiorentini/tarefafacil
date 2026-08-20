/**
 * Fronteira com o provedor de pagamento.
 *
 * Existe para que TUDO acima dela — decidir cobrar, marcar pago, empurrar o
 * acesso — seja testável sem credencial e sem rede. É também o que permite
 * trocar de provedor sem mexer em regra de negócio: a EFI aparece só na
 * implementação, nunca no tipo.
 *
 * Valores em CENTAVOS, sempre. Real com ponto decimal em código de cobrança
 * é como se perde dinheiro para arredondamento.
 */

export type PixCharge = {
  /** Identificador no provedor. Na EFI é o `txid` da cobrança Pix. */
  providerChargeId: string;
  /** Imagem do QR code, geralmente data URI. */
  qrCode: string;
  /** O "copia e cola" — na prática é o que as pessoas usam. */
  copiaECola: string;
  expiresAt: Date;
};

export type CreatePixInput = {
  amountCents: number;
  /** Aparece no extrato de quem paga. Curto: alguns bancos truncam. */
  description: string;
  /** Segundos até a cobrança expirar no provedor. */
  expiresInSeconds: number;
  /** Só para conciliação; nunca exibido ao pagador. */
  reference: string;
};

export type ChargeStatus = {
  paid: boolean;
  paidAt: Date | null;
  paidAmountCents: number | null;
};

export interface PaymentGateway {
  createPixCharge(input: CreatePixInput): Promise<PixCharge>;
  /** Consulta direta — usada para conciliar quando o webhook não chega. */
  getChargeStatus(providerChargeId: string): Promise<ChargeStatus>;
}

/**
 * Implementação de mentira, para teste e para a interface poder ser
 * construída antes das credenciais existirem.
 *
 * Nunca é escolhida por acidente: quem constrói o gateway decide qual usar
 * a partir da configuração, e sem credencial o servidor recusa cobrar em
 * vez de cair aqui em silêncio. Um gateway falso ativo em produção diria
 * "pago" para dinheiro que não entrou.
 */
export class FakeGateway implements PaymentGateway {
  private pagas = new Set<string>();
  private criadas = new Map<string, CreatePixInput>();

  async createPixCharge(input: CreatePixInput): Promise<PixCharge> {
    const id = `fake-${this.criadas.size + 1}`;
    this.criadas.set(id, input);
    return {
      providerChargeId: id,
      qrCode: "data:image/png;base64,fake",
      copiaECola: `00020126fake${input.amountCents}`,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    };
  }

  async getChargeStatus(providerChargeId: string): Promise<ChargeStatus> {
    const paga = this.pagas.has(providerChargeId);
    const input = this.criadas.get(providerChargeId);
    return {
      paid: paga,
      paidAt: paga ? new Date() : null,
      paidAmountCents: paga ? (input?.amountCents ?? null) : null,
    };
  }

  /** Só para teste: simula o pagamento chegando. */
  marcarComoPaga(providerChargeId: string): void {
    this.pagas.add(providerChargeId);
  }
}
