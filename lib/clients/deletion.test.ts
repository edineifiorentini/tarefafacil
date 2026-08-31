import { describe, expect, it } from "vitest";

import {
  fraseDoQueSobrevive,
  pluralizar,
  podeExcluir,
  type ImpactoDaExclusao,
} from "./deletion";

/**
 * Esta regra decide se um contrato assinado vai ser apagado. Cada caso aqui
 * é uma forma de deixar isso acontecer calado.
 */

const nada: ImpactoDaExclusao = {
  contratos: 0,
  negociacoes: 0,
  tarefas: 0,
  lancamentos: 0,
};

describe("podeExcluir", () => {
  it("cliente limpo pode ser excluído", () => {
    const v = podeExcluir(nada);
    expect(v.pode).toBe(true);
  });

  it("UM contrato já bloqueia", () => {
    // O caso que importa: `contract.client_id` é on delete cascade, e o
    // texto do contrato foi congelado na assinatura de propósito.
    const v = podeExcluir({ ...nada, contratos: 1 });
    expect(v.pode).toBe(false);
    if (!v.pode) {
      expect(v.motivo).toBe("contrato");
      expect(v.contratos).toBe(1);
    }
  });

  it("contrato bloqueia mesmo com tudo o mais vazio", () => {
    const v = podeExcluir({
      contratos: 3,
      negociacoes: 0,
      tarefas: 0,
      lancamentos: 0,
    });
    expect(v.pode).toBe(false);
  });

  it("negociação NÃO bloqueia, mas é declarada", () => {
    // Ela também é cascata, e some. Mas é registro comercial, não
    // documento — bloquear por causa dela impediria limpar duplicata.
    const v = podeExcluir({ ...nada, negociacoes: 2 });
    expect(v.pode).toBe(true);
    if (v.pode) expect(v.apagaJunto).toBe(2);
  });

  it("tarefa e lançamento não bloqueiam e são somados", () => {
    const v = podeExcluir({ ...nada, tarefas: 4, lancamentos: 3 });
    expect(v.pode).toBe(true);
    if (v.pode) {
      expect(v.perdemVinculo).toBe(7);
      expect(v.apagaJunto).toBe(0);
    }
  });
});

describe("pluralizar", () => {
  it("um fica no singular", () => {
    expect(pluralizar(1, "contrato", "contratos")).toBe("1 contrato");
  });

  it("zero e vários vão para o plural", () => {
    expect(pluralizar(0, "contrato", "contratos")).toBe("0 contratos");
    expect(pluralizar(5, "contrato", "contratos")).toBe("5 contratos");
  });
});

describe("fraseDoQueSobrevive", () => {
  it("sem nada a dizer, devolve null", () => {
    // Uma linha "0 demandas continuam no sistema" é ruído, e ruído treina a
    // pessoa a não ler o diálogo.
    expect(fraseDoQueSobrevive(nada)).toBeNull();
  });

  it("só demandas", () => {
    expect(fraseDoQueSobrevive({ ...nada, tarefas: 3 })).toBe(
      "3 demandas continuam no sistema, sem o vínculo com este cliente."
    );
  });

  it("uma só concorda no singular", () => {
    expect(fraseDoQueSobrevive({ ...nada, tarefas: 1 })).toBe(
      "1 demanda continua no sistema, sem o vínculo com este cliente."
    );
  });

  it("junta os dois com 'e'", () => {
    expect(fraseDoQueSobrevive({ ...nada, tarefas: 2, lancamentos: 1 })).toBe(
      "2 demandas e 1 lançamento continuam no sistema, sem o vínculo com este cliente."
    );
  });

  it("um de cada ainda é plural no verbo", () => {
    // Dois itens no total, mesmo sendo "1 e 1".
    expect(fraseDoQueSobrevive({ ...nada, tarefas: 1, lancamentos: 1 })).toBe(
      "1 demanda e 1 lançamento continuam no sistema, sem o vínculo com este cliente."
    );
  });
});
