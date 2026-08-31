import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  readSupportCookie,
  signSupportCookie,
  supportConfigured,
  type SupportClaim,
} from "./session";

const original = process.env.SUPPORT_ACCESS_SECRET;

function claim(over: Partial<SupportClaim> = {}): SupportClaim {
  return {
    sessionId: "11111111-1111-1111-1111-111111111111",
    workspaceId: "22222222-2222-2222-2222-222222222222",
    adminEmail: "suporte@taflow.app",
    exp: Math.floor(Date.now() / 1000) + 600,
    ...over,
  };
}

beforeEach(() => {
  process.env.SUPPORT_ACCESS_SECRET = "segredo-de-teste-com-tamanho-ok";
});

afterEach(() => {
  if (original === undefined) delete process.env.SUPPORT_ACCESS_SECRET;
  else process.env.SUPPORT_ACCESS_SECRET = original;
});

describe("cookie de acesso de suporte", () => {
  it("volta o que foi assinado", () => {
    const c = claim();
    expect(readSupportCookie(signSupportCookie(c))).toEqual(c);
  });

  it("recusa assinatura adulterada", () => {
    // O ponto do HMAC: sem ele, dava para escrever um cookie à mão e entrar
    // em qualquer workspace com a faixa de suporte aparecendo normalmente.
    const cookie = signSupportCookie(claim());
    const [payload] = cookie.split(".");
    expect(readSupportCookie(`${payload}.assinaturaInventada`)).toBeNull();
  });

  it("recusa conteúdo trocado com assinatura antiga", () => {
    // Trocar o workspace no payload mantendo a assinatura é a tentativa
    // óbvia: entrar numa empresa e alegar que entrou em outra.
    const cookie = signSupportCookie(claim());
    const [, assinatura] = cookie.split(".");
    const outro = Buffer.from(
      JSON.stringify(
        claim({ workspaceId: "33333333-3333-3333-3333-333333333333" })
      )
    ).toString("base64url");
    expect(readSupportCookie(`${outro}.${assinatura}`)).toBeNull();
  });

  it("recusa cookie vencido", () => {
    const vencido = signSupportCookie(
      claim({ exp: Math.floor(Date.now() / 1000) - 1 })
    );
    expect(readSupportCookie(vencido)).toBeNull();
  });

  it("recusa cookie assinado com outro segredo", () => {
    // Trocar o segredo no deploy invalida as sessões abertas, que é o
    // comportamento certo: é assim que se corta acesso às pressas.
    const cookie = signSupportCookie(claim());
    process.env.SUPPORT_ACCESS_SECRET = "outro-segredo-com-tamanho-ok-2026";
    expect(readSupportCookie(cookie)).toBeNull();
  });

  it("sem segredo configurado, nada é aceito", () => {
    const cookie = signSupportCookie(claim());
    delete process.env.SUPPORT_ACCESS_SECRET;
    expect(supportConfigured()).toBe(false);
    expect(readSupportCookie(cookie)).toBeNull();
  });

  it("segredo curto não conta como configurado", () => {
    process.env.SUPPORT_ACCESS_SECRET = "curto";
    expect(supportConfigured()).toBe(false);
  });

  it("lixo não derruba a leitura", () => {
    for (const entrada of [undefined, "", "semponto", "a.b.c.d", "..", "x."]) {
      expect(readSupportCookie(entrada)).toBeNull();
    }
  });
});
