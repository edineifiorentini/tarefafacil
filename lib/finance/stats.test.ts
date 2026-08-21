import { describe, expect, it } from "vitest";

import type { FinanceEntry } from "@/types/database";

import { localDayISO } from "@/lib/dates/day";

import {
  computeFinanceStats,
  daysOverdue,
  isOverdue,
  overdueBreakdown,
} from "./stats";

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

describe("vencidos", () => {
  // 20h no fuso de Brasília (23h em UTC) — a janela em que o cálculo em UTC
  // já achava que era o dia seguinte.
  const noite = new Date("2026-08-21T23:00:00Z");

  it("conta que vence hoje não está vencida, nem às 20h", () => {
    const hoje = localDayISO(noite);
    expect(isOverdue(entry({ due_date: hoje }), noite)).toBe(false);
  });

  it("conta de ontem está vencida", () => {
    expect(isOverdue(entry({ due_date: "2026-08-01" }), noite)).toBe(true);
  });

  it("confirmada nunca é vencida", () => {
    const paga = entry({ due_date: "2026-01-01", status: "confirmado" });
    expect(isOverdue(paga, noite)).toBe(false);
  });

  it("separa receber de pagar e soma cada lado", () => {
    const r = overdueBreakdown(
      [
        entry({ id: "a", due_date: "2026-08-01", amount_cents: 100000 }),
        entry({ id: "b", due_date: "2026-07-01", amount_cents: 50000 }),
        entry({
          id: "c",
          due_date: "2026-08-05",
          kind: "saida",
          amount_cents: 30000,
        }),
        entry({ id: "d", due_date: "2026-12-01", amount_cents: 999 }),
      ],
      noite
    );
    expect(r.aReceber.cents).toBe(150000);
    expect(r.aPagar.cents).toBe(30000);
    // Mais antiga primeiro: é a que dói.
    expect(r.aReceber.entries.map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("não recorta por mês — conta velha continua vencida", () => {
    const r = overdueBreakdown(
      [entry({ id: "x", due_date: "2026-03-10" })],
      noite
    );
    expect(r.aReceber.entries).toHaveLength(1);
  });

  it("conta os dias de atraso a partir de um", () => {
    expect(daysOverdue(entry({ due_date: "2026-08-20" }), noite)).toBe(1);
    expect(daysOverdue(entry({ due_date: "2026-08-11" }), noite)).toBe(10);
    expect(daysOverdue(entry({ due_date: "2026-09-01" }), noite)).toBe(0);
  });
});
