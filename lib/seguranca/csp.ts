/**
 * A Content-Security-Policy do TAFLOW, e a redução dos avisos que ela gera.
 *
 * Puro: sem React, sem banco, sem rede. Mora aqui porque duas pontas muito
 * distantes precisam da mesma verdade — o `next.config.ts`, que monta o
 * cabeçalho, e a rota `/api/csp`, que recebe o que o navegador reclama.
 *
 * **ESTÁ EM MODO RELATÓRIO, E ISSO É O PLANO.** O cabeçalho emitido é
 * `Content-Security-Policy-Report-Only`: o navegador não bloqueia nada,
 * apenas avisa o que bloquearia. Uma CSP escrita de cabeça quebra tela em
 * produção sem erro visível — a imagem some, o botão não responde, e nada
 * aparece no log do servidor. Medir primeiro é o que evita isso.
 *
 * **Por que `'unsafe-inline'` nos scripts durante a medição.** O jeito forte
 * é nonce, mas o Next só aplica nonce lendo o cabeçalho
 * `Content-Security-Policy` — ele não olha o `Report-Only`. Ligado agora,
 * cada script do próprio Next viraria uma violação falsa e o relatório
 * afogaria o que interessa: QUAIS ORIGENS o app contata de verdade. Essa é
 * a pergunta desta fase. A escolha entre nonce (que obriga toda página a
 * ser dinâmica) e SRI fica para quando a política passar a valer.
 */

/** Onde o navegador entrega os avisos. */
export const ROTA_DO_RELATORIO = "/api/csp";

/**
 * Monta a política.
 *
 * @param supabaseUrl a origem do projeto Supabase. Entra em quatro
 *   diretivas porque o navegador fala com ele de quatro jeitos: consulta
 *   (`connect`), avatar e logo (`img`), pré-visualização de vídeo e áudio
 *   (`media`) e o `<object>` que desenha PDF (`object`).
 * @param dev em desenvolvimento o React usa `eval` para remontar a pilha de
 *   erro do servidor no navegador. Sem isto, o console local vira uma
 *   parede de violações que não existem em produção.
 */
export function montarCsp(supabaseUrl: string, dev = false): string {
  const supa = origemDe(supabaseUrl);
  const fontes = supa ? ` ${supa}` : "";

  const diretivas = [
    "default-src 'self'",
    "base-uri 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    // O Next e o Tailwind injetam estilo inline; sem isto o relatório fica
    // ilegível de tanto aviso sobre a nossa própria folha de estilo.
    "style-src 'self' 'unsafe-inline'",
    // `data:` e `blob:`: a pré-visualização da foto antes de enviar é um
    // blob local, e ícones embutidos vêm como data URI.
    `img-src 'self' data: blob:${fontes} https://*.googleusercontent.com`,
    `media-src 'self' blob:${fontes}`,
    // O PDF do material de aprovação é desenhado num `<object>` apontando
    // para a URL assinada.
    `object-src 'self'${fontes}`,
    `connect-src 'self'${fontes}`,
    // A Inter é auto-hospedada pelo `next/font`: nada de Google Fonts.
    "font-src 'self'",
    "form-action 'self'",
    // Combina com o X-Frame-Options SAMEORIGIN que já vai no mesmo response.
    // Dizer 'none' aqui e SAMEORIGIN lá seria contar duas histórias.
    "frame-ancestors 'self'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
    `report-uri ${ROTA_DO_RELATORIO}`,
    // `report-to` é o sucessor do `report-uri`; os dois vão juntos porque a
    // troca ainda não terminou nos navegadores.
    "report-to csp",
  ];

  return diretivas.join("; ");
}

