import { describe, expect, it } from "vitest";

import { BRAND_DEFAULT, BRAND_THEMES, parseBrandTheme } from "./themes";

describe("parseBrandTheme", () => {
  it("aceita os tons da lista", () => {
    for (const t of BRAND_THEMES) {
      expect(parseBrandTheme(t.id)).toBe(t.id);
    }
  });

  it("cai no padrão em vez de estourar", () => {
    // O valor chega do banco, do cookie e da rede. Cookie adulterado ou
    // coluna de uma versão futura não podem derrubar a renderização de uma
    // página inteira — a cor errada é um problema muito menor que a tela
    // branca.
    for (const lixo of [undefined, null, "", "roxo", 42, {}, "AZUL"]) {
      expect(parseBrandTheme(lixo)).toBe(BRAND_DEFAULT);
    }
  });
});

describe("catálogo de cores", () => {
  it("não repete id", () => {
    const ids = BRAND_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("o padrão está na lista", () => {
    expect(BRAND_THEMES.some((t) => t.id === BRAND_DEFAULT)).toBe(true);
  });

  it("não oferece amarelo nem vermelho", () => {
    // Não é gosto: eles colidem com o aviso e com o atraso. Marca vermelha
    // deixaria o sistema inteiro parecendo alarmado, e o chip de atrasada —
    // a única coisa que precisa saltar — pararia de saltar.
    const proibidos = ["amarelo", "vermelho", "laranja", "coral"];
    for (const t of BRAND_THEMES) {
      expect(proibidos).not.toContain(t.id);
    }
  });
});
