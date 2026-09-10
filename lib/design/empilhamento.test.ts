import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * A ordem de sobreposição, travada.
 *
 * **Isto não testa CSS por vaidade.** Em 10/set/2026 os campos de
 * prioridade, responsável, cliente e projeto da nova tarefa pararam de
 * funcionar — e a causa não estava em nenhum deles. O modal nasceu com
 * `z-85`, a camada de popover do app inteiro estava em `z-50`, e a lista
 * de opções passou a abrir ATRÁS do modal. Ela abria; ninguém via.
 *
 * Nenhum teste de unidade, tipo ou build pega isso: o DOM está correto, o
 * estado está correto, o componente está correto. O que estava errado era
 * a relação entre dois números escritos em arquivos diferentes por motivos
 * diferentes.
 *
 * O que este arquivo guarda é a RELAÇÃO, não os valores. Trocar 200 por 300
 * é livre; deixar o popover abaixo do modal, não.
 */

const tokens = readFileSync(join(process.cwd(), "styles/tokens.css"), "utf8");

function degrau(nome: string): number {
  const achado = tokens.match(new RegExp(`--${nome}:\\s*(-?\\d+)\\s*;`));
  if (!achado) throw new Error(`o degrau --${nome} não existe mais`);
  return Number(achado[1]);
}

describe("escada de empilhamento", () => {
  it("as superfícies sobem na ordem em que se sobrepõem", () => {
    const escada = [
      "z-conteudo",
      "z-grudado",
      "z-navegacao",
      "z-painel",
      "z-modal-fundo",
      "z-modal",
      "z-confirmacao-fundo",
      "z-confirmacao",
    ].map(degrau);

    for (let i = 1; i < escada.length; i++) {
      expect(escada[i]).toBeGreaterThan(escada[i - 1]);
    }
  });

  /**
   * A regra que o defeito de 10/set custou para aprender: popover é sempre
   * convocado por uma superfície, então tem de pintar acima de TODAS elas —
   * inclusive da confirmação, que já nasce por cima do modal.
   */
  it("popover fica acima de qualquer superfície", () => {
    const popover = degrau("z-popover");
    for (const superficie of ["z-painel", "z-modal", "z-confirmacao"]) {
      expect(popover).toBeGreaterThan(degrau(superficie));
    }
  });

  it("o aviso é a última palavra, acima até do popover", () => {
    expect(degrau("z-aviso")).toBeGreaterThan(degrau("z-popover"));
  });

  /**
   * A regra global que eleva os popovers vale para os 51 componentes de
   * uma vez. Sem ela, cada um volta a disputar com o modal pelo seu próprio
   * `z-50` — que é exatamente o estado em que o defeito aconteceu.
   */
  it("a regra que eleva os popovers do Radix continua no lugar", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(
      /\[data-radix-popper-content-wrapper\]\s*\{[^}]*z-index:\s*var\(--z-popover\)\s*!important/
    );
  });
});
