import { describe, expect, it } from "vitest";

import { INTEGRATION_GROUPS } from "./catalog";

const todas = INTEGRATION_GROUPS.flatMap((g) => g.items);

describe("catálogo de integrações", () => {
  it("não repete id entre grupos", () => {
    // Id repetido é sutil e caro: a chave do React colide e o cartão errado
    // aparece como conectado, porque o painel marca por id.
    const ids = todas.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("não tem grupo vazio", () => {
    // Grupo sem item vira só um título solto na tela.
    for (const grupo of INTEGRATION_GROUPS) {
      expect(grupo.items.length).toBeGreaterThan(0);
    }
  });

  it("segue a escrita de interface: sem ponto final na dica", () => {
    // "Sem ponto final em rótulo" (CLAUDE.md). Vale para os títulos de grupo
    // e para a dica de cada cartão — são rótulos, não frases de texto.
    for (const grupo of INTEGRATION_GROUPS) {
      expect(grupo.hint.endsWith(".")).toBe(false);
      for (const item of grupo.items) {
        expect(item.hint.endsWith(".")).toBe(false);
        expect(item.name.endsWith(".")).toBe(false);
      }
    }
  });
});
