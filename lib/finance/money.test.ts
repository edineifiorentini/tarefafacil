import { describe, expect, it } from "vitest";

import {
  centsToMaskedInput,
  formatCompactBRL,
  maskCurrencyInput,
  parseCurrencyToCents,
} from "./money";

describe("formatCompactBRL", () => {
  it("encurta milhares e milhões para o eixo do gráfico", () => {
    expect(formatCompactBRL(15_000_000)).toBe("150k");
    expect(formatCompactBRL(128_400_000)).toBe("1,3M");
    expect(formatCompactBRL(200_000_000)).toBe("2M");
    expect(formatCompactBRL(50_000)).toBe("500");
    expect(formatCompactBRL(0)).toBe("0");
  });
});

describe("maskCurrencyInput", () => {
  it("sem vírgula, completa com ,00 e separa milhar", () => {
    expect(maskCurrencyInput("1500")).toBe("1.500,00");
    expect(maskCurrencyInput("150")).toBe("150,00");
    expect(maskCurrencyInput("1234567")).toBe("1.234.567,00");
  });

  it("com vírgula, os dígitos seguintes viram centavos", () => {
    expect(maskCurrencyInput("1500,5")).toBe("1.500,50");
    expect(maskCurrencyInput("1500,")).toBe("1.500,00");
    expect(maskCurrencyInput("1500,99")).toBe("1.500,99");
    expect(maskCurrencyInput("1500,999")).toBe("1.500,99"); // trunca em 2
  });

  it("ignora tudo que não é dígito ou vírgula (ex.: já vem com pontos)", () => {
    expect(maskCurrencyInput("1.500,00")).toBe("1.500,00");
  });

  it("campo vazio continua vazio (permite apagar tudo)", () => {
    expect(maskCurrencyInput("")).toBe("");
  });

  it("só vírgula sem dígitos antes vira 0,XX", () => {
    expect(maskCurrencyInput(",5")).toBe("0,50");
  });
});

describe("centsToMaskedInput + maskCurrencyInput/parseCurrencyToCents round-trip", () => {
  it("ida e volta preserva o valor exato em centavos", () => {
    const cents = 150099; // R$ 1.500,99
    const masked = centsToMaskedInput(cents);
    expect(masked).toBe("1.500,99");
    expect(parseCurrencyToCents(masked)).toBe(cents);
  });
});
