import { describe, expect, it } from "vitest";

import { planInstallments } from "./installments";

describe("planInstallments", () => {
  it("pagamento único gera uma parcela na data de início", () => {
    const plan = planInstallments({
      amount_cents: 500000,
      starts_on: "2026-09-01",
      ends_on: null,
      billing_period: "unico",
    });
    expect(plan).toEqual([{ number: 1, dueDate: "2026-09-01", amountCents: 500000 }]);
  });

  it("mensal gera uma parcela por mês até o fim da vigência (inclusive)", () => {
    const plan = planInstallments({
      amount_cents: 100000,
      starts_on: "2026-09-01",
      ends_on: "2026-11-01",
      billing_period: "mensal",
    });
    expect(plan.map((p) => p.dueDate)).toEqual(["2026-09-01", "2026-10-01", "2026-11-01"]);
    expect(plan.every((p) => p.amountCents === 100000)).toBe(true);
    expect(plan.map((p) => p.number)).toEqual([1, 2, 3]);
  });

  it("trimestral avança de 3 em 3 meses", () => {
    const plan = planInstallments({
      amount_cents: 300000,
      starts_on: "2026-01-01",
      ends_on: "2026-12-31",
      billing_period: "trimestral",
    });
    expect(plan.map((p) => p.dueDate)).toEqual([
      "2026-01-01",
      "2026-04-01",
      "2026-07-01",
      "2026-10-01",
    ]);
  });

  it("sem fim de vigência, limita ao máximo de ocorrências informado", () => {
    const plan = planInstallments(
      { amount_cents: 100000, starts_on: "2026-01-01", ends_on: null, billing_period: "mensal" },
      3
    );
    expect(plan).toHaveLength(3);
  });

  it("sem valor ou sem início de vigência, não gera nada", () => {
    expect(
      planInstallments({ amount_cents: null, starts_on: "2026-01-01", ends_on: null, billing_period: "mensal" })
    ).toEqual([]);
    expect(
      planInstallments({ amount_cents: 1000, starts_on: null, ends_on: null, billing_period: "mensal" })
    ).toEqual([]);
  });
});
