import { describe, expect, it } from "vitest";

import {
  LADO_MAXIMO,
  TAMANHO_MAXIMO,
  dimensaoAlvo,
  validarArquivoDeLogo,
} from "./logo";

/**
 * Esta é a regra que decide o que entra num bucket PÚBLICO. Cada caso aqui é
 * uma forma de deixar entrar o que não devia, ou de recusar o que devia
 * passar.
 */

describe("validarArquivoDeLogo", () => {
  it("aceita os três formatos previstos", () => {
    for (const type of ["image/png", "image/webp", "image/jpeg"]) {
      expect(validarArquivoDeLogo({ type, size: 1000 })).toEqual({ ok: true });
    }
  });

  it("recusa SVG, e diz o que fazer", () => {
    // O caso que importa: SVG é XML e pode carregar <script>. A mensagem
    // precisa dizer a saída, senão a pessoa tenta o mesmo arquivo de novo.
    const r = validarArquivoDeLogo({ type: "image/svg+xml", size: 500 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.motivo).toMatch(/SVG/);
      expect(r.motivo).toMatch(/PNG|WebP/);
    }
  });

  it("recusa formato fora da lista", () => {
    for (const type of ["image/gif", "application/pdf", "text/html", ""]) {
      expect(validarArquivoDeLogo({ type, size: 500 }).ok).toBe(false);
    }
  });

  it("recusa acima do teto e informa o limite", () => {
    const r = validarArquivoDeLogo({
      type: "image/png",
      size: TAMANHO_MAXIMO + 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/\d+ MB/);
  });

  it("aceita exatamente no teto", () => {
    // Fronteira: `>` e não `>=`, senão o limite anunciado é mentira.
    expect(
      validarArquivoDeLogo({ type: "image/png", size: TAMANHO_MAXIMO }).ok
    ).toBe(true);
  });

  it("recusa arquivo vazio", () => {
    // Chega a acontecer com upload interrompido. Sem isto, subiria um
    // arquivo de 0 byte e a casca ficaria com uma imagem quebrada.
    expect(validarArquivoDeLogo({ type: "image/png", size: 0 }).ok).toBe(false);
  });
});

describe("dimensaoAlvo", () => {
  it("não amplia imagem menor que o teto", () => {
    // Esticar uma logo de 80px para 512px não acrescenta informação e só
    // engorda o arquivo.
    expect(dimensaoAlvo(80, 40)).toEqual({ largura: 80, altura: 40 });
  });

  it("reduz pelo maior lado, mantendo a proporção", () => {
    const r = dimensaoAlvo(1000, 500);
    expect(r.largura).toBe(LADO_MAXIMO);
    expect(r.altura).toBe(LADO_MAXIMO / 2);
  });

  it("funciona com a logo em pé, não só deitada", () => {
    // O caso que um teto só de largura erraria.
    const r = dimensaoAlvo(500, 1000);
    expect(r.altura).toBe(LADO_MAXIMO);
    expect(r.largura).toBe(LADO_MAXIMO / 2);
  });

  it("no teto exato, não mexe", () => {
    expect(dimensaoAlvo(LADO_MAXIMO, 100)).toEqual({
      largura: LADO_MAXIMO,
      altura: 100,
    });
  });

  it("nunca devolve zero", () => {
    // Uma faixa muito fina arredondaria para 0 e o canvas recusaria.
    const r = dimensaoAlvo(4000, 3);
    expect(r.largura).toBeGreaterThan(0);
    expect(r.altura).toBeGreaterThan(0);
  });

  it("aguenta dimensão zero sem dividir por zero", () => {
    expect(dimensaoAlvo(0, 0)).toEqual({ largura: 0, altura: 0 });
  });
});
