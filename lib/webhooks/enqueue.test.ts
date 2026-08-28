import { describe, expect, it } from "vitest";

import { alvosDaEntrega, type InscricaoAlvo } from "./enqueue";

/**
 * A regra do dono, de 27/ago/2026: o eco sai para os outros, NÃO volta para
 * quem causou.
 *
 * Cada caso aqui é uma forma de errar isso. Suprimir demais quebra o contrato
 * — quem assina `demanda.criada` quer saber que uma demanda foi criada, não
 * importa por quem. Suprimir de menos devolve o evento para a integração que
 * o causou, e o laço se fecha sozinho.
 */

const integracaoA: InscricaoAlvo = { id: "insc-a", api_key_id: "chave-a" };
const integracaoB: InscricaoAlvo = { id: "insc-b", api_key_id: "chave-b" };
const soEscuta: InscricaoAlvo = { id: "insc-c", api_key_id: null };

const todas = [integracaoA, integracaoB, soEscuta];

describe("alvosDaEntrega", () => {
  it("ação de gente vai para todo mundo", () => {
    // O caminho comum: alguém moveu um cartão no quadro. Não há origem, e
    // ninguém é pulado.
    expect(alvosDaEntrega(todas, null)).toEqual(todas);
    expect(alvosDaEntrega(todas, undefined)).toEqual(todas);
  });

  it("a integração que causou não recebe de volta", () => {
    const r = alvosDaEntrega(todas, "chave-a");
    expect(r.map((x) => x.id)).toEqual(["insc-b", "insc-c"]);
  });

  it("as OUTRAS continuam recebendo", () => {
    // O eco é desejado — só não para a origem. Suprimir para todos tornaria
    // o catálogo inconfiável.
    const r = alvosDaEntrega(todas, "chave-a");
    expect(r).toContain(integracaoB);
    expect(r).toContain(soEscuta);
  });

  it("inscrição sem chave declarada recebe sempre", () => {
    // Ela não tem eco para evitar: ninguém age em nome dela.
    expect(alvosDaEntrega([soEscuta], "chave-a")).toEqual([soEscuta]);
    expect(alvosDaEntrega([soEscuta], "chave-b")).toEqual([soEscuta]);
  });

  it("chave sem inscrição correspondente não suprime nada", () => {
    // Uma integração que usa a API e não cadastrou destino: não há o que
    // pular, e as outras recebem normalmente.
    expect(alvosDaEntrega(todas, "chave-que-nao-tem-destino")).toEqual(todas);
  });

  it("com uma inscrição só, e ela é a origem, ninguém recebe", () => {
    // Correto: o único interessado é quem causou. Enfileirar para ele seria
    // exatamente o laço que a regra evita.
    expect(alvosDaEntrega([integracaoA], "chave-a")).toEqual([]);
  });

  it("não altera a lista recebida", () => {
    const copia = [...todas];
    alvosDaEntrega(todas, "chave-a");
    expect(todas).toEqual(copia);
  });
});
