import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  autenticar,
  ehProvedorDeWebhook,
  segredoConfere,
  traduzir,
  webhookConfigurado,
} from "./webhook-auth";

const SEGREDO = "um-segredo-com-mais-de-16-caracteres";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubEnv("BILLING_WEBHOOK_SECRET", SEGREDO);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function cabecalhos(pares: Record<string, string>): Headers {
  return new Headers(pares);
}

describe("porta de entrada", () => {
  it("só aceita provedores conhecidos", () => {
    expect(ehProvedorDeWebhook("asaas")).toBe(true);
    expect(ehProvedorDeWebhook("mercado_pago")).toBe(true);
    expect(ehProvedorDeWebhook("efi")).toBe(true);
    expect(ehProvedorDeWebhook("stripe")).toBe(false);
    expect(ehProvedorDeWebhook("")).toBe(false);
    expect(ehProvedorDeWebhook(null)).toBe(false);
  });

  it("sem segredo, o webhook não existe", () => {
    vi.stubEnv("BILLING_WEBHOOK_SECRET", "");
    expect(webhookConfigurado()).toBe(false);
    // 503, não 401: a diferença importa. 401 diria "seu token está errado";
    // 503 diz "o recurso não está ligado", que é a verdade.
    const r = autenticar("asaas", cabecalhos({}), "{}");
    expect(r).toEqual({
      ok: false,
      status: 503,
      erro: "webhook não configurado",
    });
  });

  it("segredo curto demais também fecha", () => {
    vi.stubEnv("BILLING_WEBHOOK_SECRET", "curto");
    expect(webhookConfigurado()).toBe(false);
  });
});

describe("segredoConfere", () => {
  it("aceita igual e recusa diferente", () => {
    expect(segredoConfere("abc", "abc")).toBe(true);
    expect(segredoConfere("abc", "abd")).toBe(false);
  });

  it("tamanhos diferentes não explodem", () => {
    // `timingSafeEqual` joga exceção com buffers de tamanhos diferentes; se
    // isso vazasse, a rota devolveria 500 em vez de 401 e um atacante saberia
    // o tamanho do segredo pela diferença de resposta.
    expect(() => segredoConfere("a", "abcdef")).not.toThrow();
    expect(segredoConfere("a", "abcdef")).toBe(false);
    expect(segredoConfere("", "abc")).toBe(false);
  });
});

describe("autenticação por token (Asaas, EFI)", () => {
  it("aceita o token no cabeçalho do Asaas", () => {
    const r = autenticar(
      "asaas",
      cabecalhos({ "asaas-access-token": SEGREDO }),
      "{}"
    );
    expect(r.ok).toBe(true);
  });

  it("aceita o mesmo segredo como Bearer", () => {
    const r = autenticar(
      "efi",
      cabecalhos({ authorization: `Bearer ${SEGREDO}` }),
      "{}"
    );
    expect(r.ok).toBe(true);
  });

  it("recusa token errado", () => {
    const r = autenticar(
      "asaas",
      cabecalhos({ "asaas-access-token": "outro" }),
      "{}"
    );
    expect(r).toMatchObject({ ok: false, status: 401 });
  });

  it("recusa sem cabeçalho nenhum", () => {
    expect(autenticar("asaas", cabecalhos({}), "{}")).toMatchObject({
      ok: false,
      status: 401,
    });
  });
});

