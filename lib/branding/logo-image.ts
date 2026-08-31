"use client";

// Conversão da logo para WebP. Só navegador — usa Image e canvas.
//
// Por que converter, e não guardar o PNG que veio: quem exporta logo costuma
// mandar PNG de 3000px com 1,5 MB, que aparece a 132px na casca. O WebP com
// o lado maior em 512 entrega a mesma imagem em dezenas de KB, e a casca é a
// primeira coisa que carrega em toda tela.

import { dimensaoAlvo } from "./logo";

/**
 * Qualidade do WebP.
 *
 * 0.92 e não 0.8: logo é cor chapada com borda dura, o tipo de imagem em que
 * artefato de compressão aparece justamente na borda — que é o que a pessoa
 * olha. A diferença de peso entre 0.8 e 0.92 aqui é de poucos KB.
 */
const QUALIDADE = 0.92;

export type LogoConvertida = { blob: Blob; extensao: "webp" | "png" | "jpg" };

function extensaoDe(tipo: string): "webp" | "png" | "jpg" {
  if (tipo === "image/webp") return "webp";
  if (tipo === "image/jpeg") return "jpg";
  return "png";
}

function carregar(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Revoga só depois de carregar: revogar antes invalida a imagem em
      // alguns navegadores e o desenho sai em branco.
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem"));
    };
    img.src = url;
  });
}

/**
 * Reduz e converte para WebP, preservando transparência.
 *
 * **O canvas não é pintado.** Ele nasce transparente, e desenhar direto é o
 * que mantém o fundo vazado da logo. Preencher com branco — o reflexo de
 * quem veio do caminho do avatar, que grava JPEG — colocaria um retângulo
 * branco atrás de toda logo no tema escuro.
 *
 * Devolve o arquivo ORIGINAL quando a conversão não compensa:
 *
 * - navegador sem WebP em canvas (Safari antigo devolve PNG calado);
 * - resultado maior que a entrada, o que acontece com logo pequena já
 *   otimizada.
 *
 * Nos dois casos converter deixaria a coisa pior, e o original já passou
 * pela validação.
 */
export async function converterParaWebp(file: File): Promise<LogoConvertida> {
  let img: HTMLImageElement;
  try {
    img = await carregar(file);
  } catch {
    return { blob: file, extensao: extensaoDe(file.type) };
  }

  const { largura, altura } = dimensaoAlvo(
    img.naturalWidth,
    img.naturalHeight
  );

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: file, extensao: extensaoDe(file.type) };

  // Suavização alta: reduzir logo com borda dura sem isto serrilha o
  // contorno, que é onde o olho pega.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, largura, altura);

  const convertida = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/webp", QUALIDADE);
  });

  if (
    !convertida ||
    convertida.type !== "image/webp" ||
    convertida.size >= file.size
  ) {
    return { blob: file, extensao: extensaoDe(file.type) };
  }

  return { blob: convertida, extensao: "webp" };
}
