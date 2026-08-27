import { describe, expect, it } from "vitest";

import {
  chaveDoCabecalho,
  gerarChave,
  hashConfere,
  hashDeChave,
  pareceChave,
  PREFIXO,
  prefixoDe,
} from "./key";

describe("gerarChave", () => {
  it("tem prefixo reconhecível e 256 bits de corpo", () => {
    const c = gerarChave();
    expect(c.valor.startsWith(PREFIXO)).toBe(true);
    // 32 bytes em base64url dão 43 caracteres.
    expect(c.valor).toHaveLength(PREFIXO.length + 43);
  });

  it("nunca repete", () => {
    const vistas = new Set<string>();
    for (let i = 0; i < 200; i++) vistas.add(gerarChave().valor);
    expect(vistas.size).toBe(200);
  });

  it("o hash devolvido é o hash do valor", () => {
    // Se estes dois divergissem, a chave entregue à pessoa nunca
    // autenticaria — e o erro só apareceria no primeiro uso real.
    const c = gerarChave();
    expect(c.hash).toBe(hashDeChave(c.valor));
  });

  it("o prefixo guardado é começo do valor, e curto", () => {
    const c = gerarChave();
    expect(c.valor.startsWith(c.prefixo)).toBe(true);
    expect(c.prefixo).toHaveLength(PREFIXO.length + 8);
    // O que sobra em segredo continua sendo o suficiente.
    expect(c.valor.length - c.prefixo.length).toBeGreaterThan(30);
  });

  it("passa por URL e cabeçalho sem escapar nada", () => {
    // base64url não tem "+", "/" nem "=" — o que evita a classe de bug em
    // que a chave funciona no teste e quebra ao ir num parâmetro.
    for (let i = 0; i < 50; i++) {
      const v = gerarChave().valor;
      expect(encodeURIComponent(v)).toBe(v);
    }
  });
});

describe("hashDeChave", () => {
  it("é determinístico", () => {
    // Precisa ser: a autenticação busca a linha pelo hash num índice.
    expect(hashDeChave("tf_abc")).toBe(hashDeChave("tf_abc"));
  });

  it("muda por completo com um caractere de diferença", () => {
    expect(hashDeChave("tf_abc")).not.toBe(hashDeChave("tf_abd"));
  });

  it("tem o tamanho de um SHA-256 em hex", () => {
    expect(hashDeChave("tf_abc")).toHaveLength(64);
  });
});

describe("pareceChave", () => {
  it("aceita chave gerada aqui", () => {
    expect(pareceChave(gerarChave().valor)).toBe(true);
  });

  it("recusa o que não é", () => {
    expect(pareceChave("")).toBe(false);
    expect(pareceChave("abc")).toBe(false);
    expect(pareceChave("tf_")).toBe(false);
    // Tamanho certo, prefixo errado.
    expect(pareceChave("xx_" + "a".repeat(43))).toBe(false);
    // Prefixo certo, tamanho errado.
    expect(pareceChave(PREFIXO + "a".repeat(10))).toBe(false);
    // Caractere fora do alfabeto base64url.
    expect(pareceChave(PREFIXO + "+".repeat(43))).toBe(false);
  });
});

describe("hashConfere", () => {
  it("aceita igual, recusa diferente", () => {
    const h = hashDeChave("tf_abc");
    expect(hashConfere(h, h)).toBe(true);
    expect(hashConfere(h, hashDeChave("tf_abd"))).toBe(false);
  });

  it("tamanhos diferentes não explodem", () => {
    // `timingSafeEqual` joga exceção com buffers desiguais; se vazasse, a
    // rota devolveria 500 em vez de 401.
    expect(() => hashConfere("a", "abc")).not.toThrow();
    expect(hashConfere("a", "abc")).toBe(false);
  });
});

describe("chaveDoCabecalho", () => {
  const chave = gerarChave().valor;

  it("aceita com Bearer", () => {
    expect(chaveDoCabecalho(`Bearer ${chave}`)).toBe(chave);
  });

  it("aceita sem Bearer", () => {
    // É a classe de chamado mais comum de API nova: alguém cola a chave
    // crua e recebe 401 sem explicação.
    expect(chaveDoCabecalho(chave)).toBe(chave);
  });

  it("ignora caixa do Bearer e espaço em volta", () => {
    expect(chaveDoCabecalho(`  bearer   ${chave}  `)).toBe(chave);
  });

  it("devolve null para lixo", () => {
    expect(chaveDoCabecalho(null)).toBeNull();
    expect(chaveDoCabecalho("")).toBeNull();
    expect(chaveDoCabecalho("Bearer ")).toBeNull();
    expect(chaveDoCabecalho("Basic dXNlcjpwYXNz")).toBeNull();
  });
});

describe("prefixoDe", () => {
  it("não vaza mais do que o combinado", () => {
    const v = gerarChave().valor;
    expect(prefixoDe(v)).toBe(v.slice(0, PREFIXO.length + 8));
  });
});
