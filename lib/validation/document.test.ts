import { describe, expect, it } from "vitest";

import {
  isValidCNPJ,
  isValidCPF,
  isValidDocument,
  maskCNPJ,
  maskCPF,
  onlyDigits,
} from "./document";

describe("maskCPF", () => {
  it("vai formatando conforme os dígitos entram", () => {
    expect(maskCPF("123")).toBe("123");
    expect(maskCPF("1234")).toBe("123.4");
    expect(maskCPF("1234567")).toBe("123.456.7");
    expect(maskCPF("12345678901")).toBe("123.456.789-01");
  });

  it("ignora o que não é dígito e trunca o excesso", () => {
    expect(maskCPF("123.456.789-01")).toBe("123.456.789-01");
    expect(maskCPF("12345678901999")).toBe("123.456.789-01");
  });
});

describe("maskCNPJ", () => {
  it("vai formatando conforme os dígitos entram", () => {
    expect(maskCNPJ("12")).toBe("12");
    expect(maskCNPJ("12345")).toBe("12.345");
    expect(maskCNPJ("12345678")).toBe("12.345.678");
    expect(maskCNPJ("123456780001")).toBe("12.345.678/0001");
    expect(maskCNPJ("12345678000199")).toBe("12.345.678/0001-99");
  });
});

describe("isValidCPF", () => {
  it("aceita CPF com dígito verificador correto", () => {
    // Números de teste conhecidos, com DV válido.
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("11144477735")).toBe(true);
  });

  it("recusa dígito verificador errado", () => {
    expect(isValidCPF("529.982.247-24")).toBe(false);
    expect(isValidCPF("11144477734")).toBe(false);
  });

  it("recusa sequência repetida e tamanho errado", () => {
    expect(isValidCPF("111.111.111-11")).toBe(false);
    expect(isValidCPF("00000000000")).toBe(false);
    expect(isValidCPF("1234567890")).toBe(false);
  });
});

describe("isValidCNPJ", () => {
  it("aceita CNPJ com dígito verificador correto", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
    expect(isValidCNPJ("04252011000110")).toBe(true);
  });

  it("recusa dígito verificador errado", () => {
    expect(isValidCNPJ("11.222.333/0001-82")).toBe(false);
  });

  it("recusa sequência repetida e tamanho errado", () => {
    expect(isValidCNPJ("11111111111111")).toBe(false);
    expect(isValidCNPJ("1122233300011")).toBe(false);
  });
});

describe("isValidDocument", () => {
  it("campo vazio é válido — o documento é opcional", () => {
    expect(isValidDocument("", "pf")).toBe(true);
    expect(isValidDocument("   ", "pj")).toBe(true);
  });

  it("escolhe a regra pelo tipo do cliente", () => {
    expect(isValidDocument("529.982.247-25", "pf")).toBe(true);
    expect(isValidDocument("529.982.247-25", "pj")).toBe(false);
    expect(isValidDocument("11.222.333/0001-81", "pj")).toBe(true);
  });
});

describe("onlyDigits", () => {
  it("tira tudo que não é número", () => {
    expect(onlyDigits("12.345.678/0001-99")).toBe("12345678000199");
  });
});
