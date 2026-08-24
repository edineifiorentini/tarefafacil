import { describe, expect, it } from "vitest";

import { asaas } from "./asaas";
import { mercadoPago } from "./mercadoPago";
import { failureFromStatus } from "./provider";

/**
 * O que estes testes protegem é a checagem de ambiente.
 *
 * Chave de produção usada como sandbox emite cobrança de verdade para o
 * cliente final de alguém — não tem desfazer, e o provedor não reclamaria,
 * porque do ponto de vista dele a chave é válida. Só nós podemos pegar isso,
 * e é antes de gastar a chamada de rede.
 */
describe("Mercado Pago — formato do token", () => {
  it("aceita o token de teste em sandbox", () => {
    expect(mercadoPago.inspectToken("TEST-123", "sandbox").ok).toBe(true);
  });

  it("aceita o token de produção em produção", () => {
    expect(mercadoPago.inspectToken("APP_USR-123", "producao").ok).toBe(true);
  });

  it("recusa token de produção marcado como sandbox", () => {
    const r = mercadoPago.inspectToken("APP_USR-123", "sandbox");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("cobraria de verdade");
  });

  it("recusa token de teste marcado como produção", () => {
    const r = mercadoPago.inspectToken("TEST-123", "producao");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("não recebe nada");
  });

  it("recusa token de formato desconhecido", () => {
    expect(mercadoPago.inspectToken("abc123", "producao").ok).toBe(false);
  });

  it("ignora espaço colado junto", () => {
    // Copiar do painel traz espaço ou quebra de linha mais vezes do que não.
    expect(mercadoPago.inspectToken("  TEST-123\n", "sandbox").ok).toBe(true);
  });
});

describe("Asaas — formato da chave", () => {
  it("aceita a chave de homologação em sandbox", () => {
    expect(asaas.inspectToken("$aact_hmlg_abc", "sandbox").ok).toBe(true);
  });

  it("aceita a chave de produção em produção", () => {
    expect(asaas.inspectToken("$aact_prod_abc", "producao").ok).toBe(true);
  });

  it("recusa chave de produção marcada como sandbox", () => {
    const r = asaas.inspectToken("$aact_prod_abc", "sandbox");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("cobraria de verdade");
  });

  it("recusa chave de homologação marcada como produção", () => {
    const r = asaas.inspectToken("$aact_hmlg_abc", "producao");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("não recebe nada");
  });

  it("recusa chave sem o prefixo do Asaas", () => {
    expect(asaas.inspectToken("aact_hmlg_abc", "sandbox").ok).toBe(false);
  });
});

describe("failureFromStatus", () => {
  it("só 401 e 403 acusam a credencial", () => {
    expect(failureFromStatus(401, "Asaas").kind).toBe("credencial");
    expect(failureFromStatus(403, "Asaas").kind).toBe("credencial");
  });

  it("erro do provedor não vira culpa da credencial", () => {
    // Dizer "token inválido" num 500 faz a pessoa revogar uma chave que
    // estava boa, gerar outra, e falhar de novo.
    for (const status of [429, 500, 502, 503]) {
      const r = failureFromStatus(status, "Mercado Pago");
      expect(r.kind).toBe("indisponivel");
      expect(r.message).toContain("não foi salva");
    }
  });
});
