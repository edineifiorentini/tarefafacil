import { describe, expect, it } from "vitest";

import {
  reprogramacoesDoPeriodo,
  type LinhaDeReprogramacao,
} from "./reprogramacoes";

/**
 * O cartão responde "por que os prazos mudaram". Cada caso aqui é uma forma
 * de ele responder errado: contar demanda que o filtro tirou da tela, errar
 * o mês na virada do fuso, ou inventar motivo para mudança antiga.
 */

const SETEMBRO = { de: "2026-09-01", ate: "2026-09-30" };
const SAO_PAULO = "America/Sao_Paulo";

function linha(p: Partial<LinhaDeReprogramacao>): LinhaDeReprogramacao {
  return {
    task_id: "t1",
    motivo: "aguardando_cliente",
    created_at: "2026-09-10T10:00:00-03:00",
    ...p,
  };
}

describe("reprogramacoesDoPeriodo", () => {
  it("soma por motivo, do mais frequente ao menos", () => {
    const r = reprogramacoesDoPeriodo(
      [
        linha({ motivo: "cliente_pediu_mudanca" }),
        linha({ task_id: "t2" }),
        linha({ task_id: "t2", created_at: "2026-09-20T10:00:00-03:00" }),
      ],
      new Set(["t1", "t2"]),
      SETEMBRO,
      SAO_PAULO
    );
    expect(r.total).toBe(3);
    expect(r.demandas).toBe(2);
    expect(r.porMotivo).toEqual([
      { motivo: "aguardando_cliente", total: 2 },
      { motivo: "cliente_pediu_mudanca", total: 1 },
    ]);
  });

  it("empate segue a ordem do catálogo, e não a de chegada", () => {
    const r = reprogramacoesDoPeriodo(
      [linha({ motivo: "outro" }), linha({ motivo: "cliente_pediu_mudanca" })],
      new Set(["t1"]),
      SETEMBRO,
      SAO_PAULO
    );
    expect(r.porMotivo.map((m) => m.motivo)).toEqual([
      "cliente_pediu_mudanca",
      "outro",
    ]);
  });

  it("o período é o dia de quem lê: 22h do dia 30 em São Paulo ainda é setembro", () => {
    const tarde = [linha({ created_at: "2026-10-01T01:00:00Z" })];
    expect(
      reprogramacoesDoPeriodo(tarde, new Set(["t1"]), SETEMBRO, SAO_PAULO).total
    ).toBe(1);
    expect(
      reprogramacoesDoPeriodo(tarde, new Set(["t1"]), SETEMBRO, "UTC").total
    ).toBe(0);
  });

  it("demanda fora do filtro não conta", () => {
    const r = reprogramacoesDoPeriodo(
      [linha({ task_id: "de-outro-setor" })],
      new Set(["t1"]),
      SETEMBRO,
      SAO_PAULO
    );
    expect(r.total).toBe(0);
    expect(r.porMotivo).toEqual([]);
  });

  it("mudança sem motivo (anterior à 0099) ou com motivo desconhecido fica de fora", () => {
    const r = reprogramacoesDoPeriodo(
      [linha({ motivo: null }), linha({ motivo: "orkut" })],
      new Set(["t1"]),
      SETEMBRO,
      SAO_PAULO
    );
    expect(r.total).toBe(0);
  });
});
