import { describe, expect, it } from "vitest";

import { localDayISO, localDayOf, localMonthOf } from "./day";

/**
 * Os testes constroem as datas por componentes LOCAIS (`new Date(ano, mês,
 * dia, hora)`), então valem em qualquer fuso onde o CI rodar — é exatamente
 * a propriedade que o código precisa ter.
 */
describe("localDayISO", () => {
  it("formata o dia local", () => {
    expect(localDayISO(new Date(2026, 7, 18, 12, 0))).toBe("2026-08-18");
  });

  it("22h ainda é o mesmo dia — não vira amanhã", () => {
    // Com toISOString() num fuso atrás de UTC, isto devolvia "2026-08-19".
    expect(localDayISO(new Date(2026, 7, 18, 22, 0))).toBe("2026-08-18");
  });

  it("01h da manhã não volta para ontem", () => {
    // E num fuso à frente de UTC, o erro simétrico.
    expect(localDayISO(new Date(2026, 7, 18, 1, 0))).toBe("2026-08-18");
  });
});

describe("localDayOf", () => {
  it("preserva o dia local ao passar por carimbo de tempo", () => {
    const tarde = new Date(2026, 7, 18, 22, 30);
    expect(localDayOf(tarde.toISOString())).toBe("2026-08-18");
  });

  it("meia-noite e um minuto pertence ao dia que começou", () => {
    const virada = new Date(2026, 7, 19, 0, 1);
    expect(localDayOf(virada.toISOString())).toBe("2026-08-19");
  });
});

describe("localMonthOf", () => {
  it("último dia do mês à noite não vaza para o mês seguinte", () => {
    // Era o pior caso: entrega do dia 31 contada em setembro.
    const fimDoMes = new Date(2026, 7, 31, 22, 0);
    expect(localMonthOf(fimDoMes.toISOString())).toBe("2026-08");
  });

  it("primeiro dia do mês de manhã não volta para o mês anterior", () => {
    const inicio = new Date(2026, 8, 1, 1, 0);
    expect(localMonthOf(inicio.toISOString())).toBe("2026-09");
  });
});
