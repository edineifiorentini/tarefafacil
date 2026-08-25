import { describe, expect, it } from "vitest";

import { centerSquare, cropFromView, isSquare } from "./avatar";

/** Só as dimensões importam para estas duas — não precisa de imagem real. */
function img(width: number, height: number): HTMLImageElement {
  return { width, height } as HTMLImageElement;
}

describe("centerSquare", () => {
  it("corta as laterais numa foto deitada", () => {
    // 800x600: sobra 100 de cada lado.
    expect(centerSquare(img(800, 600))).toEqual({ x: 100, y: 0, size: 600 });
  });

  it("corta em cima e embaixo numa foto em pé", () => {
    expect(centerSquare(img(600, 900))).toEqual({ x: 0, y: 150, size: 600 });
  });

  it("não corta nada quando já é quadrada", () => {
    expect(centerSquare(img(500, 500))).toEqual({ x: 0, y: 0, size: 500 });
  });

  it("o recorte nunca sai da imagem", () => {
    // A garantia que importa: `drawImage` com origem fora da imagem devolve
    // faixa transparente, que vira borda preta no JPEG.
    for (const [w, h] of [
      [1, 4000],
      [4000, 1],
      [1920, 1080],
      [1080, 1920],
    ]) {
      const c = centerSquare(img(w, h));
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.x + c.size).toBeLessThanOrEqual(w);
      expect(c.y + c.size).toBeLessThanOrEqual(h);
    }
  });
});

describe("isSquare", () => {
  it("decide quem passa pelo recortador", () => {
    // É o que separa "sobe direto" de "abre o enquadramento".
    expect(isSquare(img(256, 256))).toBe(true);
    expect(isSquare(img(257, 256))).toBe(false);
  });
});

describe("cropFromView", () => {
  // Caixa de 288 e uma imagem 1000x400 deitada: o menor lado (400) preenche
  // a caixa, então a escala é 0.72 e o recorte cobre 400 pixels da original.
  const deitada = { imageWidth: 1000, imageHeight: 400, box: 288 };

  it("centralizado pega o miolo da imagem", () => {
    const escala = 288 / 400;
    const c = cropFromView({
      ...deitada,
      zoom: 1,
      offset: { x: (288 - 1000 * escala) / 2, y: 0 },
    });
    expect(c.size).toBeCloseTo(400);
    expect(c.x).toBeCloseTo(300); // (1000 - 400) / 2
    expect(c.y).toBeCloseTo(0);
  });

  it("encostado à esquerda começa no zero", () => {
    // É o que o teclado faz ao bater no limite: nada de coordenada negativa,
    // que viraria faixa transparente e borda preta no avatar.
    const c = cropFromView({ ...deitada, zoom: 1, offset: { x: 0, y: 0 } });
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
    expect(c.size).toBeCloseTo(400);
  });

  it("aproximar diminui a área recortada", () => {
    const um = cropFromView({ ...deitada, zoom: 1, offset: { x: 0, y: 0 } });
    const dois = cropFromView({ ...deitada, zoom: 2, offset: { x: 0, y: 0 } });
    expect(dois.size).toBeCloseTo(um.size / 2);
  });

  it("funciona igual numa imagem em pé", () => {
    const c = cropFromView({
      imageWidth: 400,
      imageHeight: 1000,
      box: 288,
      zoom: 1,
      offset: { x: 0, y: -(1000 * (288 / 400) - 288) },
    });
    // Encostado embaixo: o recorte termina exatamente na base da imagem.
    expect(c.y + c.size).toBeCloseTo(1000);
  });
});
