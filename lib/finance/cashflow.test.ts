import { describe, expect, it } from "vitest";

import type { FinanceEntry } from "@/types/database";

import { buildCashFlowSeries, periodBalance } from "./cashflow";

function entry(partial: Partial<FinanceEntry>): FinanceEntry {
  return {
    id: crypto.randomUUID(),
    workspace_id: "ws",
    kind: "entrada",
    description: "e",
    amount_cents: 1000,
    status: "previsto",
    due_date: "2026-08-10",
    confirmed_at: null,
    category: null,
    client_id: null,
    notes: null,
    source_type: null,
    source_id: null,
    installment_number: null,
    needs_invoice: false,
    invoice_number: null,
    invoice_issued_at: null,
    invoice_file_url: null,
    created_by: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...partial,
  } as FinanceEntry;
}

describe("buildCashFlowSeries", () => {
  it("gera N meses terminando no mês pedido, mais antigo primeiro", () => {
    const series = buildCashFlowSeries([], "2026-08", 3, "realizado");
    expect(series.map((p) => p.month)).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
  });

  it("realizado só soma confirmadas, pela data de confirmação", () => {
    const entries = [
      entry({
        kind: "entrada",
        status: "confirmado",
        confirmed_at: "2026-08-05",
        amount_cents: 5000,
      }),
      entry({
        kind: "saida",
        status: "confirmado",
        confirmed_at: "2026-08-06",
        amount_cents: 2000,
      }),
      entry({
        kind: "entrada",
        status: "previsto",
        due_date: "2026-08-10",
        amount_cents: 9999,
      }), // não conta
    ];
    const series = buildCashFlowSeries(entries, "2026-08", 1, "realizado");
    expect(series[0]).toMatchObject({
      recebido: 5000,
      despesas: 2000,
      saldo: 3000,
    });
  });

  it("previsto só soma previstas, pela data de vencimento", () => {
    const entries = [
      entry({
        kind: "entrada",
        status: "previsto",
        due_date: "2026-09-15",
        amount_cents: 4000,
      }),
      entry({
        kind: "entrada",
        status: "confirmado",
        confirmed_at: "2026-09-01",
        amount_cents: 9999,
      }), // não conta
    ];
    const series = buildCashFlowSeries(entries, "2026-09", 1, "previsto");
    expect(series[0]).toMatchObject({ recebido: 4000, despesas: 0 });
  });

  it("cancelada nunca entra em nenhum modo", () => {
    const entries = [
      entry({
        status: "cancelado",
        confirmed_at: "2026-08-01",
        amount_cents: 999999,
      }),
    ];
    const realizado = buildCashFlowSeries(entries, "2026-08", 1, "realizado");
    const previsto = buildCashFlowSeries(entries, "2026-08", 1, "previsto");
    expect(realizado[0].recebido).toBe(0);
    expect(previsto[0].recebido).toBe(0);
  });
});

describe("periodBalance", () => {
  it("soma o saldo líquido de todos os meses da janela", () => {
    const points = buildCashFlowSeries(
      [
        entry({
          kind: "entrada",
          status: "confirmado",
          confirmed_at: "2026-07-01",
          amount_cents: 1000,
        }),
        entry({
          kind: "entrada",
          status: "confirmado",
          confirmed_at: "2026-08-01",
          amount_cents: 2000,
        }),
        entry({
          kind: "saida",
          status: "confirmado",
          confirmed_at: "2026-08-02",
          amount_cents: 500,
        }),
      ],
      "2026-08",
      2,
      "realizado"
    );
    expect(periodBalance(points)).toBe(2500); // 1000 + (2000-500)
  });
});
