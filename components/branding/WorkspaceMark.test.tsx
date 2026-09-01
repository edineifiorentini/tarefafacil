import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WorkspaceMark } from "./WorkspaceMark";

/**
 * A regra de queda da marca (0080) e — principalmente — o defeito que ela
 * teve no primeiro dia.
 *
 * O componente é renderizado no servidor. O navegador começa a baixar a
 * imagem do HTML que chegou e pode falhar ANTES de o React hidratar. Quando
 * isso acontece o evento `error` dispara sem ninguém escutando, o `onError`
 * nunca roda, e a casca fica com uma imagem de 0×0 no lugar do nome da
 * empresa — o oposto do que a queda promete.
 *
 * Foi exatamente o que aconteceu em 31/ago/2026: a marca do produto ainda
 * não existia, respondia 404, e a barra lateral ficou sem identificação
 * nenhuma. Estes testes existem para isso não voltar.
 */

/** Finge uma imagem que já terminou de carregar com o resultado dado. */
function fingirCarregamento(largura: number) {
  Object.defineProperty(HTMLImageElement.prototype, "complete", {
    configurable: true,
    get: () => true,
  });
  Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
    configurable: true,
    get: () => largura,
  });
}

afterEach(() => {
  // Devolve o protótipo, senão um teste contamina o seguinte.
  for (const prop of ["complete", "naturalWidth"]) {
    Reflect.deleteProperty(HTMLImageElement.prototype, prop);
  }
});

const LOGO = "https://exemplo.invalid/logo.webp";

describe("WorkspaceMark — queda", () => {
  it("com logo da empresa, mostra a imagem e usa o nome como alt", () => {
    fingirCarregamento(200);
    render(<WorkspaceMark name="Padaria do Zé" logoUrl={LOGO} />);

    const img = screen.getByRole("img", { name: "Padaria do Zé" });
    expect(img.getAttribute("src")).toBe(LOGO);
  });

  it("sem logo e queda=nome, escreve o nome sem tentar imagem nenhuma", () => {
    fingirCarregamento(200);
    render(<WorkspaceMark name="Padaria do Zé" logoUrl={null} queda="nome" />);

    expect(screen.getByText("Padaria do Zé")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("sem logo e queda=marca, desenha a marca do TAFLOW", () => {
    fingirCarregamento(200);
    const { container } = render(
      <WorkspaceMark name="Padaria do Zé" logoUrl={null} />
    );

    // SVG em linha, não <img>: é o que permite a escrita trocar de cor com
    // o tema. Arquivo carregado por <img> é opaco ao CSS da página.
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();

    // A marca substitui o NOME na casca, então ela precisa dizer de quem é.
    expect(svg?.getAttribute("aria-label")).toBe("Padaria do Zé");
  });

  it("as cores da marca saem de token, não de hex no componente", () => {
    // Regra 1 do projeto. Hex solto aqui é o que faz o tema escuro
    // aparecer com a escrita preta sobre fundo preto.
    fingirCarregamento(200);
    const { container } = render(
      <WorkspaceMark name="Padaria do Zé" logoUrl={null} />
    );
    const html = container.innerHTML;
    expect(html).toContain("var(--marca-tinta)");
    expect(html).toContain("var(--marca-acento)");
    expect(html).not.toContain("#171717");
  });
});

describe("WorkspaceMark — a imagem que falhou antes da hidratação", () => {
  it("REGRESSÃO: logo da empresa que sumiu do bucket cai para a marca", () => {
    // `complete` verdadeiro com `naturalWidth` zero é a assinatura de uma
    // imagem que terminou falhando — o estado em que o componente chega
    // quando o 404 acontece antes de o React pendurar o onError.
    //
    // A queda para no SEGUNDO degrau agora: a marca do produto é SVG e não
    // tem como falhar. Antes ela seguia até o nome porque o arquivo também
    // podia dar 404.
    fingirCarregamento(0);
    const { container } = render(
      <WorkspaceMark name="Padaria do Zé" logoUrl={LOGO} />
    );

    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });

  it("REGRESSÃO: no contrato, a falha cai no NOME e nunca na nossa marca", () => {
    // Regra 12 do CLAUDE.md: documento jurídico de terceiro não leva a
    // marca do fornecedor de software, nem por acidente de fallback.
    fingirCarregamento(0);
    const { container } = render(
      <WorkspaceMark
        name="Padaria do Zé"
        logoUrl={LOGO}
        contexto="impressao"
        queda="nome"
      />
    );

    expect(screen.getByText("Padaria do Zé")).toBeTruthy();
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("REGRESSÃO: no seletor de empresas a falha também cai no nome", () => {
    // Três empresas sem logo mostrando a mesma marca seriam três linhas
    // idênticas, e o seletor existe para distingui-las.
    fingirCarregamento(0);
    const { container } = render(
      <WorkspaceMark
        name="Padaria do Zé"
        logoUrl={LOGO}
        contexto="menu"
        queda="nome"
      />
    );
    expect(screen.getByText("Padaria do Zé")).toBeTruthy();
    expect(container.querySelector("svg")).toBeNull();
  });
});
