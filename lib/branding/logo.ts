// Regras da logo da empresa (0080). Puro de propósito: sem `document`, sem
// `Image`, sem `canvas` — o que depende de navegador vive em `logo-image.ts`.
//
// Assim a regra pode ser testada no Vitest sem DOM, que é onde ela precisa
// estar certa: é ela que decide o que entra no bucket público.

/**
 * Formatos aceitos.
 *
 * **SVG fica de fora, e não é por preguiça.** SVG é XML e pode carregar
 * `<script>`. O bucket é público e servido pelo domínio do Supabase — outra
 * origem, então o estrago seria contido —, mas não existe motivo para
 * aceitar código executável num campo de imagem. Decisão do dono
 * (31/ago/2026).
 *
 * GIF também fica fora: logo animada é ruído, e o primeiro quadro seria uma
 * surpresa para quem subiu.
 */
export const TIPOS_ACEITOS = [
  "image/png",
  "image/webp",
  "image/jpeg",
] as const;

/**
 * Teto do arquivo ENVIADO, antes da conversão.
 *
 * Generoso porque quem exporta logo no Illustrator manda PNG de 4000px sem
 * pensar. A conversão derruba isso para dezenas de KB; o limite aqui só
 * evita que o navegador tente decodificar algo absurdo.
 */
export const TAMANHO_MAXIMO = 4 * 1024 * 1024;

/**
 * Maior lado depois da conversão.
 *
 * A logo aparece a 132px na casca. Em tela de retina isso pede 264px, e 512
 * dá folga para o cabeçalho do contrato e para densidade 3x sem guardar um
 * arquivo que ninguém vai enxergar inteiro.
 */
export const LADO_MAXIMO = 512;

export type Recusa = { ok: false; motivo: string };
export type Aprovacao = { ok: true };

/**
 * Confere tipo e tamanho.
 *
 * A mensagem diz o que aconteceu E o que fazer, como pede o guia de escrita:
 * "arquivo grande demais" sozinho deixa a pessoa adivinhando o limite.
 */
export function validarArquivoDeLogo(f: {
  type: string;
  size: number;
}): Aprovacao | Recusa {
  if (f.type === "image/svg+xml") {
    return {
      ok: false,
      motivo: "SVG não é aceito. Exporte a logo em PNG ou WebP",
    };
  }

  if (!(TIPOS_ACEITOS as readonly string[]).includes(f.type)) {
    return { ok: false, motivo: "Use um arquivo PNG, WebP ou JPEG" };
  }

  if (f.size > TAMANHO_MAXIMO) {
    const mb = Math.round(TAMANHO_MAXIMO / (1024 * 1024));
    return { ok: false, motivo: `A imagem passa de ${mb} MB. Reduza antes` };
  }

  if (f.size === 0) {
    return { ok: false, motivo: "O arquivo está vazio" };
  }

  return { ok: true };
}

/**
 * Dimensão final, mantendo a proporção.
 *
 * Imagem menor que o teto **não é ampliada** — esticar uma logo de 80px para
 * 512px não acrescenta informação nenhuma e só engorda o arquivo.
 */
export function dimensaoAlvo(
  largura: number,
  altura: number,
  teto = LADO_MAXIMO
): { largura: number; altura: number } {
  const maior = Math.max(largura, altura);
  if (maior <= teto || maior === 0) {
    return { largura, altura };
  }
  const fator = teto / maior;
  return {
    // `round` e não `floor`: com `floor`, uma imagem de proporção exata
    // perde um pixel e a logo fica um fio fora de esquadro.
    largura: Math.max(1, Math.round(largura * fator)),
    altura: Math.max(1, Math.round(altura * fator)),
  };
}
