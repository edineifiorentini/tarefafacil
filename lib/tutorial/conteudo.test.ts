import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PASSOS } from "./conteudo";

/**
 * O guia não pode mentir sobre onde as coisas ficam.
 *
 * **Este arquivo nasceu de um erro cometido ao escrever o próprio guia**, em
 * 10/set/2026: dois passos mandavam a pessoa para `/configuracoes`, e a rota
 * chama `/config`. Ninguém teria visto até um usuário novo clicar no link do
 * tutorial de boas-vindas e cair num 404 — que é a pior hora possível.
 *
 * É o risco inteiro de um tutorial escrito à mão: ele é uma segunda fonte de
 * verdade sobre a interface, e envelhece sozinho. Não dá para testar se o
 * TEXTO continua verdadeiro, mas dá para testar se o DESTINO existe — e é
 * justamente o destino que quebra sem avisar quando alguém renomeia uma
 * rota.
 */
describe("conteúdo do guia", () => {
  it("cada passo tem id próprio", () => {
    const ids = PASSOS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("nenhum passo é uma casca vazia", () => {
    for (const p of PASSOS) {
      expect(p.titulo.trim().length, p.id).toBeGreaterThan(0);
      expect(p.resumo.trim().length, p.id).toBeGreaterThan(0);
      expect(p.corpo.length, p.id).toBeGreaterThan(0);
      for (const paragrafo of p.corpo) {
        expect(paragrafo.trim().length, p.id).toBeGreaterThan(0);
      }
    }
  });

  it("todo destino aponta para uma rota que existe", () => {
    for (const p of PASSOS) {
      if (!p.destino) continue;
      const rota = p.destino.href.replace(/^\//, "");
      const pagina = join(process.cwd(), "app", "(app)", rota, "page.tsx");
      expect(
        existsSync(pagina),
        `${p.id} manda para ${p.destino.href}, que não tem página`
      ).toBe(true);
    }
  });

  /**
   * O guia é um convite, não um manual de referência. Passar de uma dúzia
   * de assuntos é o sinal de que ele começou a virar cópia da interface —
   * que é o que o dono decidiu NÃO fazer em 10/set/2026.
   */
  it("continua curto o bastante para ser lido", () => {
    expect(PASSOS.length).toBeLessThanOrEqual(12);
  });
});
