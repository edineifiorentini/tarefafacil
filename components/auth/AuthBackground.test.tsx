import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthBackground } from "./AuthBackground";

/**
 * Quando a atmosfera animada entra, e quando não entra.
 *
 * As duas condições de saída são exatamente as que protegem quem não pode
 * ou não quer pagar por elas: movimento reduzido e tela pequena. Testar
 * isso no navegador é ruim — `prefers-reduced-motion` não se emula por
 * script, e o patch em `window.matchMedia` morre na primeira navegação
 * dura. Aqui a media query é injetada e a decisão fica provada.
 *
 * A camada estática é o piso: ela aparece em TODOS os casos, inclusive
 * quando o canvas entra por cima. É ela que garante que o painel nunca
 * fique liso enquanto o módulo carrega — ou se ele nunca carregar.
 */

function fingirMedia({
  reduzido,
  largo,
}: {
  reduzido: boolean;
  largo: boolean;
}) {
  window.matchMedia = vi.fn((consulta: string) => ({
    matches: /prefers-reduced-motion/.test(consulta) ? reduzido : largo,
    media: consulta,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AuthBackground", () => {
  it("com movimento reduzido, NÃO monta o canvas", async () => {
    fingirMedia({ reduzido: true, largo: true });
    const { container } = render(<AuthBackground />);
    // Espera o suficiente para um `lazy` resolver, se fosse resolver.
    await waitFor(() => {
      expect(container.querySelector("[aria-hidden]")).toBeTruthy();
    });
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("em tela estreita, NÃO monta o canvas", async () => {
    fingirMedia({ reduzido: false, largo: false });
    const { container } = render(<AuthBackground />);
    await waitFor(() => {
      expect(container.querySelector("[aria-hidden]")).toBeTruthy();
    });
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("em tela larga e sem restrição de movimento, monta o canvas", async () => {
    fingirMedia({ reduzido: false, largo: true });
    const { container } = render(<AuthBackground />);
    await waitFor(() => {
      expect(container.querySelector("canvas")).toBeTruthy();
    });
  });

  it("a atmosfera estática existe nos três casos", async () => {
    for (const caso of [
      { reduzido: true, largo: true },
      { reduzido: false, largo: false },
      { reduzido: false, largo: true },
    ]) {
      fingirMedia(caso);
      const { container, unmount } = render(<AuthBackground />);
      // A estática é o primeiro filho e não depende de nenhum `lazy`.
      expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe(
        "true"
      );
      unmount();
    }
  });
});