/** A origem de uma URL, ou vazio se ela não for válida. */
export function origemDe(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

/**
 * O corpo de um aviso de violação, do jeito que os navegadores mandam.
 *
 * Duas formas convivem: `report-uri` manda `{"csp-report": {...}}` com
 * chaves em hífen, e `report-to` manda uma LISTA de `{type, body}` com
 * chaves em camelCase. Quem recebe precisa aceitar as duas.
 */
export type ViolacaoReduzida = {
  directive: string;
  origem: string;
  rota: string;
};

/**
 * Reduz o aviso ao que pode ser guardado.
 *
 * **O endereço não entra em claro, e é o ponto deste arquivo.** No TAFLOW o
 * endereço tem segredo dentro: `/d/<token>` é o link que o cliente abre, e
 * uma URL assinada do storage carrega a assinatura na query. Guardar o
 * aviso como veio transformaria a tabela de diagnóstico num depósito de
 * tokens — e ela existe justamente para ajudar a fechar o sistema.
 *
 * Do recurso barrado sobra a ORIGEM; da página, o FORMATO da rota. Isso é o
 * suficiente para decidir a política e não serve para entrar em lugar
 * nenhum.
 */
export function reduzirViolacao(bruto: unknown): ViolacaoReduzida | null {
  const corpo = corpoDaViolacao(bruto);
  if (!corpo) return null;

  const directive = primeiraPalavra(
    texto(corpo["effective-directive"]) ||
      texto(corpo.effectiveDirective) ||
      texto(corpo["violated-directive"]) ||
      texto(corpo.violatedDirective)
  );
  if (!directive) return null;

  const bloqueado =
    texto(corpo["blocked-uri"]) || texto(corpo.blockedURL) || "";
  const documento =
    texto(corpo["document-uri"]) || texto(corpo.documentURL) || "";

  return {
    directive,
    origem: origemBarrada(bloqueado),
    rota: formatoDaRota(documento),
  };
}

function corpoDaViolacao(bruto: unknown): Record<string, unknown> | null {
  if (typeof bruto !== "object" || bruto === null) return null;

  // report-to: uma lista de relatórios. Pegamos o primeiro de tipo "csp".
  if (Array.isArray(bruto)) {
    for (const item of bruto) {
      if (typeof item !== "object" || item === null) continue;
      const r = item as Record<string, unknown>;
      if (r.type !== undefined && r.type !== "csp-violation") continue;
      if (typeof r.body === "object" && r.body !== null) {
        return r.body as Record<string, unknown>;
      }
    }
    return null;
  }

  const r = bruto as Record<string, unknown>;
  // report-uri: { "csp-report": { ... } }
  if (typeof r["csp-report"] === "object" && r["csp-report"] !== null) {
    return r["csp-report"] as Record<string, unknown>;
  }
  return r;
}

const texto = (v: unknown): string => (typeof v === "string" ? v : "");
const primeiraPalavra = (v: string): string => v.trim().split(/\s+/)[0] ?? "";

/**
 * A origem do que foi barrado.
 *
 * Valores como `inline`, `eval` e `data` não são endereço: o navegador os
 * usa para dizer QUE TIPO de coisa barrou. Eles passam como estão, porque
 * são justamente o que decide se a política precisa de nonce.
 */
export function origemBarrada(bloqueado: string): string {
  const limpo = bloqueado.trim();
  if (!limpo) return "desconhecida";
  if (!limpo.includes("://")) return limpo.split(":")[0] || "desconhecida";
  return origemDe(limpo) || "desconhecida";
}

/**
 * O formato da rota, sem identificador nenhum.
 *
 * `/d/9f2c...` vira `/d/:id`, `/tarefa/<uuid>` vira `/tarefa/:id`. Qualquer
 * segmento que pareça identificador — uuid, hexadecimal longo, número — é
 * trocado. Query e âncora somem inteiras: é onde mora a assinatura.
 */
export function formatoDaRota(documento: string): string {
  if (!documento.trim()) return "desconhecida";

  let caminho = documento.trim();
  try {
    caminho = new URL(documento).pathname;
  } catch {
    caminho = caminho.split(/[?#]/)[0];
  }

  const trocado = caminho
    .split("/")
    .map((seg) => (pareceIdentificador(seg) ? ":id" : seg))
    .join("/");

  return trocado || "/";
}

function pareceIdentificador(segmento: string): boolean {
  if (segmento.length === 0) return false;
  if (/^\d+$/.test(segmento)) return true;
  // uuid, token do link público (hex longo) e qualquer coisa comprida e
  // aleatória o bastante para ser um identificador.
  if (/^[0-9a-f-]{16,}$/i.test(segmento)) return true;
  return segmento.length >= 24;
}
