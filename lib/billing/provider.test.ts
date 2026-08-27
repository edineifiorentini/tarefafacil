import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { nomeDoProvedor, resolveProvider } from "./provider";

/**
 * O que estes testes protegem é UMA coisa: o gateway falso nunca pode ser
 * escolhido por acidente. Ele diria "pago" para dinheiro que não entrou, e o
 * acesso seria empurrado de graça — sem erro em lugar nenhum.
 */

const original = { ...process.env };

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...original };
  vi.restoreAllMocks();
});

describe("resolveProvider", () => {
  it("sem variável nenhuma, é manual", () => {
    delete process.env.BILLING_PROVIDER;
    expect(resolveProvider().modo).toBe("manual");
  });

  it("valor desconhecido cai em manual, não quebra", () => {
    process.env.BILLING_PROVIDER = "stripe";
    expect(resolveProvider().modo).toBe("manual");
  });

  it("fake exige AS DUAS travas", () => {
    process.env.BILLING_PROVIDER = "fake";
    process.env.NODE_ENV = "development";

    // Só a variável do provedor não basta.
    delete process.env.BILLING_FAKE_OK;
    expect(resolveProvider().modo).toBe("manual");

    process.env.BILLING_FAKE_OK = "1";
    expect(resolveProvider().modo).toBe("gateway");
  });

  it("EM PRODUÇÃO o fake é recusado mesmo com BILLING_FAKE_OK", () => {
    // Este é o teste que importa. Uma variável esquecida no painel da Vercel
    // não pode ser suficiente para o sistema começar a dizer que recebeu.
    process.env.BILLING_PROVIDER = "fake";
    process.env.BILLING_FAKE_OK = "1";
    process.env.NODE_ENV = "production";
    expect(resolveProvider().modo).toBe("manual");
  });
});

describe("nomeDoProvedor", () => {
  it("manual grava 'manual'", () => {
    expect(nomeDoProvedor({ modo: "manual" })).toBe("manual");
  });
});
