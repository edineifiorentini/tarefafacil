import { describe, expect, it } from "vitest";

import { daysLeft, trialLabel } from "@/components/billing/TrialBanner";

describe("contagem do teste", () => {
  const agora = new Date("2026-08-21T12:00:00Z");

  it("conta dias inteiros que faltam", () => {
    expect(daysLeft("2026-08-28T12:00:00Z", agora)).toBe(7);
    expect(daysLeft("2026-08-22T12:00:00Z", agora)).toBe(1);
  });

  it("arredonda para cima: sobrando algumas horas, ainda é um dia", () => {
    expect(daysLeft("2026-08-21T20:00:00Z", agora)).toBe(1);
  });

  it("vira zero ou negativo depois do fim", () => {
    expect(daysLeft("2026-08-21T11:00:00Z", agora)).toBe(0);
    expect(daysLeft("2026-08-19T12:00:00Z", agora)).toBe(-2);
  });
});

describe("frase do teste", () => {
  it("fala no plural enquanto sobra tempo", () => {
    expect(trialLabel(7)).toBe("Teste grátis — faltam 7 dias");
  });

  it("chama o último dia de último dia, não de '1 dias'", () => {
    expect(trialLabel(1)).toBe("Teste grátis — último dia");
  });

  it("não promete tempo que acabou", () => {
    expect(trialLabel(0)).toBe("Seu teste terminou");
    expect(trialLabel(-3)).toBe("Seu teste terminou");
  });
});
