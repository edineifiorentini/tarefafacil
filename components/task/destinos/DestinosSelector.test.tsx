import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DestinosSelector } from "./DestinosSelector";

/**
 * O seletor de destinos, do jeito que o dono aprovou no protótipo: os seis
 * mais usados à vista, o resto em "Outros", escolha múltipla.
 */
describe("DestinosSelector", () => {
  it("mostra os seis mais usados e esconde o resto em Outros", () => {
    render(<DestinosSelector value={[]} onChange={() => {}} />);
    for (const nome of [
      "Instagram",
      "Facebook",
      "TikTok",
      "YouTube",
      "WhatsApp",
      "Site",
    ]) {
      expect(screen.getByRole("button", { name: nome })).toBeInTheDocument();
    }
    expect(
      screen.getByRole("button", { name: "Outros (10)" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "LinkedIn" })
    ).not.toBeInTheDocument();
  });

  it("marcar devolve os destinos na ordem do catálogo, não na dos cliques", async () => {
    const onChange = vi.fn();
    render(<DestinosSelector value={["site"]} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Instagram" }));
    expect(onChange).toHaveBeenCalledWith(["instagram", "site"]);
  });

  it("clicar num destino marcado tira ele da lista", async () => {
    const onChange = vi.fn();
    render(
      <DestinosSelector value={["instagram", "facebook"]} onChange={onChange} />
    );
    await userEvent.click(screen.getByRole("button", { name: "Instagram" }));
    expect(onChange).toHaveBeenCalledWith(["facebook"]);
  });

  it("o marcado aparece para leitor de tela, e não só na cor", () => {
    render(<DestinosSelector value={["youtube"]} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "YouTube" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "TikTok" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("Outros abre os grupos", async () => {
    render(<DestinosSelector value={[]} onChange={() => {}} />);
    const outros = screen.getByRole("button", { name: "Outros (10)" });
    await userEvent.click(outros);
    expect(outros).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("group", { name: "Mídia tradicional" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Release para imprensa" })
    ).toBeInTheDocument();
  });

  /**
   * Abrindo uma demanda que já vai para o LinkedIn, esconder o LinkedIn em
   * "Outros" faria parecer que ele não está escolhido.
   */
  it("com destino de Outros já escolhido, Outros começa aberto", () => {
    render(<DestinosSelector value={["linkedin"]} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "LinkedIn" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("sem título visível, o grupo continua com nome", () => {
    render(
      <DestinosSelector tituloVisivel={false} value={[]} onChange={() => {}} />
    );
    expect(
      screen.getByRole("group", { name: "Onde vai ser publicado" })
    ).toBeInTheDocument();
  });

  it("conta quantos estão escolhidos", () => {
    render(
      <DestinosSelector value={["instagram", "facebook"]} onChange={() => {}} />
    );
    expect(screen.getByText("2 escolhidos")).toBeInTheDocument();
  });

  /**
   * Os chips moram dentro do formulário de criação. Um botão sem `type`
   * enviaria o formulário a cada destino marcado, criando a tarefa pela
   * metade.
   */
  it("marcar destino não envia o formulário em volta", async () => {
    const enviar = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={enviar}>
        <DestinosSelector value={[]} onChange={() => {}} />
      </form>
    );
    await userEvent.click(screen.getByRole("button", { name: "TikTok" }));
    await userEvent.click(screen.getByRole("button", { name: "Outros (10)" }));
    expect(enviar).not.toHaveBeenCalled();
  });
});
