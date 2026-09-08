import "server-only";

import { obterToken } from "./auth";
import type { EfiConfig } from "./config";
import { pedirAEfi } from "./http";

/**
 * Registrar e conferir a URL de notificação na EFI.
 *
 * **Isto não roda sozinho, e é de propósito.** Registrar webhook aponta a
 * EFI para um endereço; fazê-lo em cada boot significaria que um deploy de
 * preview redirecionaria as notificações de produção para si. É ação
 * deliberada, disparada por quem administra.
 *
 * DUAS COISAS QUE SURPREENDEM, e as duas custam caro se descobertas depois:
 *
 * 1. **A EFI acrescenta `/pix` à URL registrada.** Quem registra
 *    `.../efi` recebe em `.../efi/pix`. Por isso existe a rota irmã com
 *    esse caminho — sem ela, toda notificação viraria 404 silencioso.
 *
 * 2. **Por padrão a EFI exige mTLS do NOSSO lado**: ela apresenta um
 *    certificado e espera que o servidor o valide. A Vercel não expõe isso
 *    para a função, então o registro vai com `x-skip-mtls-checking`. A
 *    consequência é honesta e está anotada: sem mTLS, o corpo do aviso não
 *    prova origem — e é por isso que `processarAviso` confere o pagamento
 *    com a EFI antes de quitar qualquer fatura (regra 5).
 */

export type ResultadoDoRegistro =
  | { ok: true; url: string; criadoEm: string | null }
  | { ok: false; status: number; mensagem: string };

/**
 * Aponta a EFI para a nossa URL.
 *
 * A EFI CHAMA a URL para validá-la antes de aceitar. Ou seja: só funciona
 * com o endereço no ar e respondendo — não dá para registrar apontando para
 * localhost.
 */
export async function registrarWebhook(
  config: EfiConfig,
  urlDoWebhook: string
): Promise<ResultadoDoRegistro> {
  const t = await obterToken(config);
  if (!t.ok) return { ok: false, status: t.status, mensagem: t.mensagem };

  if (!urlDoWebhook.startsWith("https://")) {
    return {
      ok: false,
      status: 0,
      mensagem: "A EFI só aceita webhook em https. Endereço local não serve.",
    };
  }

  const resposta = await pedirAEfi(config, {
    metodo: "PUT",
    caminho: `/v2/webhook/${encodeURIComponent(config.chavePix)}`,
    cabecalhos: {
      authorization: `Bearer ${t.token}`,
      "content-type": "application/json",
      // Ver o comentário do topo. Sem isto a EFI exige que o nosso servidor
      // valide o certificado dela, o que a Vercel não permite.
      "x-skip-mtls-checking": "true",
    },
    corpo: JSON.stringify({ webhookUrl: urlDoWebhook }),
    // A validação da URL é uma chamada de rede que a EFI faz até nós, e ela
    // conta dentro deste tempo.
    timeoutMs: 30_000,
  });

  if (resposta.status !== 200 && resposta.status !== 201) {
    return {
      ok: false,
      status: resposta.status,
      mensagem: explicar(resposta.status, resposta.corpo, urlDoWebhook),
    };
  }

  return { ok: true, url: urlDoWebhook, criadoEm: null };
}

/** O que está registrado hoje. Leitura, não muda nada. */
export async function consultarWebhook(
  config: EfiConfig
): Promise<ResultadoDoRegistro> {
  const t = await obterToken(config);
  if (!t.ok) return { ok: false, status: t.status, mensagem: t.mensagem };

  const resposta = await pedirAEfi(config, {
    metodo: "GET",
    caminho: `/v2/webhook/${encodeURIComponent(config.chavePix)}`,
    cabecalhos: { authorization: `Bearer ${t.token}` },
  });

  // A EFI responde 400 com `webhook_nao_encontrado`, e não 404 — medido
  // contra o ambiente de homologação em 8/set/2026. Tratar isso como erro
  // genérico faria "ainda não registrei" parecer falha de integração.
  if (resposta.corpo.includes("webhook_nao_encontrado")) {
    return {
      ok: false,
      status: resposta.status,
      mensagem: "Nenhum webhook registrado para esta chave Pix ainda.",
    };
  }
  if (resposta.status !== 200) {
    return {
      ok: false,
      status: resposta.status,
      mensagem: `A EFI respondeu ${resposta.status}. ${resposta.corpo.slice(0, 200)}`,
    };
  }

  const d = JSON.parse(resposta.corpo) as {
    webhookUrl?: string;
    criacao?: string;
  };
  return {
    ok: true,
    url: d.webhookUrl ?? "(sem url na resposta)",
    criadoEm: d.criacao ?? null,
  };
}

function explicar(status: number, corpo: string, url: string): string {
  const curto = corpo.slice(0, 300);

  if (status === 400) {
    return `A EFI recusou a URL (400). Ela CHAMA o endereço para validar antes de aceitar — confira se ${url} está no ar e responde 200. ${curto}`;
  }
  if (status === 403) {
    return `Sem permissão para registrar webhook (403). Falta o escopo "Alterar Webhooks" na aplicação. ${curto}`;
  }
  if (status === 404) {
    return `A EFI não encontrou a chave Pix configurada em EFI_PIX_KEY (404). Confira se a chave existe NESTE ambiente. ${curto}`;
  }
  return `A EFI respondeu ${status}. ${curto}`;
}
