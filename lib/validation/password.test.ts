import { describe, expect, it } from "vitest";

import {
  isPasswordStrong,
  PASSWORD_MIN,
  passwordIssues,
  passwordStrength,
} from "./password";

describe("passwordIssues", () => {
  it("aprova senha com letra, número, especial e tamanho", () => {
    expect(passwordIssues("Girassol!2026")).toEqual([]);
    expect(isPasswordStrong("Girassol!2026")).toBe(true);
  });

  it("cobra o tamanho mínimo", () => {
    expect(passwordIssues("Ab!1")).toContain(
      `Use pelo menos ${PASSWORD_MIN} caracteres`
    );
  });

  it("cobra letra, número e especial, cada um por si", () => {
    expect(passwordIssues("1234567890!")).toContain(
      "Inclua ao menos uma letra"
    );
    expect(passwordIssues("abcdefghij!")).toContain(
      "Inclua ao menos um número"
    );
    expect(passwordIssues("abcdefghij1")).toContain(
      "Inclua ao menos um caractere especial, como ! ? @ ou #"
    );
  });

  it("aceita acentuação de teclado brasileiro como caractere especial", () => {
    // ç não é letra ASCII, mas é letra Unicode — o especial aqui é o til.
    expect(passwordIssues("Coracao~2026")).toEqual([]);
  });

  it("recusa frase curta com espaço, que não ganha nada", () => {
    const faltas = passwordIssues("senha 1234!");
    expect(faltas.some((f) => f.includes("frase de 16"))).toBe(true);
  });

  it("aceita frase longa, que é mais forte que senha curta com símbolo", () => {
    expect(passwordIssues("meu cachorro tem 3 patas!")).toEqual([]);
  });

  it("senha vazia falha em tudo que dá para falhar", () => {
    expect(passwordIssues("").length).toBeGreaterThanOrEqual(4);
  });
});

describe("passwordStrength", () => {
  it("vazia é zero", () => {
    expect(passwordStrength("")).toBe(0);
  });

  it("cresce conforme a senha melhora", () => {
    expect(passwordStrength("abc")).toBe(1);
    expect(passwordStrength("abcdefghij1")).toBe(2);
    expect(passwordStrength("Girassol!2026")).toBe(3);
  });
});
