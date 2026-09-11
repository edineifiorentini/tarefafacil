import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DueChip } from "./DueChip";

/**
 * O chip da Hoje e do Quadro. A marca de reprogramação é um ícone pequeno —
 * quem não o enxerga precisa receber a mesma informação por texto.
 */
describe("DueChip — reprogramação (0099)", () => {
  it("reprogramado ganha a marca, com o original e o motivo na dica e no texto", () => {
    const { container } = render(
      <DueChip
        date="2030-01-20"
        reprogramadoDe="2030-01-10"
        motivo="cliente_pediu_mudanca"
      />
    );
    expect(container.firstElementChild).toHaveAttribute(
      "title",
      "Prazo original: 10 jan · Cliente pediu mudança"
    );
    expect(
      screen.getByText(
        ", reprogramado — original 10 jan, Cliente pediu mudança"
      )
    ).toBeInTheDocument();
  });

  it("sem reprogramação, o chip continua o mesmo", () => {
    const { container } = render(<DueChip date="2030-01-20" />);
    expect(container.firstElementChild).not.toHaveAttribute("title");
    expect(screen.queryByText(/reprogramado/)).not.toBeInTheDocument();
  });
});
