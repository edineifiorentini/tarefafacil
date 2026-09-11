import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança (11/set/2026).
 *
 * Antes disto a produção só respondia com o HSTS que a Vercel põe sozinha.
 * Cada cabeçalho abaixo fecha uma porta concreta:
 *
 * - **X-Frame-Options** impede que o TAFLOW seja aberto dentro de um iframe
 *   de terceiro. Sem ele, dá para empilhar uma página invisível sobre um
 *   botão real e colher o clique de quem está logado — inclusive o
 *   "Aprovar" da página pública do cliente. `SAMEORIGIN` e não `DENY`
 *   porque bloquear terceiros é o que protege; proibir também o próprio
 *   domínio só criaria armadilha para uma tela futura de impressão.
 *
 * - **nosniff** manda o navegador respeitar o `content-type` declarado. Sem
 *   ele, um arquivo enviado por alguém pode ser adivinhado como HTML e
 *   executado como script na nossa origem.
 *
 * - **Referrer-Policy** corta o endereço completo ao sair do site. Um link
 *   clicado de dentro de `/d/<token>` levaria o TOKEN do cliente no
 *   cabeçalho `Referer` para o site de destino.
 *
 * - **Permissions-Policy** desliga câmera, microfone e localização, que o
 *   produto não usa. Não quebra o envio de foto: `<input type="file">` não
 *   passa por esta política.
 *
 * A Content-Security-Policy NÃO entra aqui ainda, e é decisão: ela precisa
 * listar cada origem que o app carrega (fontes do Google, Supabase, imagens
 * assinadas) e uma lista incompleta quebra a tela em produção sem erro
 * visível. Fica como passo seguinte, medida com a tela aberta.
 */
const cabecalhosDeSeguranca = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Não anunciar o framework: é a primeira coisa que um varredor procura
  // para saber quais falhas conhecidas tentar.
  poweredByHeader: false,

  headers() {
    return Promise.resolve([
      { source: "/:path*", headers: cabecalhosDeSeguranca },
    ]);
  },
};

export default nextConfig;
