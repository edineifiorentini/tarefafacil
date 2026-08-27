import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { assinar } from "./dispatch";
import { ehEvento, EVENTOS, EVENTO_DESCRICAO } from "./events";

describe("assinatura da entrega", () => {
  const segredo = "segredo-do-destino";
  const corpo = '{"evento":"demanda.criada"}';

  it("o destino consegue reproduzir com o mesmo segredo", () => {
    // É o contrato: `HMAC-SHA256(timestamp + "." + corpo)`. Se mudar, quebra
    // a verificação de todo cliente que já implementou.
    const t = "1756300000";
    const esperada = createHmac("sha256", segredo)
      .update(`${t}.${corpo}`)
      .digest("hex");
    expect(assinar(segredo, t, corpo)).toBe(esperada);
  });

  it("o carimbo de tempo entra NA assinatura", () => {
    // Assinar só o corpo deixaria quem capturasse uma entrega reenviá-la
    // para sempre trocando o carimbo, e a conta bateria.
    expect(assinar(segredo, "1", corpo)).not.toBe(assinar(segredo, "2", corpo));
  });

  it("corpo diferente, assinatura diferente", () => {
    expect(assinar(segredo, "1", corpo)).not.toBe(
      assinar(segredo, "1", corpo.replace("criada", "excluida"))
    );
  });

  it("segredo diferente, assinatura diferente", () => {
    expect(assinar("a-secreto-aaaa", "1", corpo)).not.toBe(
      assinar("b-secreto-bbbb", "1", corpo)
    );
  });
});

describe("catálogo de eventos", () => {
  it("subtarefa NÃO está no catálogo", () => {
    // Regra 9 do CLAUDE.md. Este teste é a trava: se alguém adicionar um
    // evento de subtarefa, ele falha antes de o evento sair para alguém.
    for (const e of EVENTOS) {
      expect(e.toLowerCase()).not.toContain("subtarefa");
      expect(e.toLowerCase()).not.toContain("subtask");
    }
  });

  it("todo evento tem descrição", () => {
    // O catálogo é contrato, e contrato sem descrição vira suporte.
    for (const e of EVENTOS) {
      expect(EVENTO_DESCRICAO[e], e).toBeTruthy();
    }
  });

  it("nomes seguem 'recurso.acao' em minúsculas", () => {
    // Padrão publicado não muda depois. Melhor travar agora.
    for (const e of EVENTOS) {
      expect(e, e).toMatch(/^[a-z]+\.[a-z]+$/);
    }
  });

  it("ehEvento recusa o que não está no catálogo", () => {
    expect(ehEvento("demanda.criada")).toBe(true);
    expect(ehEvento("demanda.inventada")).toBe(false);
    expect(ehEvento("subtarefa.criada")).toBe(false);
    expect(ehEvento("")).toBe(false);
    expect(ehEvento(null)).toBe(false);
  });

  it("não há evento repetido", () => {
    expect(new Set(EVENTOS).size).toBe(EVENTOS.length);
  });
});
