import { describe, expect, it } from "vitest";

import type { FinanceRecurrence } from "@/types/database";

import {
  missingOccurrences,
  planOccurrences,
  ruleSummary,
  type RecurrenceRule,
} from "./recurrence";

function rule(partial: Partial<FinanceRecurrence>): RecurrenceRule {
  return {
    amount_cents: 150000,
    frequency: "mensal",
    starts_on: "2026-09-05",
    ends_on: null,
    ...partial,
  } as RecurrenceRule;
}

describe("planOccurrences", () => {
  it("mensal gera o horizonte pedido, sempre no mesmo dia", () => {
    const o = planOccurrences(rule({}), 3);
    expect(o.map((x) => x.dueDate)).toEqual([
      "2026-09-05",
      "2026-10-05",
      "2026-11-05",
    ]);
    expect(o.map((x) => x.number)).toEqual([1, 2, 3]);
  });

  it("trimestral e anual respeitam o passo", () => {
    expect(
      planOccurrences(rule({ frequency: "trimestral" }), 3).map((x) => x.dueDate)
    ).toEqual(["2026-09-05", "2026-12-05", "2027-03-05"]);
    expect(
      planOccurrences(rule({ frequency: "anual" }), 2).map((x) => x.dueDate)
    ).toEqual(["2026-09-05", "2027-09-05"]);
  });

  it("dia 31 vira o último dia nos meses curtos", () => {
    // "Todo dia 31" quer dizer "no fim do mês" para quem paga aluguel.
    // Sem isso, fevereiro viraria 3 de março.
    const o = planOccurrences(rule({ starts_on: "2026-12-31" }), 4);
    expect(o.map((x) => x.dueDate)).toEqual([
      "2026-12-31",
      "2027-01-31",
      "2027-02-28",
      "2027-03-31",
    ]);
  });

  it("dia 29 em ano bissexto não se perde", () => {
    const o = planOccurrences(
      rule({ starts_on: "2028-01-29", frequency: "anual" }),
      2
    );
    expect(o.map((x) => x.dueDate)).toEqual(["2028-01-29", "2029-01-29"]);
  });

  it("para no fim quando a regra tem fim", () => {
    const o = planOccurrences(rule({ ends_on: "2026-11-30" }), 12);
    expect(o).toHaveLength(3);
  });

  it("fim antes do início não gera nada", () => {
    expect(planOccurrences(rule({ ends_on: "2026-08-01" }), 12)).toEqual([]);
  });

  it("valor zero ou negativo não gera nada", () => {
    expect(planOccurrences(rule({ amount_cents: 0 }), 12)).toEqual([]);
    expect(planOccurrences(rule({ amount_cents: -100 }), 12)).toEqual([]);
  });

  it("horizonte zero não gera nada", () => {
    expect(planOccurrences(rule({}), 0)).toEqual([]);
  });

  it("todas as ocorrências carregam o valor da regra", () => {
    const o = planOccurrences(rule({ amount_cents: 89900 }), 3);
    expect(o.every((x) => x.amountCents === 89900)).toBe(true);
  });
});

describe("missingOccurrences", () => {
  it("gerar de novo o mesmo horizonte não duplica nada", () => {
    // É a garantia que o §8.9 pede: geração idempotente.
    const planejadas = planOccurrences(rule({}), 3);
    expect(missingOccurrences(planejadas, [1, 2, 3])).toEqual([]);
  });

  it("ampliar o horizonte gera só o que falta", () => {
    const planejadas = planOccurrences(rule({}), 6);
    const faltando = missingOccurrences(planejadas, [1, 2, 3]);
    expect(faltando.map((o) => o.number)).toEqual([4, 5, 6]);
  });

  it("buraco no meio é preenchido — apagar a ocorrência 2 a traz de volta", () => {
    const planejadas = planOccurrences(rule({}), 4);
    expect(missingOccurrences(planejadas, [1, 3, 4]).map((o) => o.number)).toEqual(
      [2]
    );
  });

  it("sem nada gerado, tudo falta", () => {
    const planejadas = planOccurrences(rule({}), 3);
    expect(missingOccurrences(planejadas, [])).toHaveLength(3);
  });
});

describe("ruleSummary", () => {
  const dinheiro = (c: number) =>
    `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;

  it("descreve a regra sem fim", () => {
    expect(ruleSummary({ ...rule({}), description: "Aluguel" }, dinheiro)).toBe(
      "R$ 1500,00 · mensal, a partir de 05/09/2026"
    );
  });

  it("inclui o fim quando existe", () => {
    expect(
      ruleSummary(
        { ...rule({ ends_on: "2027-09-05" }), description: "Aluguel" },
        dinheiro
      )
    ).toContain("até 05/09/2027");
  });
});
