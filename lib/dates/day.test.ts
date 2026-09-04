import { describe, expect, it } from "vitest";

import { localDayISO, localDayOf, localMonthOf,
  diaCivilDeEm,
  diaCivilEm,
  mesCivilDeEm,
} from "./day";

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

// ------------------------------------------- fuso escrito (4/set/2026)
describe("dia civil com o fuso escrito", () => {
  it("22h no Brasil ainda é o mesmo dia, mesmo com o processo em UTC", () => {
    // 2026-09-04 22:00 BRT === 2026-09-05 01:00 UTC. É a janela em que o
    // ambiente respondia errado: das 21h à meia-noite, UTC já virou o dia.
    const instante = new Date("2026-09-05T01:00:00Z");
    expect(diaCivilEm(instante, "America/Sao_Paulo")).toBe("2026-09-04");
    expect(diaCivilEm(instante, "UTC")).toBe("2026-09-05");
  });

  it("os quatro fusos do Brasil dão respostas diferentes, e é o ponto", () => {
    // 2026-09-05 02:30 UTC: dia 4 em quase todo o Brasil, dia 5 em Noronha.
    const instante = new Date("2026-09-05T02:30:00Z");
    expect(diaCivilEm(instante, "America/Noronha")).toBe("2026-09-05");
    expect(diaCivilEm(instante, "America/Sao_Paulo")).toBe("2026-09-04");
    expect(diaCivilEm(instante, "America/Manaus")).toBe("2026-09-04");
    expect(diaCivilEm(instante, "America/Rio_Branco")).toBe("2026-09-04");
  });

  it("não depende do fuso do processo", () => {
    // O mesmo instante e o mesmo fuso pedido têm que dar o mesmo resultado
    // rodando na minha máquina ou na Vercel. É a garantia inteira.
    const instante = new Date("2026-01-15T23:45:00Z");
    expect(diaCivilEm(instante, "America/Sao_Paulo")).toBe("2026-01-15");
  });

  it("respeita horário de verão de quem tem", () => {
    // Nova York em janeiro (-05:00) e em julho (-04:00). Subtrair um número
    // fixo erraria num dos dois; o Intl não.
    expect(diaCivilEm(new Date("2026-01-15T04:30:00Z"), "America/New_York")).toBe("2026-01-14");
    expect(diaCivilEm(new Date("2026-07-15T03:30:00Z"), "America/New_York")).toBe("2026-07-14");
  });

  it("mês civil vira junto com o dia", () => {
    // 1º de outubro 01:00 UTC ainda é 30 de setembro no Brasil — o caso que
    // fazia uma entrega cair no mês seguinte do relatório.
    expect(mesCivilDeEm("2026-10-01T01:00:00Z", "America/Sao_Paulo")).toBe("2026-09");
    expect(diaCivilDeEm("2026-10-01T01:00:00Z", "America/Sao_Paulo")).toBe("2026-09-30");
  });
});
