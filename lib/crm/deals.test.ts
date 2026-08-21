import { describe, expect, it } from "vitest";

import type { Deal, DealStageKind, PipelineStage } from "@/types/database";

import {
  dealsByStage,
  openTotalCents,
  outcomeFor,
  stageTotals,
  winRate,
} from "./deals";

function etapa(id: string, kind: DealStageKind, position = 0): PipelineStage {
  return {
    id,
    workspace_id: "w1",
    name: id,
    position,
    kind,
    created_at: "2026-08-21T10:00:00Z",
  };
}

function negociacao(
  over: Partial<Deal> & { id: string; stage_id: string }
): Deal {
  return {
    workspace_id: "w1",
    client_id: "c1",
    title: "Negociação",
    amount_cents: null,
    position: 0,
    responsible_id: null,
    expected_close_on: null,
    won_at: null,
    lost_at: null,
    lost_reason: null,
    notes: null,
    created_at: "2026-08-21T10:00:00Z",
    updated_at: "2026-08-21T10:00:00Z",
    ...over,
  };
}

const ABERTA = etapa("aberta1", "aberta", 0);
const GANHO = etapa("ganho1", "ganho", 1);
const PERDIDO = etapa("perdido1", "perdido", 2);

describe("stageTotals", () => {
  it("soma valor e conta cards por etapa", () => {
    const t = stageTotals([
      negociacao({ id: "d1", stage_id: "aberta1", amount_cents: 150000 }),
      negociacao({ id: "d2", stage_id: "aberta1", amount_cents: 50000 }),
      negociacao({ id: "d3", stage_id: "ganho1", amount_cents: 900000 }),
    ]);
    expect(t.get("aberta1")).toEqual({ count: 2, cents: 200000 });
    expect(t.get("ganho1")).toEqual({ count: 1, cents: 900000 });
  });

  it("negociação sem preço conta como card, não como zero na soma", () => {
    const t = stageTotals([
      negociacao({ id: "d1", stage_id: "aberta1", amount_cents: null }),
      negociacao({ id: "d2", stage_id: "aberta1", amount_cents: 10000 }),
    ]);
    expect(t.get("aberta1")).toEqual({ count: 2, cents: 10000 });
  });
});

describe("openTotalCents", () => {
  it("soma só o que ainda está em jogo", () => {
    const deals = [
      negociacao({ id: "d1", stage_id: "aberta1", amount_cents: 100000 }),
      negociacao({ id: "d2", stage_id: "ganho1", amount_cents: 900000 }),
      negociacao({ id: "d3", stage_id: "perdido1", amount_cents: 700000 }),
    ];
    // Ganho e perdido de fora: senão o número vira histórico que só sobe.
    expect(openTotalCents(deals, [ABERTA, GANHO, PERDIDO])).toBe(100000);
  });

  it("devolve zero sem negociação em aberto", () => {
    expect(openTotalCents([], [ABERTA, GANHO, PERDIDO])).toBe(0);
  });
});

describe("dealsByStage", () => {
  it("agrupa e ordena pela posição", () => {
    const mapa = dealsByStage([
      negociacao({ id: "b", stage_id: "aberta1", position: 2 }),
      negociacao({ id: "a", stage_id: "aberta1", position: 1 }),
      negociacao({ id: "c", stage_id: "ganho1", position: 1 }),
    ]);
    expect(mapa.get("aberta1")?.map((d) => d.id)).toEqual(["a", "b"]);
    expect(mapa.get("ganho1")?.map((d) => d.id)).toEqual(["c"]);
  });
});

describe("outcomeFor", () => {
  it("marca ganho na etapa de ganho", () => {
    const r = outcomeFor(GANHO);
    expect(r.won_at).not.toBeNull();
    expect(r.lost_at).toBeNull();
  });

  it("marca perda na etapa de perda", () => {
    const r = outcomeFor(PERDIDO);
    expect(r.lost_at).not.toBeNull();
    expect(r.won_at).toBeNull();
  });

  it("voltar para etapa aberta desfaz o desfecho", () => {
    // Negociação que volta para "Em negociação" e continua marcada como
    // ganha mentiria no total.
    expect(outcomeFor(ABERTA)).toEqual({ won_at: null, lost_at: null });
  });

  it("etapa desconhecida não inventa desfecho", () => {
    expect(outcomeFor(undefined)).toEqual({ won_at: null, lost_at: null });
  });
});

describe("winRate", () => {
  it("conta só o que já foi decidido", () => {
    const deals = [
      negociacao({
        id: "d1",
        stage_id: "ganho1",
        won_at: "2026-08-01T00:00:00Z",
      }),
      negociacao({
        id: "d2",
        stage_id: "ganho1",
        won_at: "2026-08-02T00:00:00Z",
      }),
      negociacao({
        id: "d3",
        stage_id: "perdido1",
        lost_at: "2026-08-03T00:00:00Z",
      }),
      negociacao({ id: "d4", stage_id: "aberta1" }),
    ];
    expect(winRate(deals)).toBe(67);
  });

  it("devolve null quando nada foi decidido ainda", () => {
    expect(winRate([negociacao({ id: "d1", stage_id: "aberta1" })])).toBeNull();
  });
});
