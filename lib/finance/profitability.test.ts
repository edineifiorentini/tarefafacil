import { describe, expect, it } from "vitest";

import {
  agrupar,
  custoDeHoras,
  precoDe,
  rentabilidade,
  type Apontamento,
  type Lancamento,
  type Preco,
} from "./profitability";

/**
 * Rentabilidade é o número que decide preço. Cada caso aqui é uma forma de
 * ele mentir: contar dinheiro que não caiu, tratar hora sem preço como hora
 * de graça, ou esconder que ignorou o trabalho.
 */

const ANA = "ana";
const BRUNO = "bruno";

const entrada = (cents: number, status: Lancamento["status"] = "confirmado") =>
  ({ kind: "entrada", status, amountCents: cents }) satisfies Lancamento;
const saida = (cents: number, status: Lancamento["status"] = "confirmado") =>
  ({ kind: "saida", status, amountCents: cents }) satisfies Lancamento;

describe("precoDe", () => {
  const precos: Preco[] = [
    { userId: null, horaCents: 10_000 },
    { userId: ANA, horaCents: 15_000 },
  ];

  it("o preço da pessoa vence o padrão da empresa", () => {
    expect(precoDe(ANA, precos)).toBe(15_000);
  });

  it("sem preço próprio, cai no padrão", () => {
    expect(precoDe(BRUNO, precos)).toBe(10_000);
  });

  it("sem padrão e sem próprio, devolve null e NÃO zero", () => {
    // A distinção que sustenta o resto: zero significaria "esta hora é de
    // graça" e entraria na margem inflando-a. null é "não sei".
    expect(precoDe(BRUNO, [{ userId: ANA, horaCents: 15_000 }])).toBeNull();
    expect(precoDe(BRUNO, [])).toBeNull();
  });
});

describe("custoDeHoras", () => {
  it("soma pelo preço de cada um", () => {
    const ap: Apontamento[] = [
      { userId: ANA, minutos: 60 },
      { userId: BRUNO, minutos: 30 },
    ];
    const precos: Preco[] = [
      { userId: ANA, horaCents: 15_000 },
      { userId: BRUNO, horaCents: 10_000 },
    ];
    // 1h a 150 + 0,5h a 100 = 200,00
    expect(custoDeHoras(ap, precos).cents).toBe(20_000);
  });

  it("hora sem preço vira minutosSemPreco, não custo zero", () => {
    const r = custoDeHoras(
      [
        { userId: ANA, minutos: 60 },
        { userId: BRUNO, minutos: 120 },
      ],
      [{ userId: ANA, horaCents: 15_000 }]
    );
    expect(r.cents).toBe(15_000);
    expect(r.minutosSemPreco).toBe(120);
  });

  it("sem preço nenhum, custo zero e tudo marcado como sem preço", () => {
    const r = custoDeHoras([{ userId: ANA, minutos: 90 }], []);
    expect(r.cents).toBe(0);
    expect(r.minutosSemPreco).toBe(90);
  });

  it("arredonda uma vez no fim, não a cada apontamento", () => {
    // 10 apontamentos de 1 minuto a R$ 100/h = 10 × 166,66... centavos.
    // Arredondando cada um: 10 × 167 = 1670. Certo: round(16666/60·…) …
    // ou seja, 10·10000/60 = 1666,67 -> 1667.
    const ap = Array.from({ length: 10 }, () => ({ userId: ANA, minutos: 1 }));
    const r = custoDeHoras(ap, [{ userId: ANA, horaCents: 10_000 }]);
    expect(r.cents).toBe(1667);
  });

  it("sem apontamento, zero", () => {
    expect(custoDeHoras([], [{ userId: null, horaCents: 10_000 }])).toEqual({
      cents: 0,
      minutosSemPreco: 0,
    });
  });
});

