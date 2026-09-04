import { describe, expect, it } from "vitest";

import {
  FUSOS_DO_BRASIL,
  deslocamentoDe,
  fusoDoAparelho,
  opcoesDeFuso,
} from "./fusos";

describe("lista de fusos", () => {
  it("começa pelo Brasil, e Brasília é o primeiro", () => {
    // Quem está em Manaus não deve caçar o próprio fuso no meio de
    // quatrocentos nomes — é assim que se desiste e fica no errado.
    expect(FUSOS_DO_BRASIL[0]?.value).toBe("America/Sao_Paulo");
    expect(FUSOS_DO_BRASIL.every((f) => f.value.startsWith("America/"))).toBe(
      true
    );
  });

  it("os quatro fusos do país estão todos lá", () => {
    const valores = FUSOS_DO_BRASIL.map((f) => f.value);
    expect(valores).toContain("America/Sao_Paulo"); // UTC-3
    expect(valores).toContain("America/Manaus"); // UTC-4
    expect(valores).toContain("America/Rio_Branco"); // UTC-5
    expect(valores).toContain("America/Noronha"); // UTC-2
  });

  it("cada rótulo diz onde é, não só o nome técnico", () => {
    // "Rio Branco" sozinho não diz a ninguém que aquilo é o Acre.
    const acre = FUSOS_DO_BRASIL.find((f) => f.value === "America/Rio_Branco");
    expect(acre?.label).toContain("Acre");
  });
});

describe("opções mostradas no seletor", () => {
  it("inclui o fuso salvo mesmo quando ele é de fora", () => {
    // Sem isto, quem tem um fuso fora da lista abriria o seletor, não
    // acharia o próprio, e o campo pareceria quebrado.
    const opcoes = opcoesDeFuso("Europe/Lisbon", null);
    expect(opcoes.some((o) => o.value === "Europe/Lisbon")).toBe(true);
  });

  it("inclui o fuso do aparelho quando ele é de fora", () => {
    const opcoes = opcoesDeFuso("America/Sao_Paulo", "America/New_York");
    expect(opcoes.some((o) => o.value === "America/New_York")).toBe(true);
  });

  it("não duplica quando salvo e aparelho são o mesmo", () => {
    const opcoes = opcoesDeFuso("Europe/Lisbon", "Europe/Lisbon");
    const quantos = opcoes.filter((o) => o.value === "Europe/Lisbon").length;
    expect(quantos).toBe(1);
  });

  it("não duplica o que já é do Brasil", () => {
    const opcoes = opcoesDeFuso("America/Manaus", "America/Manaus");
    const quantos = opcoes.filter((o) => o.value === "America/Manaus").length;
    expect(quantos).toBe(1);
  });
});

describe("deslocamento em relação ao UTC", () => {
  it("mostra UTC e não GMT — é o rótulo que a pessoa lê", () => {
    const d = deslocamentoDe("America/Sao_Paulo", new Date("2026-09-04T12:00:00Z"));
    expect(d).toBe("UTC-03:00");
  });

  it("separa os quatro fusos do Brasil", () => {
    const agora = new Date("2026-09-04T12:00:00Z");
    expect(deslocamentoDe("America/Noronha", agora)).toBe("UTC-02:00");
    expect(deslocamentoDe("America/Sao_Paulo", agora)).toBe("UTC-03:00");
    expect(deslocamentoDe("America/Manaus", agora)).toBe("UTC-04:00");
    expect(deslocamentoDe("America/Rio_Branco", agora)).toBe("UTC-05:00");
  });

  it("não estoura com fuso inválido", () => {
    expect(() => deslocamentoDe("Nao/Existe")).not.toThrow();
  });
});

describe("fuso do aparelho", () => {
  it("responde algo utilizável ou null, nunca estoura", () => {
    const f = fusoDoAparelho();
    expect(f === null || typeof f === "string").toBe(true);
  });
});
