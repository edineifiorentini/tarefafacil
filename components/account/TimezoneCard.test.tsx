import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FusoProvider } from "@/lib/queries/useFuso";

import { TimezoneCard } from "./TimezoneCard";

/**
 * O que este cartão não pode fazer: trocar o fuso de alguém sem que a
 * pessoa peça, ou salvar e deixar a tela calculando pelo valor antigo.
 */

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const show = vi.fn();
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ show }) }));

// O "aparelho" é controlado pelo teste, e não pelo fuso do processo.
// Sem isto, estes casos passariam na minha máquina e falhariam sob
// TZ=UTC — que é exatamente a classe de defeito que este cartão combate.
const aparelho = vi.hoisted(() => ({ atual: "America/Sao_Paulo" }));
vi.mock("@/lib/dates/fusos", async (real) => ({
  ...(await real<typeof import("@/lib/dates/fusos")>()),
  fusoDoAparelho: () => aparelho.atual,
}));

const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: () => ({ update }),
  }),
}));

function montar(salvo: string) {
  return render(
    <FusoProvider fuso={salvo}>
      <TimezoneCard />
    </FusoProvider>
  );
}

beforeEach(() => {
  refresh.mockClear();
  show.mockClear();
  update.mockClear();
});

describe("cartão de fuso horário", () => {
  it("abre no fuso que está salvo, não no do aparelho", () => {
    // A preferência salva é a fonte da verdade. O aparelho entra como
    // atalho, e só quando a pessoa clica.
    montar("America/Manaus");
    expect(screen.getByLabelText("Seu fuso").textContent).toContain("Manaus");
  });

  it("não deixa salvar antes de mudar nada", () => {
    montar("America/Sao_Paulo");
    expect(screen.getByRole("button", { name: /Salvar fuso/ })).toBeDisabled();
  });

  it("mostra o deslocamento do fuso escolhido", () => {
    montar("America/Rio_Branco");
    expect(screen.getByText(/UTC-05:00/)).toBeInTheDocument();
  });

  it("oferece o do aparelho só quando ele diverge", () => {
    // Atalho que não muda nada é ruído.
    aparelho.atual = "America/Sao_Paulo";
    montar("America/Sao_Paulo");
    expect(screen.queryByText(/Este aparelho está em/)).not.toBeInTheDocument();
  });

  it("com fuso salvo diferente do aparelho, oferece a troca", () => {
    aparelho.atual = "America/Sao_Paulo";
    montar("America/Manaus");
    expect(screen.getByText(/Este aparelho está em/)).toBeInTheDocument();
  });

  it("salvar grava e manda a tela recalcular", async () => {
    aparelho.atual = "America/Sao_Paulo";
    montar("America/Manaus");
    // O atalho do aparelho é o caminho mais curto para mudar a escolha.
    await userEvent.click(screen.getByText(/Este aparelho está em/));
    await userEvent.click(screen.getByRole("button", { name: /Salvar fuso/ }));

    expect(update).toHaveBeenCalledWith({ timezone: "America/Sao_Paulo" });
    // Sem o refresh, "hoje" continuaria sendo calculado pelo fuso antigo:
    // o provider é semeado pelo servidor, não por consulta do cliente.
    expect(refresh).toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith({ message: "Fuso horário atualizado" });
  });

  it("dá para desistir da mudança", async () => {
    aparelho.atual = "America/Sao_Paulo";
    montar("America/Manaus");
    await userEvent.click(screen.getByText(/Este aparelho está em/));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByLabelText("Seu fuso").textContent).toContain("Manaus");
    expect(update).not.toHaveBeenCalled();
  });
});
