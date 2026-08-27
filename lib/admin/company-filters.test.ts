import { describe, expect, it } from "vitest";

import type { EmpresaResumo } from "./companies";
import { chipsDeFiltro, filtrarEmpresas } from "./company-filters";

const AGORA = new Date("2026-08-27T12:00:00Z").getTime();
const dia = 86_400_000;

function empresa(over: Partial<EmpresaResumo> = {}): EmpresaResumo {
  return {
    id: "w1",
    nome: "Padaria Central",
    responsavel: "dono@padaria.com",
    status: "ativa",
    planoNome: "Pro",
    membros: 2,
    seatLimit: 5,
    ultimoAcesso: null,
    mrrCents: 9900,
    origem: null,
    criadaEm: "2026-01-01T00:00:00Z",
    ultimaAtividade: new Date(AGORA - dia).toISOString(),
    convitesExpirados: 0,
    emTeste: false,
    fimDoTeste: null,
    ...over,
  };
}

describe("busca por texto", () => {
  const lista = [
    empresa({ id: "a", nome: "Padaria Central" }),
    empresa({ id: "b", nome: "Serviços Gerais", responsavel: "x@y.com" }),
  ];

  it("acha por nome", () => {
    expect(filtrarEmpresas(lista, { q: "padaria" }, AGORA)).toHaveLength(1);
  });

  it("acha por e-mail do responsável", () => {
    expect(filtrarEmpresas(lista, { q: "x@y.com" }, AGORA)).toHaveLength(1);
  });

  it("ignora acento", () => {
    // "servico" precisa achar "Serviços": ninguém digita cedilha na pressa.
    expect(filtrarEmpresas(lista, { q: "servico" }, AGORA)).toHaveLength(1);
  });

  it("busca vazia não filtra nada", () => {
    expect(filtrarEmpresas(lista, { q: "   " }, AGORA)).toHaveLength(2);
  });
});

describe("teste vencendo", () => {
  it("pega teste que termina dentro da janela", () => {
    const lista = [
      empresa({
        emTeste: true,
        fimDoTeste: new Date(AGORA + 3 * dia).toISOString(),
      }),
    ];
    expect(filtrarEmpresas(lista, { vencendo: true }, AGORA)).toHaveLength(1);
  });

  it("ignora teste que termina longe", () => {
    const lista = [
      empresa({
        emTeste: true,
        fimDoTeste: new Date(AGORA + 30 * dia).toISOString(),
      }),
    ];
    expect(filtrarEmpresas(lista, { vencendo: true }, AGORA)).toHaveLength(0);
  });

  it("teste que JÁ acabou não está vencendo", () => {
    // Acabou não é vencendo. Sem esta regra o alerta contaria os dois juntos.
    const lista = [
      empresa({
        emTeste: true,
        fimDoTeste: new Date(AGORA - dia).toISOString(),
      }),
    ];
    expect(filtrarEmpresas(lista, { vencendo: true }, AGORA)).toHaveLength(0);
  });

  it("quem não está em teste nunca entra", () => {
    const lista = [
      empresa({
        emTeste: false,
        fimDoTeste: new Date(AGORA + dia).toISOString(),
      }),
    ];
    expect(filtrarEmpresas(lista, { vencendo: true }, AGORA)).toHaveLength(0);
  });
});

describe("conta parada", () => {
  it("pega quem não mexe em demanda há mais de 30 dias", () => {
    const lista = [
      empresa({ ultimaAtividade: new Date(AGORA - 40 * dia).toISOString() }),
    ];
    expect(filtrarEmpresas(lista, { atividade: "parada" }, AGORA)).toHaveLength(
      1
    );
  });

  it("pega quem NUNCA teve atividade", () => {
    // É o caso mais interessante: cadastrou e não usou.
    const lista = [empresa({ ultimaAtividade: null })];
    expect(filtrarEmpresas(lista, { atividade: "parada" }, AGORA)).toHaveLength(
      1
    );
  });

  it("ignora quem mexeu ontem", () => {
    expect(
      filtrarEmpresas([empresa()], { atividade: "parada" }, AGORA)
    ).toHaveLength(0);
  });
});

describe("limite de assentos", () => {
  it("pega quem está em 80% ou mais", () => {
    const lista = [empresa({ membros: 4, seatLimit: 5 })];
    expect(filtrarEmpresas(lista, { assentos: "limite" }, AGORA)).toHaveLength(
      1
    );
  });

  it("pega quem estourou o limite", () => {
    const lista = [empresa({ membros: 7, seatLimit: 5 })];
    expect(filtrarEmpresas(lista, { assentos: "limite" }, AGORA)).toHaveLength(
      1
    );
  });

  it("ignora quem está folgado", () => {
    expect(
      filtrarEmpresas(
        [empresa({ membros: 2, seatLimit: 10 })],
        {
          assentos: "limite",
        },
        AGORA
      )
    ).toHaveLength(0);
  });

  it("limite zero não entra, para não dividir por nada", () => {
    expect(
      filtrarEmpresas(
        [empresa({ membros: 3, seatLimit: 0 })],
        {
          assentos: "limite",
        },
        AGORA
      )
    ).toHaveLength(0);
  });
});

describe("filtros combinados", () => {
  it("somam, não substituem", () => {
    const lista = [
      empresa({
        id: "a",
        nome: "Alfa",
        status: "teste",
        emTeste: true,
        fimDoTeste: new Date(AGORA + dia).toISOString(),
      }),
      empresa({
        id: "b",
        nome: "Beta",
        status: "teste",
        emTeste: true,
        fimDoTeste: new Date(AGORA + 90 * dia).toISOString(),
      }),
    ];
    const r = filtrarEmpresas(
      lista,
      { status: "teste", vencendo: true },
      AGORA
    );
    expect(r.map((e) => e.nome)).toEqual(["Alfa"]);
  });

  it("sem filtro nenhum devolve tudo", () => {
    const lista = [empresa({ id: "a" }), empresa({ id: "b" })];
    expect(filtrarEmpresas(lista, {}, AGORA)).toHaveLength(2);
  });
});

describe("chipsDeFiltro", () => {
  const rotulo = () => "Em teste";

  it("um chip por filtro ativo", () => {
    const chips = chipsDeFiltro(
      { q: "padaria", status: "teste", vencendo: true },
      rotulo
    );
    expect(chips.map((c) => c.chave)).toEqual(["q", "status", "vencendo"]);
  });

  it("sem filtro, nenhum chip", () => {
    expect(chipsDeFiltro({}, rotulo)).toHaveLength(0);
  });
});
