import { describe, expect, it } from "vitest";

import {
  allowsAlert,
  DEFAULT_PREFS,
  filterFeed,
  prefsFrom,
  type Prefs,
} from "./prefs";
import type { FeedItem } from "./types";

const TUDO: Prefs = { ...DEFAULT_PREFS };

function alerta(
  kind: FeedItem extends { kind: infer K } ? K : never
): FeedItem {
  return {
    nature: "alerta",
    id: `a-${String(kind)}`,
    kind: kind as never,
    title: "Alerta",
    detail: "",
    target: { type: "task", id: "t1" },
    weight: 1,
  } as FeedItem;
}

function evento(kind: "mencao" | "atribuicao" | "comentario"): FeedItem {
  return {
    nature: "evento",
    id: `e-${kind}`,
    kind,
    title: "Evento",
    detail: null,
    target: { type: "task", id: "t1" },
    readAt: null,
    createdAt: "2026-08-21T10:00:00Z",
  };
}

describe("prefsFrom", () => {
  it("sem linha no banco, tudo ligado", () => {
    expect(prefsFrom(null)).toEqual(DEFAULT_PREFS);
    expect(prefsFrom(undefined)).toEqual(DEFAULT_PREFS);
  });

  it("respeita o que está gravado", () => {
    const r = prefsFrom({
      user_id: "u1",
      mencao: false,
      atribuicao: true,
      comentario: false,
      aprovacao: true,
      prazos: true,
      contratos: false,
      financeiro: true,
      updated_at: "2026-08-21T10:00:00Z",
    });
    expect(r.mencao).toBe(false);
    expect(r.contratos).toBe(false);
    expect(r.atribuicao).toBe(true);
  });
});

describe("allowsAlert", () => {
  it("os três alertas de prazo respondem à mesma chave", () => {
    const semPrazos: Prefs = { ...TUDO, prazos: false };
    expect(allowsAlert(semPrazos, "atrasada")).toBe(false);
    expect(allowsAlert(semPrazos, "prazo_hoje")).toBe(false);
    expect(allowsAlert(semPrazos, "prazo_proximo")).toBe(false);
    // E não derrubam os outros grupos junto.
    expect(allowsAlert(semPrazos, "contrato_vencendo")).toBe(true);
    expect(allowsAlert(semPrazos, "parcela_vencendo")).toBe(true);
  });
});

describe("filterFeed", () => {
  const feed: FeedItem[] = [
    alerta("atrasada" as never),
    alerta("contrato_vencendo" as never),
    alerta("parcela_vencendo" as never),
    evento("mencao"),
    evento("atribuicao"),
    evento("comentario"),
  ];

  it("com tudo ligado, não tira nada", () => {
    expect(filterFeed(feed, TUDO)).toHaveLength(6);
  });

  it("desligar menção tira só a menção", () => {
    const r = filterFeed(feed, { ...TUDO, mencao: false });
    expect(r).toHaveLength(5);
    expect(r.some((i) => i.nature === "evento" && i.kind === "mencao")).toBe(
      false
    );
    expect(
      r.some((i) => i.nature === "evento" && i.kind === "atribuicao")
    ).toBe(true);
  });

  it("desligar financeiro tira a parcela e deixa o contrato", () => {
    const r = filterFeed(feed, { ...TUDO, financeiro: false });
    expect(r.some((i) => i.id === "a-parcela_vencendo")).toBe(false);
    expect(r.some((i) => i.id === "a-contrato_vencendo")).toBe(true);
  });

  it("com tudo desligado, o sino fica vazio — mas nada foi apagado", () => {
    const nada: Prefs = {
      mencao: false,
      atribuicao: false,
      comentario: false,
      aprovacao: false,
      prazos: false,
      contratos: false,
      financeiro: false,
    };
    expect(filterFeed(feed, nada)).toHaveLength(0);
    // A lista de origem continua inteira: o filtro é de exibição.
    expect(feed).toHaveLength(6);
  });
});
