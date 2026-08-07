import { describe, expect, it } from "vitest";

import { contrastRatio, formatRatio, relativeLuminance } from "./contrast";

describe("contrastRatio", () => {
  it("branco vs preto é 21:1", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
  });

  it("é simétrico (ordem não importa)", () => {
    expect(contrastRatio("#12A05F", "#FFFFFF")).toBeCloseTo(
      contrastRatio("#FFFFFF", "#12A05F"),
      5
    );
  });

  it("aceita hex de 3 dígitos", () => {
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(21, 1);
  });

  // Propriedades de acessibilidade (seção 11.1). Os decimais exatos do design
  // são aproximados; o que importa é reprovar/aprovar no limiar de 4.5:1.
  it("brand-500 sobre branco reprova para texto normal (< 4.5:1)", () => {
    const r = contrastRatio("#12A05F", "#FFFFFF");
    expect(r).toBeGreaterThan(3);
    expect(r).toBeLessThan(4.5);
  });

  it("brand-700 sobre branco aprova para texto (>= 4.5:1)", () => {
    expect(contrastRatio("#0A6C40", "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });

  it("branco sobre brand-600 (botão primário) atinge >= 4.5:1", () => {
    expect(contrastRatio("#FFFFFF", "#0D8850")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("relativeLuminance", () => {
  it("preto = 0, branco = 1", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
  });
});

describe("formatRatio", () => {
  it("formata com uma casa e sufixo :1", () => {
    expect(formatRatio(6.42)).toBe("6.4:1");
  });
});
