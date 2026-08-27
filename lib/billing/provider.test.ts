import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { nomeDoProvedor, resolveProvider } from "./provider";

/**
 * O que estes testes protegem é UMA coisa: o gateway falso nunca pode ser
 * escolhido por acidente. Ele diria "pago" para dinheiro que não entrou, e o
 * acesso seria empurrado de graça — sem erro em lugar nenhum.
 */

/**
 * `vi.stubEnv` e não atribuição direta: o Next declara `NODE_ENV` como
 * somente leitura no `ProcessEnv`, e `process.env.NODE_ENV = "x"` compila no
 * `tsc --noEmit` do projeto mas quebra o build de produção — que carrega os
 * tipos do Next por cima. Descoberto do jeito ruim, com o build vermelho
 * depois do push.
 */
beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("resolveProvider", () => {
  it("sem variável nenhuma, é manual", () => {
    vi.stubEnv("BILLING_PROVIDER", "");
    expect(resolveProvider().modo).toBe("manual");
  });

  it("valor desconhecido cai em manual, não quebra", () => {
    vi.stubEnv("BILLING_PROVIDER", "stripe");
    expect(resolveProvider().modo).toBe("manual");
  });

  it("fake exige AS DUAS travas", () => {
    vi.stubEnv("BILLING_PROVIDER", "fake");
    vi.stubEnv("NODE_ENV", "development");

    // Só a variável do provedor não basta.
    vi.stubEnv("BILLING_FAKE_OK", "");
    expect(resolveProvider().modo).toBe("manual");

    vi.stubEnv("BILLING_FAKE_OK", "1");
    expect(resolveProvider().modo).toBe("gateway");
  });

  it("EM PRODUÇÃO o fake é recusado mesmo com BILLING_FAKE_OK", () => {
    // Este é o teste que importa. Uma variável esquecida no painel da Vercel
    // não pode ser suficiente para o sistema começar a dizer que recebeu.
    vi.stubEnv("BILLING_PROVIDER", "fake");
    vi.stubEnv("BILLING_FAKE_OK", "1");
    vi.stubEnv("NODE_ENV", "production");
    expect(resolveProvider().modo).toBe("manual");
  });
});

describe("nomeDoProvedor", () => {
  it("manual grava 'manual'", () => {
    expect(nomeDoProvedor({ modo: "manual" })).toBe("manual");
  });
});
