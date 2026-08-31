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

  it("sem logo e queda=marca, tenta a marca do produto", () => {
    fingirCarregamento(200);
    const { container } = render(
      <WorkspaceMark name="Padaria do Zé" logoUrl={null} />
    );

    // Consulta pelo DOM, e não por papel: a marca do produto entra com
    // `alt=""` de propósito. Ela é decorativa — não diz em qual empresa a
    // pessoa está, e quem faz isso é o nome escondido para leitor de tela.
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toContain("/marca/");
    expect(img?.getAttribute("alt")).toBe("");

    // O nome continua disponível para quem usa leitor de tela.
    expect(screen.getByText("Padaria do Zé")).toBeTruthy();
  });
});

describe("WorkspaceMark — a imagem que falhou antes da hidratação", () => {
  it("REGRESSÃO: marca do produto com 404 cai no nome, não em 0x0", () => {
    // `complete` verdadeiro com `naturalWidth` zero é a assinatura de uma
    // imagem que terminou falhando. É o estado em que o componente chega
    // quando o 404 acontece antes de o React pendurar o onError.
    fingirCarregamento(0);
    render(<WorkspaceMark name="Padaria do Zé" logoUrl={null} />);

    expect(screen.getByText("Padaria do Zé")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("REGRESSÃO: logo da empresa que sumiu do bucket também cai no nome", () => {
    // Mesmo defeito, outra origem: o arquivo foi removido do storage e a
    // URL guardada em `workspace.logo_url` responde 404.
    fingirCarregamento(0);
    render(<WorkspaceMark name="Padaria do Zé" logoUrl={LOGO} />);

    expect(screen.getByText("Padaria do Zé")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("no contrato, a falha cai no nome e nunca na marca do produto", () => {
    // A regra 12 do CLAUDE.md: documento jurídico de terceiro não leva a
    // marca do fornecedor de software, nem por acidente de fallback.
    fingirCarregamento(0);
    render(
      <WorkspaceMark
        name="Padaria do Zé"
        logoUrl={LOGO}
        contexto="impressao"
        queda="nome"
      />
    );

    expect(screen.getByText("Padaria do Zé")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
