import "server-only";

import type { EfiConfig } from "./config";
import { pedirAEfi } from "./http";

/**
 * O token de acesso da EFI.
 *
 * OAuth `client_credentials` com Basic no cabeçalho — e o certificado no
 * mTLS, que é o que a API Pix exige além da senha. As duas coisas juntas:
 * quem tem só as chaves não fala com a EFI, e quem tem só o certificado
 * também não.
 *
 * **O token é guardado em memória e reaproveitado.** Ele vale cerca de uma
 * hora; pedir um novo a cada cobrança seria uma ida de rede a mais em cada
 * operação e um consumo de cota que ninguém precisa gastar. O cache vive no
 * processo, então cada instância da função tem o seu — o que está certo:
 * token compartilhado entre instâncias exigiria guardá-lo em algum lugar, e
 * guardar credencial é sempre pior do que buscá-la de novo.
 */

type TokenEmCache = {
  valor: string;
  /** Instante em que ele deixa de servir, já com folga. */
  expiraEm: number;
};

const cache = new Map<string, TokenEmCache>();

/**
 * Folga antes do vencimento real.
 *
 * Um token que expira no meio do voo devolve 401 numa cobrança que já
 * começou. Sessenta segundos é bem mais do que a chamada demora.
 */
const FOLGA_MS = 60_000;

/** Chave do cache: ambiente + client id. Nunca inclui o segredo. */
function chaveDoCache(c: EfiConfig): string {
  return `${c.ambiente}:${c.clientId}`;
}

export type ResultadoDoToken =
  | { ok: true; token: string; doCache: boolean }
  | { ok: false; status: number; mensagem: string };

export async function obterToken(
  config: EfiConfig,
  opcoes: { forcar?: boolean } = {}
): Promise<ResultadoDoToken> {
  const chave = chaveDoCache(config);
  const guardado = cache.get(chave);

  if (!opcoes.forcar && guardado && guardado.expiraEm > Date.now()) {
    return { ok: true, token: guardado.valor, doCache: true };
  }

  const basic = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");

  const resposta = await pedirAEfi(config, {
    metodo: "POST",
    caminho: "/oauth/token",
    cabecalhos: {
      authorization: `Basic ${basic}`,
      "content-type": "application/json",
    },
    corpo: JSON.stringify({ grant_type: "client_credentials" }),
  });

  if (resposta.status !== 200) {
    return {
      ok: false,
      status: resposta.status,
      mensagem: mensagemDeErro(resposta.status, resposta.corpo),
    };
  }

  let dados: { access_token?: string; expires_in?: number };
  try {
    dados = JSON.parse(resposta.corpo) as typeof dados;
  } catch {
    return {
      ok: false,
      status: resposta.status,
      mensagem: "A EFI respondeu 200 com um corpo que não é JSON.",
    };
  }

  if (!dados.access_token) {
    return {
      ok: false,
      status: resposta.status,
      mensagem: "A EFI respondeu sem `access_token`.",
    };
  }

  // Sem `expires_in`, assume uma hora — que é o padrão da EFI. Melhor
  // renovar cedo demais do que tarde demais.
  const duracaoMs = (dados.expires_in ?? 3600) * 1000;
  cache.set(chave, {
    valor: dados.access_token,
    expiraEm: Date.now() + Math.max(0, duracaoMs - FOLGA_MS),
  });

  return { ok: true, token: dados.access_token, doCache: false };
}

/**
 * Traduz o erro da EFI para algo acionável.
 *
 * O corpo cru entra junto porque ele às vezes traz o detalhe que importa —
 * mas a frase da frente diz o que fazer, que é o que falta num 401 seco.
 */
function mensagemDeErro(status: number, corpo: string): string {
  const curto = corpo.slice(0, 300);

  if (status === 401) {
    return `Credenciais recusadas pela EFI (401). Confira se EFI_CLIENT_ID e EFI_CLIENT_SECRET são do MESMO ambiente do certificado. ${curto}`;
  }
  if (status === 403) {
    return `A EFI aceitou a credencial mas negou o acesso (403). Normalmente é escopo faltando na aplicação. ${curto}`;
  }
  if (status === 404) {
    return `Endereço não encontrado (404). Confira o ambiente configurado. ${curto}`;
  }
  return `A EFI respondeu ${status}. ${curto}`;
}

/** Só para teste: esquece o que está guardado. */
export function limparCacheDeToken(): void {
  cache.clear();
}
