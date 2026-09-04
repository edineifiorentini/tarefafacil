import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Task } from "@/types/database";

import { TaskListRow } from "./TaskListRow";

/**
 * A linha é onde as duas confusões da tela antiga viviam: a caixa de
 * seleção ao lado da bolinha de concluir, e o prazo vermelho numa demanda
 * já entregue. Estes testes prendem as duas correções.
 */

const OBRAS = { id: "s-obras", name: "Obras", color: "#2563EB" };

function tarefa(p: Partial<Task>): Task {
  return {
    id: "t1",
    workspace_id: "w",
    sector_id: OBRAS.id,
    assignee_id: null,
    client_id: null,
    column_id: null,
    due_date: null,
    due_time: null,
    priority: "media",
    completed_at: null,
    cancelled_at: null,
    created_at: "2026-09-01T09:00:00-03:00",
    updated_at: "2026-09-01T09:00:00-03:00",
    title: "Criar convite para autoridades",
    ...p,
  } as unknown as Task;
}

function montar(over: Partial<Parameters<typeof TaskListRow>[0]> = {}) {
  const props = {
    task: tarefa({}),
    sector: OBRAS as never,
    coluna: "Em produção",
    responsavel: null,
    secundaria: null,
    membros: [{ id: "u1", nome: "Ana" }],
    modoSelecao: false,
    selecionada: false,
    denso: false,
    onSelectChange: vi.fn(),
    onToggle: vi.fn(),
    onToggleCancel: vi.fn(),
    onDelete: vi.fn(),
    onOpen: vi.fn(),
    onAtribuir: vi.fn(),
    onEditarPrazo: vi.fn(),
    ...over,
  };
  render(<TaskListRow {...props} />);
  return props;
}

describe("conclusão e seleção são controles diferentes", () => {
  it("fora do modo de seleção existe SÓ o controle de concluir", () => {
    montar();
    expect(
      screen.getByRole("checkbox", {
        name: "Marcar Criar convite para autoridades como concluída",
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /^Selecionar:/ })
    ).not.toBeInTheDocument();
  });

  it("no modo de seleção a caixa TOMA o lugar da bolinha, não soma a ela", () => {
    // O defeito antigo: dois alvos no mesmo canto, e quem queria concluir
    // acabava selecionando.
    montar({ modoSelecao: true });
    expect(
      screen.getByRole("checkbox", {
        name: "Selecionar: Criar convite para autoridades",
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /como concluída/ })
    ).not.toBeInTheDocument();
  });

  it("concluir avisa quem conclui, e não quem seleciona", async () => {
    const props = montar();
    await userEvent.click(
      screen.getByRole("checkbox", { name: /como concluída/ })
    );
    expect(props.onToggle).toHaveBeenCalledWith(true);
    expect(props.onSelectChange).not.toHaveBeenCalled();
  });

  it("cancelada não deixa concluir", () => {
    montar({ task: tarefa({ cancelled_at: "2026-09-02T10:00:00-03:00" }) });
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});

describe("o que a linha diz sobre o prazo", () => {
  it("aberta e vencida aparece como atraso", () => {
    montar({ task: tarefa({ due_date: "2020-01-01" }) });
    expect(screen.getByText(/Atrasada há/)).toBeInTheDocument();
  });

  it("CONCLUÍDA fora do prazo não aparece como atrasada", () => {
    montar({
      task: tarefa({
        due_date: "2026-09-01",
        completed_at: "2026-09-05T10:00:00-03:00",
      }),
    });
    expect(screen.queryByText(/Atrasada há/)).not.toBeInTheDocument();
    expect(
      screen.getByText("Concluída com 4 dias de atraso")
    ).toBeInTheDocument();
  });

  it("sem prazo diz sem prazo, em vez de deixar a célula vazia", () => {
    montar();
    expect(screen.getByText("Sem prazo")).toBeInTheDocument();
  });
});

describe("status, setor e responsável", () => {
  it("mostra a coluna do quadro como status", () => {
    montar();
    expect(screen.getByText("Em produção")).toBeInTheDocument();
  });

  it("concluída ganha o chip de concluída, não o nome da coluna", () => {
    montar({ task: tarefa({ completed_at: "2026-09-02T10:00:00-03:00" }) });
    // O chip de status.
    expect(
      screen.getByText("Concluída", { selector: "span" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Em produção")).not.toBeInTheDocument();
  });

  it("sem prazo, a célula de prazo diz QUANDO saiu — não repete 'Concluída'", () => {
    // As duas células diriam a mesma palavra, e a de prazo é a única que
    // pode dizer a data.
    montar({ task: tarefa({ completed_at: "2026-09-02T10:00:00-03:00" }) });
    // `getAllBy` porque a data aparece duas vezes de propósito: curta na
    // célula e por extenso no texto que só o leitor de tela alcança.
    expect(screen.getAllByText(/Concluída em/).length).toBeGreaterThan(0);
    expect(screen.getByText("Concluída em 2 set")).toBeInTheDocument();
  });

  it("o setor tem NOME, não só a bolinha colorida", () => {
    // Doze setores distinguidos só por cor é o mesmo que nenhum, para quem
    // não distingue as cores.
    montar();
    expect(screen.getByText("Obras")).toBeInTheDocument();
  });

  it("sem responsável oferece atribuir ali mesmo", async () => {
    const props = montar();
    await userEvent.click(
      screen.getByRole("button", { name: "Atribuir responsável" })
    );
    await userEvent.click(screen.getByRole("menuitem", { name: /Ana/ }));
    expect(props.onAtribuir).toHaveBeenCalledWith("u1");
  });

  it("demanda encerrada não oferece atribuir", () => {
    montar({ task: tarefa({ completed_at: "2026-09-02T10:00:00-03:00" }) });
    expect(
      screen.queryByRole("button", { name: "Atribuir responsável" })
    ).not.toBeInTheDocument();
    expect(screen.getByText("Sem responsável")).toBeInTheDocument();
  });
});

describe("abrir a demanda", () => {
  it("o título abre o detalhe", async () => {
    const props = montar();
    await userEvent.click(
      screen.getByRole("button", { name: "Criar convite para autoridades" })
    );
    expect(props.onOpen).toHaveBeenCalled();
  });

  it("o menu de ações não abre o detalhe junto", async () => {
    const props = montar();
    await userEvent.click(
      screen.getByRole("button", {
        name: "Ações de Criar convite para autoridades",
      })
    );
    expect(props.onOpen).not.toHaveBeenCalled();
  });
});
