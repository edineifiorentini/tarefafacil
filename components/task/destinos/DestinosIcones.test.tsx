import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DestinosIcones } from "./DestinosIcones";

/**
 * A fileira de logos abaixo do nome. Cada caso é uma coisa que a linha da
 * Hoje, da Lista e do Quadro precisa poder confiar.
 */
describe("DestinosIcones", () => {
  it("sem destino, não desenha nada — a linha fica como sempre foi", () => {
    const vazio = render(<DestinosIcones destinos={[]} />);
    expect(vazio.container).toBeEmptyDOMElement();
    const nulo = render(<DestinosIcones destinos={null} />);
    expect(nulo.container).toBeEmptyDOMElement();
  });

  it("para leitor de tela é uma imagem só, com os nomes na ordem do catálogo", () => {
    render(<DestinosIcones destinos={["site", "facebook", "instagram"]} />);
    expect(
      screen.getByRole("img", { name: "Vai para: Instagram, Facebook, Site" })
    ).toBeInTheDocument();
  });

  it("com mais de cinco, mostra cinco e resume o resto", () => {
    const { container } = render(
      <DestinosIcones
        destinos={[
          "instagram",
          "facebook",
          "tiktok",
          "youtube",
          "whatsapp",
          "site",
          "radio",
        ]}
      />
    );
    expect(container.querySelectorAll("[title]")).toHaveLength(5);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("cada logo diz o nome da rede ao passar o mouse", () => {
    const { container } = render(<DestinosIcones destinos={["whatsapp"]} />);
    expect(container.querySelector("[title]")).toHaveAttribute(
      "title",
      "WhatsApp"
    );
  });

  /**
   * Destino que saiu do catálogo não pode quebrar a demanda antiga: ela
   * continua abrindo, só sem a logo que não existe mais.
   */
  it("ignora destino que não existe mais no catálogo", () => {
    render(<DestinosIcones destinos={["orkut", "tiktok"]} />);
    expect(
      screen.getByRole("img", { name: "Vai para: TikTok" })
    ).toBeInTheDocument();
  });

  /**
   * A fileira mora dentro de botões — o cartão do Quadro inteiro é um — e
   * `div` dentro de `button` é HTML inválido.
   */
  it("só usa span, porque mora dentro de botão", () => {
    const { container } = render(
      <DestinosIcones destinos={["instagram", "x", "impresso"]} />
    );
    expect(container.querySelector("div")).toBeNull();
  });

  /**
   * Duas logos do Instagram na mesma tela precisam de degradês com ids
   * diferentes; o mesmo id duas vezes é HTML inválido e o segundo desenho
   * pode sair sem cor.
   */
  it("cada Instagram desenhado tem degradê com id próprio", () => {
    const { container } = render(
      <>
        <DestinosIcones destinos={["instagram"]} />
        <DestinosIcones destinos={["instagram"]} />
      </>
    );
    const ids = [...container.querySelectorAll("radialGradient")].map(
      (g) => g.id
    );
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
  });
});
