import { describe, expect, it } from "vitest";

import { ehIpInterno, verificarDestino } from "./ssrf";

/**
 * Cada caso aqui é um caminho por onde já saiu segredo de alguém. Se algum
 * destes testes começar a falhar, o webhook virou sonda para dentro da nossa
 * infraestrutura.
 */
describe("ehIpInterno", () => {
  it("barra os metadados da nuvem", () => {
    // O endereço mais explorado da lista: responde credencial da instância
    // para quem perguntar de dentro.
    expect(ehIpInterno("169.254.169.254")).toBe(true);
  });

  it("barra laço local e faixas privadas", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "0.0.0.0",
      "100.64.0.1",
    ]) {
      expect(ehIpInterno(ip), ip).toBe(true);
    }
  });

  it("deixa passar IP público", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "192.169.0.1"]) {
      expect(ehIpInterno(ip), ip).toBe(false);
    }
  });

  it("barra IPv6 interno", () => {
    for (const ip of ["::1", "::", "fd00::1", "fe80::1"]) {
      expect(ehIpInterno(ip), ip).toBe(true);
    }
  });

  it("barra IPv4 disfarçado de IPv6", () => {
    // O desvio clássico de lista que só olha IPv4.
    expect(ehIpInterno("::ffff:127.0.0.1")).toBe(true);
    expect(ehIpInterno("::FFFF:169.254.169.254")).toBe(true);
    expect(ehIpInterno("::ffff:8.8.8.8")).toBe(false);
  });

  it("o que não é IP conta como suspeito", () => {
    expect(ehIpInterno("abc")).toBe(true);
    expect(ehIpInterno("")).toBe(true);
  });
});

describe("verificarDestino", () => {
  it("recusa http em claro", async () => {
    const r = await verificarDestino("http://exemplo.com/hook");
    expect(r).toMatchObject({ ok: false });
  });

  it("recusa localhost sem consultar DNS", async () => {
    expect(await verificarDestino("https://localhost/hook")).toMatchObject({
      ok: false,
    });
    expect(await verificarDestino("https://api.localhost/x")).toMatchObject({
      ok: false,
    });
  });

  it("recusa IP interno escrito direto", async () => {
    expect(
      await verificarDestino("https://169.254.169.254/latest/meta-data/")
    ).toMatchObject({ ok: false });
    expect(await verificarDestino("https://127.0.0.1:8080/x")).toMatchObject({
      ok: false,
    });
    expect(await verificarDestino("https://[::1]/x")).toMatchObject({
      ok: false,
    });
  });

  it("recusa credencial embutida na URL", async () => {
    // Some no log de alguém mais cedo ou mais tarde.
    const r = await verificarDestino("https://u:p@8.8.8.8/hook");
    expect(r).toMatchObject({ ok: false });
  });

  it("recusa lixo", async () => {
    expect(await verificarDestino("")).toMatchObject({ ok: false });
    expect(await verificarDestino("não é url")).toMatchObject({ ok: false });
    expect(await verificarDestino("ftp://exemplo.com")).toMatchObject({
      ok: false,
    });
  });

  it("aceita IP público escrito direto", async () => {
    const r = await verificarDestino("https://8.8.8.8/hook");
    expect(r.ok).toBe(true);
  });
});
