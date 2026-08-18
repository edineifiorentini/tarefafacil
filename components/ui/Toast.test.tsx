import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider, useToast } from "./Toast";

/**
 * Cobre o que foi pedido para o aviso de tarefa criada: aparecer, sumir
 * sozinho, poder ser fechado na mão e levar a algum lugar ao ser clicado.
 */
function Disparar({
  onAction,
  duration,
}: {
  onAction?: () => void;
  duration?: number;
}) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        toast.show({
          message: "Tarefa criada em Obras",
          actionLabel: onAction ? "Ver tarefa" : undefined,
          onAction,
          duration,
        })
      }
    >
      criar
    </button>
  );
}

function montar(props: Parameters<typeof Disparar>[0] = {}) {
  render(
    <ToastProvider>
      <Disparar {...props} />
    </ToastProvider>
  );
  fireEvent.click(screen.getByText("criar"));
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("Toast", () => {
  it("aparece com a mensagem", () => {
    montar();
    expect(screen.getByText("Tarefa criada em Obras")).toBeInTheDocument();
  });

  it("some sozinho depois do tempo", () => {
    montar({ duration: 3000 });
    act(() => void vi.advanceTimersByTime(2999));
    expect(screen.queryByText("Tarefa criada em Obras")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(2));
    expect(screen.queryByText("Tarefa criada em Obras")).not.toBeInTheDocument();
  });

  it("fecha na mão antes do tempo", () => {
    montar({ duration: 9000 });
    fireEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));
    expect(screen.queryByText("Tarefa criada em Obras")).not.toBeInTheDocument();
  });

  it("clicar na superfície dispara a ação e fecha", () => {
    const acao = vi.fn();
    montar({ onAction: acao, duration: 9000 });
    // Não é o rótulo "Ver tarefa" que é clicável, e sim o aviso inteiro.
    fireEvent.click(screen.getByText("Tarefa criada em Obras"));
    expect(acao).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Tarefa criada em Obras")).not.toBeInTheDocument();
  });

  it("com o ponteiro em cima não some — ler não é corrida contra o relógio", () => {
    montar({ duration: 3000 });
    const aviso = screen.getByRole("status");
    fireEvent.mouseEnter(aviso);
    act(() => void vi.advanceTimersByTime(10_000));
    expect(screen.getByText("Tarefa criada em Obras")).toBeInTheDocument();
  });

  it("ao tirar o ponteiro, o tempo recomeça", () => {
    montar({ duration: 3000 });
    const aviso = screen.getByRole("status");
    fireEvent.mouseEnter(aviso);
    act(() => void vi.advanceTimersByTime(10_000));
    fireEvent.mouseLeave(aviso);
    act(() => void vi.advanceTimersByTime(3001));
    expect(screen.queryByText("Tarefa criada em Obras")).not.toBeInTheDocument();
  });

  it("sem ação, o aviso não vira botão", () => {
    montar({ duration: 9000 });
    // Só o "Fechar aviso" — nada de alvo clicável enganoso.
    expect(screen.getAllByRole("button")).toHaveLength(2); // "criar" + fechar
  });
});
