import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/lib/utils/contrast";

/**
 * O fundo sólido da marca continua legível em toda marca e todo tema.
 *
 * **Este arquivo existe por causa de um sino cinza.** Em 11/set/2026 o dono
 * reparou que o contador de notificações sumia no modo escuro. A medição
 * mostrou que não era só ele: seis lugares pintavam `--brand-600` com a
 * tinta do botão primário, e 10 das 16 combinações de marca e tema
 * reprovavam — a TAFLOW no escuro com 1.17:1. No claro, teal e verde também
 * ficavam abaixo de 4.5:1.
 *
 * O teste lê o `tokens.css` de verdade, resolve `var()` e mede com o mesmo
 * `contrastRatio` que o resto do projeto usa. Ele não fixa as cores: trocar
 * um degrau da rampa é livre, desde que as 16 combinações continuem
 * passando. É isso que o CLAUDE.md pede — "medir com lib/utils/contrast.ts,
 * não no olho" — transformado em algo que falha sozinho.
 */

const linhas = readFileSync(
  join(process.cwd(), "styles/tokens.css"),
  "utf8"
).split("\n");

type Bloco = Record<string, string>;

/** Lê as declarações de um bloco até o `}` de coluna zero. */
function bloco(seletor: string): Bloco {
  const inicio = linhas.findIndex((l) => l.trim() === `${seletor} {`);
  if (inicio < 0) throw new Error(`bloco não encontrado: ${seletor}`);
  const recuo = linhas[inicio].match(/^\s*/)?.[0] ?? "";
  const mapa: Bloco = {};
  for (
    let i = inicio + 1;
    i < linhas.length && linhas[i] !== `${recuo}}`;
    i++
  ) {
    const m = linhas[i].match(/^\s*--([a-z0-9-]+):\s*([^;]+);/);
    if (m) mapa[m[1]] = m[2].trim();
  }
  return mapa;
}

/** Segue `var(--x)` pelas fontes, em ordem, até chegar num hex. */
function resolver(nome: string, ...fontes: Bloco[]): string {
  let valor = fontes.map((f) => f[nome]).find(Boolean);
  for (let passo = 0; passo < 6 && valor?.startsWith("var("); passo++) {
    const proximo = valor.match(/var\(--([a-z0-9-]+)\)/)?.[1];
    valor = proximo ? fontes.map((f) => f[proximo]).find(Boolean) : undefined;
  }
  if (!valor?.startsWith("#")) {
    throw new Error(`--${nome} não resolveu para uma cor: ${valor}`);
  }
  return valor;
}

const raiz = bloco(":root");
const temaClaro = bloco('[data-theme="light"]');
const temaEscuro = bloco('[data-theme="dark"]');
const marcaClara = bloco("[data-brand]");
const marcaEscura = bloco('[data-theme="dark"] [data-brand]');
const espelhoEscuro = bloco(':root:not([data-theme="light"]) [data-brand]');

/** `azul` não tem bloco próprio: a rampa dele é a do `:root`. */
const MARCAS = [
  "azul",
  "indigo",
  "lilas",
  "teal",
  "verde",
  "magenta",
  "taflow",
  "grafite",
] as const;

function rampa(marca: (typeof MARCAS)[number]): Bloco {
  return marca === "azul" ? {} : bloco(`[data-brand="${marca}"]`);
}

const TEXTO_MIN = 4.5; // texto de 12px, WCAG AA
const FORMA_MIN = 3; // o selo como forma contra a página, WCAG 1.4.11

describe("fundo sólido da marca (--fill-brand-strong)", () => {
  const casos = MARCAS.flatMap((marca) =>
    (["claro", "escuro"] as const).map((tema) => ({ marca, tema }))
  );

  it.each(casos)(
    "$marca no $tema: texto legível e selo visível contra a página",
    ({ marca, tema }) => {
      const cores = rampa(marca);
      const alias = tema === "claro" ? marcaClara : marcaEscura;
      const fundoDaPagina =
        tema === "claro"
          ? resolver("surface-page", temaClaro, raiz)
          : resolver("surface-page", temaEscuro, raiz);

      const fundo = resolver("fill-brand-strong", alias, cores, raiz);
      const texto = resolver("fill-brand-strong-fg", alias, cores, raiz);

      expect(
        contrastRatio(texto, fundo),
        `${marca}/${tema}: ${texto} sobre ${fundo}`
      ).toBeGreaterThanOrEqual(TEXTO_MIN);
      expect(
        contrastRatio(fundo, fundoDaPagina),
        `${marca}/${tema}: selo ${fundo} sobre a página ${fundoDaPagina}`
      ).toBeGreaterThanOrEqual(FORMA_MIN);
    }
  );

  /**
   * Quem escolhe "sistema" no tema cai no bloco do `prefers-color-scheme`,
   * que é uma cópia escrita à mão do bloco escuro. Cópia que diverge é o
   * defeito clássico desse arranjo — o escuro explícito certo e o do
   * sistema errado.
   */
  it("o espelho do prefers-color-scheme diz o mesmo que o escuro explícito", () => {
    expect(espelhoEscuro["fill-brand-strong"]).toBe(
      marcaEscura["fill-brand-strong"]
    );
    expect(espelhoEscuro["fill-brand-strong-fg"]).toBe(
      marcaEscura["fill-brand-strong-fg"]
    );
  });

  it("sem data-brand, os temas também definem o par", () => {
    for (const [nome, tema] of [
      ["claro", temaClaro],
      ["escuro", temaEscuro],
    ] as const) {
      const fundo = resolver("fill-brand-strong", tema, raiz);
      const texto = resolver("fill-brand-strong-fg", tema, raiz);
      expect(contrastRatio(texto, fundo), nome).toBeGreaterThanOrEqual(
        TEXTO_MIN
      );
    }
  });
});
