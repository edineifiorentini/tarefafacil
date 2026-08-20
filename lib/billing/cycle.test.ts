import { describe, expect, it } from "vitest";

import {
  GRACE_DAYS,
  accessUntil,
  cycleFor,
  cycleLabel,
  decideCharge,
  deriveStatus,
  nextCycle,
} from "./cycle";

/**
 * Datas construídas por componentes locais: os testes valem em qualquer
 * fuso, que é a propriedade que este módulo precisa ter.
 */
describe("cycleFor", () => {
  it("depois do dia de cobrança, o ciclo começou neste mês", () => {
    const c = cycleFor(new Date(2026, 8, 20), 5); // 20/set, cobra dia 5
    expect(c).toEqual({ start: "2026-09-05", end: "2026-10-05" });
  });

  it("antes do dia de cobrança, o ciclo começou no mês passado", () => {
    const c = cycleFor(new Date(2026, 8, 2), 5); // 02/set
    expect(c).toEqual({ start: "2026-08-05", end: "2026-09-05" });
  });

  it("no próprio dia de cobrança, o ciclo novo já começou", () => {
    const c = cycleFor(new Date(2026, 8, 5), 5);
    expect(c.start).toBe("2026-09-05");
  });

  it("vira o ano sem se perder", () => {
    const c = cycleFor(new Date(2027, 0, 3), 10); // 03/jan, cobra dia 10
    expect(c).toEqual({ start: "2026-12-10", end: "2027-01-10" });
  });

  it("dia 28 atravessa fevereiro sem andar", () => {
    // É por isso que o banco limita billing_day a 28: com 31 o ciclo mudaria
    // de data sozinho todo fevereiro.
    const c = cycleFor(new Date(2027, 1, 28), 28);
    expect(c).toEqual({ start: "2027-02-28", end: "2027-03-28" });
  });
});

describe("nextCycle", () => {
  it("o próximo começa onde o atual termina — sem buraco nem sobreposição", () => {
    const atual = { start: "2026-09-05", end: "2026-10-05" };
    expect(nextCycle(atual)).toEqual({
      start: "2026-10-05",
      end: "2026-11-05",
    });
  });
});

describe("accessUntil", () => {
  it("o acesso vai até o fim do período mais a carência", () => {
    const ate = accessUntil({ start: "2026-09-05", end: "2026-10-05" });
    expect(ate).toBe("2026-10-10");
    expect(GRACE_DAYS).toBe(5);
  });
});

describe("decideCharge", () => {
  const base = {
    planCode: "pro",
    priceCents: 9900,
    status: "ativa" as const,
    billingDay: 5,
    chargedPeriods: [] as string[],
    now: new Date(2026, 8, 20),
  };

  it("cobra o ciclo corrente quando ainda não foi cobrado", () => {
    const d = decideCharge(base);
    expect(d).toEqual({
      charge: true,
      cycle: { start: "2026-09-05", end: "2026-10-05" },
      amountCents: 9900,
    });
  });

  it("não cobra o mesmo ciclo duas vezes", () => {
    // Rodar o cron duas vezes no mesmo dia não pode gerar duas faturas.
    const d = decideCharge({ ...base, chargedPeriods: ["2026-09-05"] });
    expect(d).toEqual({ charge: false, reason: "já cobrado" });
  });

  it("cobrança de um ciclo antigo não impede a do ciclo novo", () => {
    const d = decideCharge({ ...base, chargedPeriods: ["2026-08-05"] });
    expect(d.charge).toBe(true);
  });

  it("plano gratuito não gera fatura de zero real", () => {
    const d = decideCharge({ ...base, priceCents: 0 });
    expect(d).toEqual({ charge: false, reason: "plano gratuito" });
  });

  it("assinatura cancelada não é cobrada", () => {
    const d = decideCharge({ ...base, status: "cancelada" });
    expect(d).toEqual({ charge: false, reason: "cancelada" });
  });
});

describe("deriveStatus", () => {
  const agora = new Date(2026, 8, 20);

  it("acesso no futuro e sem fatura aberta é ativa", () => {
    expect(
      deriveStatus({
        cancelled: false,
        latestCharge: { status: "paga", periodEnd: "2026-10-05" },
        accessExpiresAt: "2026-10-10",
        now: agora,
      })
    ).toBe("ativa");
  });

  it("acesso no futuro com fatura aberta é pendente, não vencida", () => {
    // Quem já pagou o mês corrente e recebeu a fatura do próximo não pode
    // aparecer como inadimplente.
    expect(
      deriveStatus({
        cancelled: false,
        latestCharge: { status: "aberta", periodEnd: "2026-11-05" },
        accessExpiresAt: "2026-10-10",
        now: agora,
      })
    ).toBe("pendente");
  });

  it("acesso no passado é vencida", () => {
    expect(
      deriveStatus({
        cancelled: false,
        latestCharge: { status: "aberta", periodEnd: "2026-09-05" },
        accessExpiresAt: "2026-09-10",
        now: agora,
      })
    ).toBe("vencida");
  });

  it("sem data de acesso não é inadimplência", () => {
    // Assinatura que nunca foi cobrada, ou plano livre: nada devido.
    expect(
      deriveStatus({
        cancelled: false,
        latestCharge: null,
        accessExpiresAt: null,
        now: agora,
      })
    ).toBe("ativa");
  });

  it("cancelada vence qualquer outra leitura", () => {
    expect(
      deriveStatus({
        cancelled: true,
        latestCharge: { status: "paga", periodEnd: "2026-10-05" },
        accessExpiresAt: "2026-12-31",
        now: agora,
      })
    ).toBe("cancelada");
  });

  it("no dia exato do vencimento ainda vale — corte é depois, não em cima", () => {
    expect(
      deriveStatus({
        cancelled: false,
        latestCharge: null,
        accessExpiresAt: "2026-09-21",
        now: agora,
      })
    ).toBe("ativa");
  });
});

describe("cycleLabel", () => {
  it("descreve o período de forma curta", () => {
    expect(cycleLabel({ start: "2026-09-05", end: "2026-10-05" })).toBe(
      "05/09 a 05/10"
    );
  });
});
