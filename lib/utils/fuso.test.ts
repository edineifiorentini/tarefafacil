import { describe, expect, it } from "vitest";

import {
  dataDeInstanteBR,
  dataHoraBR,
  dataLongaDeInstanteBR,
  dataLongaPuraBR,
  dataPuraBR,
} from "./fuso";

/**
 * Estes testes existem por um defeito que passou por typecheck, lint, 825
 * testes e o build, e só apareceu quando comparei a mesma página rodando na
 * minha máquina e em produção: a hora saía três horas adiantada para o
 * cliente, porque o servidor da Vercel roda em UTC e o formatador antigo
 * usava o fuso do ambiente.
 *
 * Por isso cada caso aqui fixa o resultado ESPERADO NO BRASIL a partir de
 * um instante UTC conhecido. Se alguém voltar a usar `getHours()`, quebra.
 */

describe("hora do cliente, não hora do servidor", () => {
  it("converte de UTC para o horário de Brasília", () => {
    // 13:13 UTC é 10:13 em São Paulo. Era exatamente o caso que saiu errado.
    expect(dataHoraBR("2026-09-04T13:13:59.966039+00:00")).toBe(
      "04/09/2026 às 10:13"
    );
  });

  it("vira o dia para trás quando o instante é de madrugada em UTC", () => {
    // 01:30 UTC do dia 5 ainda é 22:30 do dia 4 no Brasil.
    expect(dataHoraBR("2026-09-05T01:30:00Z")).toBe("04/09/2026 às 22:30");
  });

  it("meia-noite UTC não vira o dia seguinte por engano", () => {
    expect(dataHoraBR("2026-09-04T00:00:00Z")).toBe("03/09/2026 às 21:00");
  });
});

describe("data de um instante", () => {
  it("usa o dia do Brasil, não o do UTC", () => {
    // Uma decisão registrada às 22h de Brasília é 1h do dia seguinte em UTC.
    // Cortar a string do ISO mostraria 05/09 — o dia errado.
    expect(dataDeInstanteBR("2026-09-05T01:00:00Z")).toBe("04/09/2026");
  });
});

describe("data pura (coluna date)", () => {
  it("não passa por Date, para não perder um dia", () => {
    // `new Date("2026-09-04")` é meia-noite UTC, que no Brasil é dia 3.
    // Prazo mostrado um dia antes é o erro que ninguém perdoa.
    expect(dataPuraBR("2026-09-04")).toBe("04/09/2026");
  });

  it("aceita a data com hora colada sem se confundir", () => {
    expect(dataPuraBR("2026-12-31")).toBe("31/12/2026");
  });
});

describe("data civil por extenso não anda para trás", () => {
  /**
   * O defeito, visto na tela em 9/set/2026 com o MESMO dado escrito de dois
   * jeitos ao mesmo tempo:
   *
   *     resumo da assinatura   "13 de outubro de 2026"
   *     card do pagamento      "14/10/2026"
   *
   * `access_expires_at` é `timestamptz`, mas o que o `settle.ts` grava lá é
   * o texto de uma data civil. O Postgres guarda meia-noite UTC, e
   * `new Date(...).toLocaleDateString()` num navegador brasileiro devolve
   * 21h do dia anterior.
   */
  it("meia-noite UTC continua sendo o mesmo dia", () => {
    expect(dataLongaPuraBR("2026-10-14T00:00:00+00:00")).toBe(
      "14 de outubro de 2026"
    );
  });

  it("aceita a data pura sem hora nenhuma", () => {
    expect(dataLongaPuraBR("2026-10-14")).toBe("14 de outubro de 2026");
  });

  it("vira do mês sem escorregar", () => {
    expect(dataLongaPuraBR("2026-11-01T00:00:00+00:00")).toBe(
      "01 de novembro de 2026"
    );
  });
});

describe("instante por extenso PRECISA do fuso", () => {
  it("2h UTC é o dia anterior no Brasil", () => {
    // `trial_ends_at` é `now() + 7 days` — instante de verdade. Aqui
    // recortar a string mostraria o dia seguinte e esticaria o teste.
    expect(dataLongaDeInstanteBR("2026-10-14T02:00:00Z")).toBe(
      "13 de outubro de 2026"
    );
  });

  it("meio-dia UTC é o mesmo dia", () => {
    expect(dataLongaDeInstanteBR("2026-10-14T12:00:00Z")).toBe(
      "14 de outubro de 2026"
    );
  });
});
