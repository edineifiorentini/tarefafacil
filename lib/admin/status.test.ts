import { describe, expect, it } from "vitest";

import { statusDaEmpresa } from "./status";

const AGORA = new Date("2026-08-27T12:00:00Z").getTime();
const ONTEM = "2026-08-26T12:00:00Z";
const AMANHA = "2026-08-28T12:00:00Z";

const base = { suspended: false, access_expires_at: null, trial: false };

describe("statusDaEmpresa", () => {
  it("empresa comum pagando é ativa", () => {
    expect(statusDaEmpresa(base, "ativa", AGORA)).toBe("ativa");
  });

  it("empresa em teste é teste", () => {
    expect(statusDaEmpresa({ ...base, trial: true }, null, AGORA)).toBe(
      "teste"
    );
  });

  it("suspensão ganha de tudo", () => {
    // Mesmo em teste, mesmo com assinatura ativa: foi decisão da plataforma.
    expect(
      statusDaEmpresa({ ...base, suspended: true, trial: true }, "ativa", AGORA)
    ).toBe("suspensa");
  });

  it("acesso vencido vira inativa mesmo com assinatura ativa", () => {
    expect(
      statusDaEmpresa({ ...base, access_expires_at: ONTEM }, "ativa", AGORA)
    ).toBe("inativa");
  });

  it("acesso que vence amanhã ainda não é inativa", () => {
    expect(
      statusDaEmpresa({ ...base, access_expires_at: AMANHA }, "ativa", AGORA)
    ).toBe("ativa");
  });

  it("assinatura vencida é inadimplência, não teste", () => {
    // O caso que a ordem de precedência existe para resolver: uma conta em
    // teste com cobrança vencida é um problema de cobrança.
    expect(statusDaEmpresa({ ...base, trial: true }, "vencida", AGORA)).toBe(
      "inadimplente"
    );
  });

  it("pagamento pendente aparece como pendente", () => {
    expect(statusDaEmpresa(base, "pendente", AGORA)).toBe("pendente");
  });

  it("assinatura cancelada aparece como cancelada", () => {
    expect(statusDaEmpresa(base, "cancelada", AGORA)).toBe("cancelada");
  });

  it("sem assinatura nenhuma e fora do teste, conta como ativa", () => {
    // Cliente cadastrado à mão pela plataforma, com acesso liberado e sem
    // cobrança configurada: ele usa o sistema, então não pode aparecer como
    // inadimplente.
    expect(statusDaEmpresa(base, null, AGORA)).toBe("ativa");
  });
});
