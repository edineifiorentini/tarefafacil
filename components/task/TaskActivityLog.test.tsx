import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TaskActivity } from "@/types/database";

import { TaskActivityLog } from "./TaskActivityLog";

const historico = vi.hoisted(() => ({ linhas: [] as TaskActivity[] }));
vi.mock("@/lib/queries/useTaskActivity", () => ({
  useTaskActivity: () => ({ data: historico.linhas }),
}));
vi.mock("@/lib/queries/useWorkspace", () => ({
  useWorkspace: () => ({ id: "w" }),
}));
vi.mock("@/lib/queries/useMembers", () => ({
  useMembers: () => ({
    data: [{ user_id: "u1", display_name: "Edinei F.", email: "e@exemplo" }],
  }),
}));
vi.mock("@/lib/queries/useBoardColumns", () => ({
  useBoardColumns: () => ({ data: [] }),
}));

/**
 * A aba Atividade é onde a história do prazo fica (0099). Ela precisa
 * separar três coisas que antes eram a mesma frase: definir o primeiro
 * prazo, reprogramar com motivo, e mudar antes de o motivo existir.
 */

function linha(p: Partial<TaskActivity>): TaskActivity {
  return {
    id: Math.random().toString(36).slice(2),
    workspace_id: "w",
    task_id: "t1",
    changed_by: "u1",
    field: "due_date",
    old_value: null,
    new_value: null,
    motivo: null,
    observacao: null,
    created_at: new Date().toISOString(),
    ...p,
  };
}

function mostrar(...linhas: TaskActivity[]) {
  historico.linhas = linhas;
  render(<TaskActivityLog taskId="t1" sectorId="s1" />);
}

describe("TaskActivityLog — prazo", () => {
  it("reprogramação mostra o motivo e a observação", () => {
    mostrar(
      linha({
        old_value: "2026-09-09",
        new_value: "2026-09-18",
        motivo: "aguardando_cliente",
        observacao: "Combinado pelo WhatsApp",
      })
    );
    expect(
      screen.getByText(/reprogramou o prazo de 09\/09\/2026 para 18\/09\/2026/)
    ).toBeInTheDocument();
    expect(
      screen.getByText("Aguardando retorno do cliente")
    ).toBeInTheDocument();
    expect(screen.getByText("Combinado pelo WhatsApp")).toBeInTheDocument();
  });

  it("o primeiro prazo é definido, não reprogramado", () => {
    mostrar(linha({ new_value: "2026-09-09" }));
    expect(
      screen.getByText(/definiu o prazo para 09\/09\/2026/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/reprogramou/)).not.toBeInTheDocument();
  });

  it("mudança anterior à 0099 não ganha um motivo inventado", () => {
    mostrar(linha({ old_value: "2026-08-01", new_value: "2026-08-05" }));
    expect(
      screen.getByText(/mudou o prazo de 01\/08\/2026 para 05\/08\/2026/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Motivo não informado/)).not.toBeInTheDocument();
  });

  it("tirar o prazo diz qual era", () => {
    mostrar(
      linha({ old_value: "2026-09-09", new_value: null, motivo: "outro" })
    );
    expect(
      screen.getByText(/tirou o prazo \(era 09\/09\/2026\)/)
    ).toBeInTheDocument();
    expect(screen.getByText("Outro")).toBeInTheDocument();
  });
});
