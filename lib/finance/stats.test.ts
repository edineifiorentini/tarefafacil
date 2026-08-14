import { describe, expect, it } from "vitest";

import type { FinanceEntry } from "@/types/database";

import { computeFinanceStats, isOverdue } from "./stats";

const NOW = new Date("2026-08-14T12:00:00Z");

function entry(partial: Partial<FinanceEntry>): FinanceEntry {
  return {
    id: crypto.randomUUID(),
    workspace_id: "ws",
    kind: "entrada",
    description: "Lançamento",
    amount_cents: 10000,
    status: "previsto",
    due_date: "2026-08-10",
    confirmed_at: null,
    category: null,
    client_id: null,
    notes: null,
    created_by: null,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...partial,
  } as FinanceEntry;
}

describe("computeFinanceStats", () => {
  it("soma centavos com precisão exata (sem erro de ponto flutuante)", () => {
    const entries = [
      entry({
        kind: "entrada",
        status: "confirmado",
        confirmed_at: "2026-08-01",
        amount_cents: 10,
      }),
      entry({
        kind: "entrada",
        status: "confirmado",
        confirmed_at: "2026-08-02",
        amount_cents: 20,
      }),
      entry({
        kind: "entrada",
        status: "confirmado",
        confirmed_at: "2026-08-03",
        amount_cents: 33,
      }),
    ];
    const s = computeFinanceStats(entries, "2026-08");
    expect(s.recebido).toBe(63);
  });

  it("recebido/despesas só contam confirmadas NO mês pedido", () => {
    const entries = [
      entry({
        kind: "entrada",
        status: "confirmado",
        confirmed_at: "2026-08-05",
        amount_cents: 5000,
      }),
      entry({
        kind: "entrada",
        status: "confirmado",
        confirmed_at: "2026-07-31",
        amount_cents: 9999,
      }), // mês anterior
      entry({
        kind: "saida",
        status: "confirmado",
        confirmed_at: "2026-08-06",
        amount_cents: 1500,
      }),
      entry({
        kind: "entrada",
        status: "previsto",
        due_date: "2026-08-20",
        amount_cents: 7000,
      }), // ainda não confirmada
    ];
    const s = computeFinanceStats(entries, "2026-08");
    expect(s.recebido).toBe(5000);
    expect(s.despesas).toBe(1500);
    expect(s.lucro).toBe(3500);
  });

  it("cancelada nunca entra em nenhum total", () => {
    const entries = [
      entry({
        status: "cancelado",
        amount_cents: 999999,
        confirmed_at: "2026-08-01",
      }),
    ];
    const s = computeFinanceStats(entries, "2026-08");
    expect(s).toEqual({
      recebido: 0,
      despesas: 0,
      lucro: 0,
      aReceber: 0,
      aPagar: 0,
    });
  });

  it("a receber/a pagar somam TODAS previstas, sem recorte de mês (inclui vencidas)", () => {
    const entries = [
      entry({
        kind: "entrada",
        status: "previsto",
        due_date: "2026-06-01",
        amount_cents: 1000,
      }), // vencida, mês antigo
      entry({
        kind: "entrada",
        status: "previsto",
        due_date: "2026-09-01",
        amount_cents: 2000,
      }), // futura
      entry({
        kind: "saida",
        status: "previsto",
        due_date: "2026-08-30",
        amount_cents: 500,
      }),
    ];
    const s = computeFinanceStats(entries, "2026-08");
    expect(s.aReceber).toBe(3000);
    expect(s.aPagar).toBe(500);
  });
});

describe("isOverdue", () => {
  it("só é vencida quando prevista e a data já passou", () => {
    expect(
      isOverdue(entry({ status: "previsto", due_date: "2026-08-01" }), NOW)
    ).toBe(true);
    expect(
      isOverdue(entry({ status: "previsto", due_date: "2026-09-01" }), NOW)
    ).toBe(false);
    expect(
      isOverdue(
        entry({
          status: "confirmado",
          due_date: "2026-08-01",
          confirmed_at: "2026-08-01",
        }),
        NOW
      )
    ).toBe(false);
  });
});
