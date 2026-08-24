/**
 * Fronteira com o provedor de recebimento DA EMPRESA.
 *
 * Não confundir com `lib/billing/gateway.ts`: aquele é a plataforma cobrando
 * os assinantes dela, com uma credencial só, no ambiente. Este é cada
 * empresa cobrando os clientes dela, com credencial própria (roadmap §21).
 *
 * Por ora a interface só sabe CONFERIR credencial. Emitir cobrança vem
 * depois; guardar chave que ninguém testou seria guardar um problema para
 * descobrir no dia em que o cliente precisar receber.
 */

export type ProviderId = "mercado_pago" | "asaas";
export type Environment = "sandbox" | "producao";

/**
 * Por que `kind` existe.
 *
 * "Token inválido" quando o provedor está fora do ar faz a pessoa ir ao
 * painel revogar uma chave que estava boa, gerar outra, e falhar de novo. As
 * três causas pedem três ações diferentes: conferir a chave, trocar o
 * ambiente, ou esperar.
 */
export type VerifyFailure = {
  ok: false;
  kind: "credencial" | "ambiente" | "indisponivel";
  message: string;
};

export type VerifyResult = { ok: true; label: string } | VerifyFailure;

export type TokenCheck = { ok: true } | { ok: false; message: string };

export interface PaymentProvider {
  readonly id: ProviderId;
  readonly name: string;
  /**
   * Confere o formato antes de gastar uma chamada de rede — e é o que pega o
   * erro mais caro destes provedores: chave de teste cadastrada como
   * produção, ou o contrário. Uma cobrança de teste que o cliente final
   * recebe de verdade não tem desfazer.
   */
  inspectToken(token: string, environment: Environment): TokenCheck;
  verify(token: string, environment: Environment): Promise<VerifyResult>;
}

/** Tempo máximo esperando o provedor. Passou disso, é indisponibilidade. */
export const VERIFY_TIMEOUT_MS = 10_000;

/**
 * Traduz a resposta HTTP em causa.
 *
 * 401/403 é a única faixa que autoriza dizer "a credencial está errada".
 * Todo o resto — 500, 502, timeout, DNS — é problema do outro lado, e a
 * mensagem precisa deixar isso claro para ninguém sair revogando chave boa.
 */
export function failureFromStatus(status: number, nome: string): VerifyFailure {
  if (status === 401 || status === 403) {
    return {
      ok: false,
      kind: "credencial",
      message: `O ${nome} recusou essa credencial. Confira se copiou a chave inteira`,
    };
  }
  return {
    ok: false,
    kind: "indisponivel",
    message: `O ${nome} não respondeu agora. A credencial não foi salva — tente de novo em instantes`,
  };
}
