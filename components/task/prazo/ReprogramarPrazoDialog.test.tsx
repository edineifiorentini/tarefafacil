import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ReprogramarPrazoDialog,
  type TarefaParaReprogramar,
} from "./ReprogramarPrazoDialog";

const mutate = vi.fn();
vi.mock("@/lib/queries/useTasks", () => ({
  useReprogramarPrazo: () => ({ mutate, isPending: false }),
}));
vi.mock("@/lib/queries/useWorkspace", () => ({
  useWorkspace: () => ({ id: "w" }),
}));
vi.mock("@/lib/queries/useFuso", () => ({
  useFuso: () => "America/Sao_Paulo",
}));
const show = vi.fn();
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ show }) }));

/**
 * A janela é a única porta para mudar um prazo que já existe. Cada caso aqui
 * é uma forma de ela deixar passar uma mudança sem história: sem motivo, com
 * a mesma data, ou com o ano pela metade virando prazo.
 */

const CRACHA: TarefaParaReprogramar = {
  id: "t1",
  title: "Crachá Conselho Tutelar",
  due_date: "2026-09-09",
  prazo_original: "2026-09-09",
  completed_at: null,
  cancelled_at: null,
};

function abrir(p: Partial<Parameters<typeof ReprogramarPrazoDialog>[0]> = {}) {
  render(
    <ReprogramarPrazoDialog
      open
      onOpenChange={vi.fn()}
      tarefa={CRACHA}
      {...p}
    />
  );
}

const novaData = () => screen.getByLabelText("Novo prazo");
const confirmar = () =>
  screen.getByRole("button", { name: "Reprogramar prazo" });

beforeEach(() => {
  mutate.mockReset();
  show.mockReset();
});

describe("ReprogramarPrazoDialog", () => {
  it("sem motivo não reprograma, e diz o que falta", async () => {
    abrir();
    fireEvent.change(novaData(), { target: { value: "2026-09-18" } });
    await userEvent.click(confirmar());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Escolha o motivo da reprogramação."
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("a mesma data não é reprogramação", async () => {
    abrir();
    await userEvent.click(
      screen.getByRole("radio", { name: "Cliente pediu mudança" })
    );
    await userEvent.click(confirmar());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "O novo prazo é igual ao atual. Escolha outra data."
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("ano pela metade não vira prazo", async () => {
    abrir();
    fireEvent.change(novaData(), { target: { value: "0202-09-18" } });
    await userEvent.click(screen.getByRole("radio", { name: "Outro" }));
    await userEvent.click(confirmar());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Confira o ano do novo prazo."
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("com data e motivo, manda o motivo e a observação junto com a data", async () => {
    abrir();
    fireEvent.change(novaData(), { target: { value: "2026-09-18" } });
    await userEvent.click(
      screen.getByRole("radio", { name: "Aguardando retorno do cliente" })
    );
    await userEvent.type(
      screen.getByLabelText(/Observação/),
      "Combinado pelo WhatsApp"
    );
    await userEvent.click(confirmar());
    expect(mutate).toHaveBeenCalledWith(
      {
        id: "t1",
        prazo: "2026-09-18",
        motivo: "aguardando_cliente",
        observacao: "Combinado pelo WhatsApp",
      },
      expect.anything()
    );
  });

  it("o Calendário chega com o dia em que a demanda foi solta", () => {
    abrir({ novaDataSugerida: "2026-09-22" });
    expect(novaData()).toHaveValue("2026-09-22");
  });

  it("apagar a data vira tirar o prazo — e também pede motivo", async () => {
    abrir();
    fireEvent.change(novaData(), { target: { value: "" } });
    await userEvent.click(
      screen.getByRole("button", { name: "Tirar o prazo" })
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Escolha o motivo da reprogramação."
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("deixa à vista que o prazo original continua guardado", () => {
    abrir({
      tarefa: {
        ...CRACHA,
        due_date: "2026-09-18",
        prazo_original: "2026-09-09",
      },
    });
    expect(
      screen.getByText(/O prazo original \(09\/09\/2026\) continua guardado/)
    ).toBeInTheDocument();
  });
});
