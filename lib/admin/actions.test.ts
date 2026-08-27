import { describe, expect, it } from "vitest";

import {
  ACOES,
  MOTIVO_MINIMO,
  ehAcaoDeEmpresa,
  validarMotivo,
  type AcaoDeEmpresa,
} from "./actions";

describe("ehAcaoDeEmpresa", () => {
  it("aceita as ações conhecidas", () => {
    expect(ehAcaoDeEmpresa("suspender")).toBe(true);
    expect(ehAcaoDeEmpresa("anotar")).toBe(true);
  });

  it("recusa qualquer outra coisa", () => {
    // É a porta de entrada da rota: sem isto, um corpo adulterado escolheria
    // o ramo do switch por acaso.
    expect(ehAcaoDeEmpresa("virar_admin")).toBe(false);
    expect(ehAcaoDeEmpresa("")).toBe(false);
    expect(ehAcaoDeEmpresa(null)).toBe(false);
    expect(ehAcaoDeEmpresa(42)).toBe(false);
    expect(ehAcaoDeEmpresa({ acao: "suspender" })).toBe(false);
  });
});

describe("validarMotivo", () => {
  it("exige motivo em ação que mexe no acesso ou no dinheiro", () => {
    expect(validarMotivo("suspender", undefined)).toBe(
      "Escreva o motivo desta ação"
    );
    expect(validarMotivo("alterar_plano", "")).toBe(
      "Escreva o motivo desta ação"
    );
  });

  it("recusa motivo curto demais para significar algo", () => {
    expect(validarMotivo("suspender", "abc")).toContain(String(MOTIVO_MINIMO));
  });

  it("espaço em branco não conta como motivo", () => {
    expect(validarMotivo("suspender", "          ")).toBe(
      "Escreva o motivo desta ação"
    );
  });

  it("aceita motivo de verdade", () => {
    expect(validarMotivo("suspender", "inadimplente há 3 meses")).toBeNull();
  });

  it("não exige motivo para anotar", () => {
    // A nota já é o texto; pedir um motivo para escrever um motivo é
    // burocracia sem leitor.
    expect(validarMotivo("anotar", undefined)).toBeNull();
  });
});

describe("catálogo de ações", () => {
  it("toda ação tem rótulo com verbo e consequência escrita", () => {
    for (const [nome, def] of Object.entries(ACOES)) {
      expect(def.label.length, `${nome} sem rótulo`).toBeGreaterThan(0);
      expect(
        def.consequencia.length,
        `${nome} sem consequência`
      ).toBeGreaterThan(10);
      // Especificação 20: nada de "Confirmar" genérico.
      expect(def.label.toLowerCase()).not.toBe("confirmar");
    }
  });

  it("só a exclusão pede o nome digitado", () => {
    const pedemNome = (Object.keys(ACOES) as AcaoDeEmpresa[]).filter(
      (a) => ACOES[a].exigeNome
    );
    // Confirmação por digitação em ação corriqueira treina a pessoa a
    // digitar sem ler.
    expect(pedemNome).toEqual(["excluir"]);
  });

  it("toda ação destrutiva exige motivo", () => {
    for (const [nome, def] of Object.entries(ACOES)) {
      if (def.destrutiva) {
        expect(def.exigeMotivo, `${nome} é destrutiva e não pede motivo`).toBe(
          true
        );
      }
    }
  });
});
