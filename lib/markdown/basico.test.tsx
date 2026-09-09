import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { MarkdownBasico } from "./basico";

/**
 * O que este renderizador NÃO pode deixar passar.
 *
 * A descrição de uma demanda vai para a página pública do cliente, aberta
 * sem login. Os casos de escape são a razão de ele devolver árvore React em
 * vez de string de HTML — e são os primeiros aqui.
 */

describe("nada vira HTML", () => {
  it("tag digitada aparece escrita, não executada", () => {
    const { container } = render(
      <MarkdownBasico texto={"<script>alert(1)</script>"} />
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });

  it("`<img onerror>` também é só texto", () => {
    const { container } = render(
      <MarkdownBasico texto={'<img src=x onerror="alert(1)">'} />
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("onerror");
  });

  it("link `javascript:` NÃO vira link", () => {
    // O caso clássico: a sintaxe é de link, o esquema é executável.
    const { container } = render(
      <MarkdownBasico texto={"[clique](javascript:alert(1))"} />
    );
    expect(container.querySelector("a")).toBeNull();
    // E o texto não some: esconder o que a pessoa escreveu é pior que não
    // linkar.
    expect(container.textContent).toContain("clique");
  });

  it("link `data:` também não", () => {
    const { container } = render(
      <MarkdownBasico texto={"[x](data:text/html,<script>1</script>)"} />
    );
    expect(container.querySelector("a")).toBeNull();
  });

  it("http e https viram link, com rel de segurança", () => {
    render(<MarkdownBasico texto={"[TAFLOW](https://taflow.com.br)"} />);
    const a = screen.getByRole("link", { name: "TAFLOW" });
    expect(a).toHaveAttribute("href", "https://taflow.com.br");
    expect(a).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("o subconjunto que a barra de botões oferece", () => {
  it("negrito e itálico", () => {
    const { container } = render(
      <MarkdownBasico texto={"um **forte** e um *torto*"} />
    );
    expect(container.querySelector("strong")?.textContent).toBe("forte");
    expect(container.querySelector("em")?.textContent).toBe("torto");
  });

  it("títulos", () => {
    const { container } = render(<MarkdownBasico texto={"## Briefing"} />);
    expect(container.querySelector("h4")?.textContent).toBe("Briefing");
  });

  it("lista com marcador", () => {
    const { container } = render(
      <MarkdownBasico texto={"- um\n- dois\n- três"} />
    );
    expect(container.querySelectorAll("ul li")).toHaveLength(3);
  });

  it("lista numerada é outro bloco", () => {
    // Trocar de tipo no meio não pode juntar as duas numa lista só.
    const { container } = render(<MarkdownBasico texto={"- a\n1. b"} />);
    expect(container.querySelectorAll("ul")).toHaveLength(1);
    expect(container.querySelectorAll("ol")).toHaveLength(1);
  });

  it("citação", () => {
    const { container } = render(
      <MarkdownBasico texto={"> o cliente pediu assim"} />
    );
    expect(container.querySelector("blockquote")?.textContent).toContain(
      "o cliente pediu assim"
    );
  });
});

describe("texto sem marcação nenhuma continua valendo", () => {
  it("descrição antiga é um parágrafo", () => {
    // Nada migra: o banco guarda texto, e o que já estava lá não tem
    // marcação. Precisa continuar legível exatamente como foi escrito.
    const { container } = render(
      <MarkdownBasico texto={"Fazer o banner do evento até sexta."} />
    );
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(container.textContent).toBe("Fazer o banner do evento até sexta.");
  });

  it("Enter vira quebra de linha, não parágrafo novo", () => {
    // Quem escreve descrição aperta Enter esperando ver a quebra. A regra
    // do Markdown de verdade (duas quebras) surpreenderia.
    const { container } = render(
      <MarkdownBasico texto={"linha um\nlinha dois"} />
    );
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(container.querySelectorAll("br")).toHaveLength(1);
  });

  it("linha em branco separa parágrafos", () => {
    const { container } = render(<MarkdownBasico texto={"um\n\ndois"} />);
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("vazio não desenha nada", () => {
    const { container } = render(<MarkdownBasico texto={"   "} />);
    expect(container.firstChild).toBeNull();
  });
});