describe("autenticação por assinatura (Mercado Pago)", () => {
  const corpo = '{"action":"payment.updated","data":{"id":"123"}}';
  const assinatura = createHmac("sha256", SEGREDO).update(corpo).digest("hex");

  it("aceita assinatura correta do corpo", () => {
    const r = autenticar(
      "mercado_pago",
      cabecalhos({ "x-signature-hmac": assinatura }),
      corpo
    );
    expect(r.ok).toBe(true);
  });

  it("recusa assinatura de OUTRO corpo", () => {
    // É o ponto da assinatura: um token vazado serve para sempre, uma
    // assinatura só vale para aquele conteúdo. Trocar o valor pago invalida.
    const adulterado = corpo.replace("123", "999");
    const r = autenticar(
      "mercado_pago",
      cabecalhos({ "x-signature-hmac": assinatura }),
      adulterado
    );
    expect(r).toMatchObject({ ok: false, status: 401 });
  });

  it("recusa quando falta a assinatura", () => {
    expect(autenticar("mercado_pago", cabecalhos({}), corpo)).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("token no lugar da assinatura não passa", () => {
    // O ramo do Mercado Pago não pode cair no caminho do token: seria
    // rebaixar a segurança dele para a do provedor mais fraco.
    expect(
      autenticar(
        "mercado_pago",
        cabecalhos({ "asaas-access-token": SEGREDO }),
        corpo
      )
    ).toMatchObject({ ok: false, status: 401 });
  });
});

describe("tradução do Asaas", () => {
  const base = {
    event: "PAYMENT_RECEIVED",
    payment: { id: "pay_123", value: 99.9, paymentDate: "2026-08-27" },
  };

  it("lê pagamento recebido", () => {
    const a = traduzir("asaas", base);
    expect(a).toMatchObject({
      provedor: "asaas",
      providerChargeId: "pay_123",
      pago: true,
      valorCents: 9990,
    });
  });

  it("a chave do evento inclui o TIPO, não só o pagamento", () => {
    // "recebido" e "confirmado" do mesmo pagamento são dois eventos; se a
    // chave fosse só o id, o segundo seria descartado como repetido.
    const recebido = traduzir("asaas", base);
    const confirmado = traduzir("asaas", {
      ...base,
      event: "PAYMENT_CONFIRMED",
    });
    expect(recebido?.externalId).not.toBe(confirmado?.externalId);
  });

  it("evento que não é pagamento vem com pago=false", () => {
    const a = traduzir("asaas", { ...base, event: "PAYMENT_OVERDUE" });
    expect(a?.pago).toBe(false);
  });

  it("corpo sem id de pagamento é irreconhecível", () => {
    expect(traduzir("asaas", { event: "PAYMENT_RECEIVED" })).toBeNull();
    expect(traduzir("asaas", null)).toBeNull();
    expect(traduzir("asaas", "texto")).toBeNull();
  });
});

describe("tradução do Mercado Pago", () => {
  it("só conta como pago com status aprovado explícito", () => {
    const aprovado = traduzir("mercado_pago", {
      id: 7,
      action: "payment.updated",
      status: "approved",
      data: { id: "mp_1" },
    });
    expect(aprovado?.pago).toBe(true);

    const pendente = traduzir("mercado_pago", {
      id: 8,
      action: "payment.updated",
      status: "pending",
      data: { id: "mp_1" },
    });
    expect(pendente?.pago).toBe(false);
  });
});

describe("valores em centavos", () => {
  it("converte sem erro de ponto flutuante", () => {
    // 2.675 * 100 dá 267.49999999999997 em float e arredondaria para menos.
    const a = traduzir("asaas", {
      event: "PAYMENT_RECEIVED",
      payment: { id: "p", value: "2.675" },
    });
    // String com 3 casas não é valor de dinheiro válido: recusado, não
    // adivinhado.
    expect(a?.valorCents).toBeNull();

    const b = traduzir("asaas", {
      event: "PAYMENT_RECEIVED",
      payment: { id: "p", value: "19,90" },
    });
    expect(b?.valorCents).toBe(1990);

    const c = traduzir("asaas", {
      event: "PAYMENT_RECEIVED",
      payment: { id: "p", value: "100" },
    });
    expect(c?.valorCents).toBe(10000);
  });

  it("valor ausente ou lixo vira null, não zero", () => {
    // Zero seria registrado como "pagou R$ 0,00", que é diferente de "não
    // veio valor no aviso".
    const a = traduzir("asaas", {
      event: "PAYMENT_RECEIVED",
      payment: { id: "p" },
    });
    expect(a?.valorCents).toBeNull();
  });
});