describe("rentabilidade", () => {
  it("só dinheiro quando não há preço de hora", () => {
    // O caminho da empresa que não quer custo/hora: ela simplesmente não
    // cadastra preço, e não existe interruptor para isso.
    const r = rentabilidade(
      [entrada(500_000), saida(120_000)],
      [{ userId: ANA, minutos: 600 }],
      []
    );
    expect(r.margemCents).toBe(380_000);
    expect(r.custoDeHorasCents).toBe(0);
    expect(r.temPrecoDeHora).toBe(false);
    // E declara o que ficou de fora, para a tela poder avisar.
    expect(r.minutosSemPreco).toBe(600);
  });

  it("com preço, o trabalho entra na margem", () => {
    const r = rentabilidade(
      [entrada(500_000), saida(120_000)],
      [{ userId: ANA, minutos: 600 }],
      [{ userId: null, horaCents: 10_000 }]
    );
    // 10h a R$100 = R$ 1.000,00
    expect(r.custoDeHorasCents).toBe(100_000);
    expect(r.margemCents).toBe(280_000);
    expect(r.temPrecoDeHora).toBe(true);
    expect(r.minutosSemPreco).toBe(0);
  });

  it("previsto NÃO entra na margem, e volta separado", () => {
    // O erro clássico: contar como lucro a entrada que ainda não caiu.
    const r = rentabilidade(
      [entrada(100_000), entrada(900_000, "previsto"), saida(50_000, "previsto")],
      [],
      []
    );
    expect(r.receitaCents).toBe(100_000);
    expect(r.margemCents).toBe(100_000);
    expect(r.previstoEntradaCents).toBe(900_000);
    expect(r.previstoSaidaCents).toBe(50_000);
  });

  it("cancelado não entra em lugar nenhum", () => {
    const r = rentabilidade(
      [entrada(100_000), entrada(999_999, "cancelado"), saida(1, "cancelado")],
      [],
      []
    );
    expect(r.receitaCents).toBe(100_000);
    expect(r.previstoEntradaCents).toBe(0);
    expect(r.custoDiretoCents).toBe(0);
  });

  it("margem negativa é resultado válido, não erro", () => {
    // Projeto que deu prejuízo precisa aparecer como prejuízo.
    const r = rentabilidade(
      [entrada(100_000), saida(80_000)],
      [{ userId: ANA, minutos: 1200 }],
      [{ userId: null, horaCents: 10_000 }]
    );
    expect(r.custoDeHorasCents).toBe(200_000);
    expect(r.margemCents).toBe(-180_000);
  });

  it("preço por pessoa e padrão convivem no mesmo cálculo", () => {
    const r = rentabilidade(
      [entrada(1_000_000)],
      [
        { userId: ANA, minutos: 60 },
        { userId: BRUNO, minutos: 60 },
      ],
      [
        { userId: null, horaCents: 8_000 },
        { userId: ANA, horaCents: 20_000 },
      ]
    );
    // Ana pelo próprio (200), Bruno pelo padrão (80).
    expect(r.custoDeHorasCents).toBe(28_000);
    expect(r.minutosSemPreco).toBe(0);
  });

  it("recorte vazio devolve zeros, não NaN", () => {
    const r = rentabilidade([], [], []);
    expect(r.margemCents).toBe(0);
    expect(r.receitaCents).toBe(0);
    expect(Number.isNaN(r.margemCents)).toBe(false);
  });
});

describe("agrupar", () => {
  const l = (
    cents: number,
    kind: "entrada" | "saida",
    c: Partial<{ clientId: string; projectId: string; sectorId: string }>
  ) => ({
    kind,
    status: "confirmado" as const,
    amountCents: cents,
    clientId: c.clientId ?? null,
    projectId: c.projectId ?? null,
    sectorId: c.sectorId ?? null,
  });

  it("separa por cliente e soma dentro de cada um", () => {
    const r = agrupar(
      [
        l(100_000, "entrada", { clientId: "c1" }),
        l(30_000, "saida", { clientId: "c1" }),
        l(50_000, "entrada", { clientId: "c2" }),
      ],
      [],
      [],
      "cliente"
    );
    expect(r).toHaveLength(2);
    const c1 = r.find((x) => x.chave === "c1")!;
    expect(c1.resultado.margemCents).toBe(70_000);
  });

  it("o balde nulo existe — item sem etiqueta NÃO some da soma", () => {
    // Se o item sem projeto sumisse, a receita mostrada seria menor que a
    // real e ninguém entenderia por quê.
    const r = agrupar(
      [
        l(100_000, "entrada", { projectId: "p1" }),
        l(40_000, "entrada", {}),
      ],
      [],
      [],
      "projeto"
    );
    const total = r.reduce((s, x) => s + x.resultado.receitaCents, 0);
    expect(total).toBe(140_000);
    expect(r.some((x) => x.chave === null)).toBe(true);
  });

  it("ordena por margem decrescente — prejuízo no fim", () => {
    const r = agrupar(
      [
        l(10_000, "entrada", { sectorId: "s1" }),
        l(90_000, "saida", { sectorId: "s1" }),
        l(200_000, "entrada", { sectorId: "s2" }),
      ],
      [],
      [],
      "setor"
    );
    expect(r[0].chave).toBe("s2");
    expect(r[r.length - 1].resultado.margemCents).toBeLessThan(0);
  });

  it("horas entram no balde do MESMO recorte que o dinheiro", () => {
    const r = agrupar(
      [l(100_000, "entrada", { projectId: "p1" })],
      [
        {
          userId: "ana",
          minutos: 60,
          clientId: null,
          projectId: "p1",
          sectorId: null,
        },
      ],
      [{ userId: null, horaCents: 20_000 }],
      "projeto"
    );
    const p1 = r.find((x) => x.chave === "p1")!;
    expect(p1.resultado.custoDeHorasCents).toBe(20_000);
    expect(p1.resultado.margemCents).toBe(80_000);
  });

  it("hora de um recorte não vaza para outro", () => {
    const r = agrupar(
      [l(100_000, "entrada", { projectId: "p1" })],
      [
        {
          userId: "ana",
          minutos: 60,
          clientId: null,
          projectId: "p2",
          sectorId: null,
        },
      ],
      [{ userId: null, horaCents: 20_000 }],
      "projeto"
    );
    expect(r.find((x) => x.chave === "p1")!.resultado.custoDeHorasCents).toBe(0);
    expect(r.find((x) => x.chave === "p2")!.resultado.custoDeHorasCents).toBe(
      20_000
    );
  });

  it("sem nada, lista vazia e não uma linha fantasma", () => {
    expect(agrupar([], [], [], "cliente")).toEqual([]);
  });
});
