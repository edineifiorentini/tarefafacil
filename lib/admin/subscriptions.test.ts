import { describe, expect, it } from "vitest";

import { contaNoMrr } from "./metrics";
import { estadoDaAssinatura } from "./subscriptions";

const AGORA = new Date("2026-08-27T12:00:00Z").getTime();
const FUTURO = "2026-09-30T00:00:00Z";
const PASSADO = "2026-07-01T00:00:00Z";

const base = {
  temAssinatura: true,
  status: "ativa" as string | null,
  cancelAt: null as string | null,
  trial: false,
  agora: AGORA,
};

describe("estadoDaAssinatura", () => {
  it("assinatura ativa comum", () => {
    expect(estadoDaAssinatura(base)).toBe("ativa");
  });

  it("sem linha de assinatura e fora do teste", () => {
    expect(estadoDaAssinatura({ ...base, temAssinatura: false })).toBe(
      "sem_assinatura"
    );
  });

  it("sem linha de assinatura, mas em teste", () => {
    expect(
      estadoDaAssinatura({ ...base, temAssinatura: false, trial: true })
    ).toBe("teste");
  });

  it("cancelamento agendado vence 'ativa'", () => {
    // A assinatura funciona, mas tem data para morrer — e é essa a
    // informação que muda uma decisão de cobrança.
    expect(estadoDaAssinatura({ ...base, cancelAt: FUTURO })).toBe(
      "cancelamento_agendado"
    );
  });

  it("agendamento no passado não vira estado", () => {
    // Data vencida é trabalho pendente do processo de encerramento, não um
    // estado a exibir: a assinatura continua o que era.
    expect(estadoDaAssinatura({ ...base, cancelAt: PASSADO })).toBe("ativa");
  });

  it("cancelada vence o agendamento", () => {
    expect(
      estadoDaAssinatura({ ...base, status: "cancelada", cancelAt: FUTURO })
    ).toBe("cancelada");
  });

  it("vencida é inadimplência", () => {
    expect(estadoDaAssinatura({ ...base, status: "vencida" })).toBe(
      "inadimplente"
    );
  });

  it("pendente é pagamento pendente", () => {
    expect(estadoDaAssinatura({ ...base, status: "pendente" })).toBe(
      "pendente"
    );
  });

  it("inadimplência vence 'em teste'", () => {
    // Conta em teste com cobrança vencida é problema de cobrança.
    expect(
      estadoDaAssinatura({ ...base, status: "vencida", trial: true })
    ).toBe("inadimplente");
  });
});

describe("contaNoMrr", () => {
  it("assinatura ativa de empresa comum conta", () => {
    expect(contaNoMrr({ trial: false, suspended: false }, "ativa")).toBe(true);
  });

  it("empresa em teste nunca conta", () => {
    expect(contaNoMrr({ trial: true, suspended: false }, "ativa")).toBe(false);
  });

  it("empresa suspensa nunca conta", () => {
    expect(contaNoMrr({ trial: false, suspended: true }, "ativa")).toBe(false);
  });

  it("empresa SEM assinatura não conta, mesmo usando o sistema", () => {
    // Era exatamente aqui que as duas definições divergiam: a listagem de
    // empresas contava a empresa sem linha em `subscription` como receita, e
    // o cartão de MRR não.
    expect(contaNoMrr({ trial: false, suspended: false }, null)).toBe(false);
    expect(contaNoMrr({ trial: false, suspended: false }, undefined)).toBe(
      false
    );
  });

  it("assinatura cancelada ou vencida não conta", () => {
    expect(contaNoMrr({ trial: false, suspended: false }, "cancelada")).toBe(
      false
    );
    expect(contaNoMrr({ trial: false, suspended: false }, "vencida")).toBe(
      false
    );
  });
});
