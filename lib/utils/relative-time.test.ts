import { describe, expect, it } from "vitest";

import { tempoRelativo } from "./relative-time";

const AGORA = new Date("2026-08-27T12:00:00Z").getTime();
const min = 60_000;
const hora = 60 * min;
const dia = 24 * hora;

describe("tempoRelativo", () => {
  it("sem data diz Nunca", () => {
    expect(tempoRelativo(null, AGORA)).toBe("Nunca");
  });

  it("data inválida também diz Nunca, em vez de NaN", () => {
    expect(tempoRelativo("não é data", AGORA)).toBe("Nunca");
  });

  it("menos de um minuto é Agora", () => {
    expect(tempoRelativo(new Date(AGORA - 30_000).toISOString(), AGORA)).toBe(
      "Agora"
    );
  });

  it("minutos, horas e dias", () => {
    expect(tempoRelativo(new Date(AGORA - 5 * min).toISOString(), AGORA)).toBe(
      "Há 5 min"
    );
    expect(tempoRelativo(new Date(AGORA - 3 * hora).toISOString(), AGORA)).toBe(
      "Há 3 h"
    );
    expect(tempoRelativo(new Date(AGORA - 12 * dia).toISOString(), AGORA)).toBe(
      "Há 12 dias"
    );
  });

  it("um dia é Ontem, não Há 1 dias", () => {
    expect(tempoRelativo(new Date(AGORA - dia).toISOString(), AGORA)).toBe(
      "Ontem"
    );
  });

  it("singular e plural de mês e ano", () => {
    expect(tempoRelativo(new Date(AGORA - 35 * dia).toISOString(), AGORA)).toBe(
      "Há 1 mês"
    );
    expect(tempoRelativo(new Date(AGORA - 70 * dia).toISOString(), AGORA)).toBe(
      "Há 2 meses"
    );
    expect(
      tempoRelativo(new Date(AGORA - 400 * dia).toISOString(), AGORA)
    ).toBe("Há 1 ano");
  });

  it("data no futuro vira Agora, e não 'em 3 horas'", () => {
    // Relógio adiantado do cliente não pode fazer a tabela inteira parecer
    // errada: o passado é a única direção que faz sentido aqui.
    expect(tempoRelativo(new Date(AGORA + 3 * hora).toISOString(), AGORA)).toBe(
      "Agora"
    );
  });
});
