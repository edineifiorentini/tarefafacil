import { describe, expect, it } from "vitest";

import {
  formatoDaRota,
  montarCsp,
  origemBarrada,
  reduzirViolacao,
} from "./csp";

const SUPA = "https://abcdefgh.supabase.co";

/**
 * O que estes casos protegem: a política precisa cobrir o que o app carrega
 * de verdade, e o aviso de violação NÃO pode virar depósito de token — o
 * endereço de uma página do TAFLOW tem segredo dentro.
 */

describe("montarCsp", () => {
  it("libera o Supabase nas quatro diretivas em que o navegador fala com ele", () => {
    const csp = montarCsp(SUPA);
    for (const diretiva of [
      "img-src",
      "media-src",
      "object-src",
      "connect-src",
    ]) {
      const linha = csp.split("; ").find((d) => d.startsWith(diretiva));
      expect(linha, `${diretiva} deveria existir`).toBeTruthy();
      expect(linha).toContain(SUPA);
    }
  });

  it("não libera fonte externa: a Inter é auto-hospedada", () => {
    const csp = montarCsp(SUPA);
    expect(csp).toContain("font-src 'self'");
    expect(csp).not.toContain("fonts.googleapis");
    expect(csp).not.toContain("fonts.gstatic");
  });

  it("aponta para a rota que recebe os avisos, nas duas formas", () => {
    const csp = montarCsp(SUPA);
    expect(csp).toContain("report-uri /api/csp");
    expect(csp).toContain("report-to csp");
  });

  /**
   * `frame-ancestors` e o X-Frame-Options viajam no mesmo response. Se um
   * dissesse 'none' e o outro SAMEORIGIN, a política contaria duas
   * histórias — e quem fosse ligar a CSP pra valer não saberia qual vale.
   */
  it("combina com o X-Frame-Options que já existe", () => {
    expect(montarCsp(SUPA)).toContain("frame-ancestors 'self'");
  });

  it("só pede 'unsafe-eval' em desenvolvimento", () => {
    expect(montarCsp(SUPA, true)).toContain("'unsafe-eval'");
    expect(montarCsp(SUPA, false)).not.toContain("'unsafe-eval'");
  });

  it("URL do Supabase ausente não quebra a política", () => {
    const csp = montarCsp("", false);
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain("undefined");
  });
});

describe("reduzirViolacao", () => {
  it("entende o formato do report-uri", () => {
    const r = reduzirViolacao({
      "csp-report": {
        "document-uri": "https://www.taflow.com.br/hoje",
        "effective-directive": "img-src",
        "blocked-uri": "https://cdn.estranho.com/rastreador.png?x=1",
      },
    });
    expect(r).toEqual({
      directive: "img-src",
      origem: "https://cdn.estranho.com",
      rota: "/hoje",
    });
  });

  it("entende o formato do report-to, que chega em lista", () => {
    const r = reduzirViolacao([
      {
        type: "csp-violation",
        body: {
          documentURL: "https://www.taflow.com.br/lista",
          effectiveDirective: "connect-src",
          blockedURL: "https://api.terceiro.com/coleta",
        },
      },
    ]);
    expect(r?.directive).toBe("connect-src");
    expect(r?.origem).toBe("https://api.terceiro.com");
  });

  it("aceita a diretiva com a lista de fontes junto, como alguns navegadores mandam", () => {
    const r = reduzirViolacao({
      "csp-report": {
        "violated-directive": "script-src 'self' 'unsafe-inline'",
        "blocked-uri": "inline",
        "document-uri": "https://www.taflow.com.br/",
      },
    });
    expect(r?.directive).toBe("script-src");
  });

  it("corpo que não é violação nenhuma devolve nulo", () => {
    expect(reduzirViolacao(null)).toBeNull();
    expect(reduzirViolacao("oi")).toBeNull();
    expect(reduzirViolacao({})).toBeNull();
    expect(reduzirViolacao([{ type: "deprecation", body: {} }])).toBeNull();
  });
});

describe("o aviso não guarda segredo", () => {
  /**
   * O caso que motivou a redução: a página do cliente é `/d/<token>`, e o
   * token É a credencial. Guardar o endereço como veio colocaria no banco
   * uma lista de links de acesso.
   */
  it("o token do link público não sobrevive à redução", () => {
    const token = "9f2c4b7a1e5d8c3f6b0a2d4e7c9f1b3a";
    const rota = formatoDaRota(`https://www.taflow.com.br/d/${token}`);
    expect(rota).toBe("/d/:id");
    expect(rota).not.toContain(token);
  });

  it("a assinatura da URL do storage não sobrevive", () => {
    const origem = origemBarrada(
      "https://abcdefgh.supabase.co/storage/v1/object/sign/attachments/a.pdf?token=eyJhbGciOiJIUzI1NiJ9.segredo"
    );
    expect(origem).toBe("https://abcdefgh.supabase.co");
    expect(origem).not.toContain("token");
  });

  it("uuid de demanda vira formato de rota", () => {
    expect(
      formatoDaRota(
        "https://www.taflow.com.br/tarefa/3f8a1c22-4b5d-4e6f-8a9b-0c1d2e3f4a5b"
      )
    ).toBe("/tarefa/:id");
  });

  it("rota sem identificador fica inteira: é o que se quer agrupar", () => {
    expect(formatoDaRota("https://www.taflow.com.br/relatorios")).toBe(
      "/relatorios"
    );
    expect(formatoDaRota("https://www.taflow.com.br/")).toBe("/");
  });

  it("'inline' e 'eval' passam como estão: é o que decide se precisa de nonce", () => {
    expect(origemBarrada("inline")).toBe("inline");
    expect(origemBarrada("eval")).toBe("eval");
    expect(origemBarrada("data:image/png;base64,AAAA")).toBe("data");
    expect(origemBarrada("")).toBe("desconhecida");
  });
});
