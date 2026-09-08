import "server-only";

import { request as httpsRequest } from "node:https";

import type { EfiConfig } from "./config";

/**
 * A camada de rede da EFI, com mTLS.
 *
 * **Por que `node:https` e não `fetch`:** a API Pix exige TLS mútuo — o
 * cliente apresenta o `.p12` e o servidor confere. O `fetch` do Node não
 * expõe isso sem um dispatcher do `undici`, que neste projeto só existe
 * como dependência transitiva e sumiria numa atualização. O `node:https`
 * é embutido, aceita `pfx` direto, e não acrescenta dependência.
 *
 * Toda resposta volta como texto cru mais o status. Quem chama decide o que
 * fazer: a EFI responde erro em JSON com formatos diferentes por endpoint, e
 * tentar normalizar aqui esconderia justamente a mensagem que ajuda.
 */

export type RespostaEfi = {
  status: number;
  corpo: string;
};

export type PedidoEfi = {
  metodo: "GET" | "POST" | "PUT";
  caminho: string;
  cabecalhos?: Record<string, string>;
  corpo?: string;
  /** Milissegundos. A EFI responde rápido; travar é pior que falhar. */
  timeoutMs?: number;
};

const TIMEOUT_PADRAO = 15_000;

export function pedirAEfi(
  config: EfiConfig,
  pedido: PedidoEfi
): Promise<RespostaEfi> {
  const url = new URL(pedido.caminho, config.baseUrl);

  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        method: pedido.metodo,
        hostname: url.hostname,
        path: url.pathname + url.search,
        port: 443,
        // O certificado do cliente. Sem senha: a EFI gera o `.p12` sem
        // passphrase, e inventar uma aqui faria o handshake falhar com um
        // erro que não diz isso.
        pfx: config.certificado,
        passphrase: "",
        headers: {
          ...pedido.cabecalhos,
          ...(pedido.corpo
            ? { "content-length": Buffer.byteLength(pedido.corpo).toString() }
            : {}),
        },
      },
      (res) => {
        let dados = "";
        res.setEncoding("utf8");
        res.on("data", (p) => (dados += p));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, corpo: dados })
        );
      }
    );

    req.setTimeout(pedido.timeoutMs ?? TIMEOUT_PADRAO, () => {
      req.destroy(
        new Error(
          `Tempo esgotado falando com a EFI (${pedido.metodo} ${pedido.caminho}).`
        )
      );
    });

    // O erro de mTLS chega aqui, e o texto dele é críptico. Traduzir os dois
    // mais comuns economiza a tarde de quem está configurando.
    req.on("error", (e: NodeJS.ErrnoException) => {
      reject(traduzirErroDeRede(e, config));
    });

    if (pedido.corpo) req.write(pedido.corpo);
    req.end();
  });
}

function traduzirErroDeRede(
  e: NodeJS.ErrnoException,
  config: EfiConfig
): Error {
  const cru = e.message ?? String(e);

  if (/mac verify failure|wrong final block|bad decrypt/i.test(cru)) {
    return new Error(
      `Certificado da EFI recusado ao abrir: o .p12 parece corrompido ou pede senha. Refaça o base64 a partir do arquivo original. (${cru})`
    );
  }
  if (/alert|handshake|certificate|SSL|TLS/i.test(cru)) {
    return new Error(
      `A EFI recusou o certificado no handshake. Confira se o .p12 é do ambiente "${config.ambiente}" — certificado de produção não abre em homologação e vice-versa. (${cru})`
    );
  }
  if (e.code === "ENOTFOUND" || e.code === "ECONNREFUSED") {
    return new Error(`Não foi possível alcançar ${config.baseUrl}. (${cru})`);
  }
  return new Error(`Falha de rede falando com a EFI: ${cru}`);
}
