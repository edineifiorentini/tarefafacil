import { describe, expect, it } from "vitest";

import type { Member } from "@/lib/queries/useMembers";
import type { Sector, Task } from "@/types/database";

import { summarizeToday } from "./summary";

const HOJE = "2026-08-25";

function tarefa(over: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    workspace_id: "w",
    sector_id: "s1",
    project_id: null,
    column_id: null,
    client_id: null,
    title: "t",
    description: null,
    due_date: null,
    due_time: null,
    due_end_time: null,
    priority: "media",
    assignee_id: null,
    completed_at: null,
    position: 0,
    gcal_sync: false,
    gcal_event_id: null,
    gcal_etag: null,
    gcal_synced_at: null,
    gcal_external_edit_at: null,
    gcal_undo: null,
    gcal_add_meet: false,
    gcal_meet_url: null,
    recurrence_rule: null,
    recurrence_parent_id: null,
    cancelled_at: null,
    service: null,
    estimate_minutes: null,
    created_at: `${HOJE}T08:00:00.000Z`,
    updated_at: `${HOJE}T08:00:00.000Z`,
    ...over,
  } as Task;
}

const setores = [
  { id: "s1", name: "Design", color: "#2563eb" },
  { id: "s2", name: "Social", color: "#7c3aed" },
] as Sector[];

const membros = [
  { user_id: "u1", display_name: "Ana", email: "ana@x.com" },
  { user_id: "u2", display_name: null, email: "bob@x.com" },
] as Member[];

describe("summarizeToday", () => {
  it("separa atrasada, hoje e sem data", () => {
    const r = summarizeToday(
      [
        tarefa({ due_date: "2026-08-20" }),
        tarefa({ due_date: "2026-08-24" }),
        tarefa({ due_date: HOJE }),
        tarefa({ due_date: null }),
        tarefa({ due_date: "2026-08-30" }), // futura: não conta em nada
      ],
      setores,
      membros,
      HOJE
    );
    expect(r).toMatchObject({ atrasadas: 2, hoje: 1, semData: 1 });
  });

  it("cancelada não é pendência", () => {
    const r = summarizeToday(
      [tarefa({ due_date: "2026-08-20", cancelled_at: `${HOJE}T10:00:00Z` })],
      setores,
      membros,
      HOJE
    );
    expect(r.atrasadas).toBe(0);
    expect(r.porSetor).toHaveLength(0);
  });

  it("conta concluída hoje pelo dia local, não por UTC", () => {
    // 23h em UTC-3 é 02h do dia seguinte em UTC. Contando em UTC, a tarefa
    // entregue à noite sumiria do "concluídas hoje" de quem a entregou.
    const r = summarizeToday(
      [tarefa({ completed_at: `${HOJE}T23:30:00` })],
      setores,
      membros,
      HOJE
    );
    expect(r.concluidasHoje).toBe(1);
  });

  it("sem data não entra na carga do setor", () => {
    // Senão o setor que registra ideias vira o mais atolado da empresa.
    const r = summarizeToday(
      [
        tarefa({ sector_id: "s1", due_date: null }),
        tarefa({ sector_id: "s1", due_date: null }),
        tarefa({ sector_id: "s2", due_date: HOJE }),
      ],
      setores,
      membros,
      HOJE
    );
    expect(r.porSetor).toEqual([
      { id: "s2", name: "Social", color: "#7c3aed", count: 1 },
    ]);
  });

  it("agrupa quem não tem responsável num balde próprio", () => {
    const r = summarizeToday(
      [
        tarefa({ due_date: HOJE, assignee_id: "u1" }),
        tarefa({ due_date: "2026-08-01", assignee_id: null }),
        tarefa({ due_date: HOJE, assignee_id: null }),
      ],
      setores,
      membros,
      HOJE
    );
    expect(r.porPessoa).toEqual([
      { id: null, name: "Sem responsável", count: 2 },
      { id: "u1", name: "Ana", count: 1 },
    ]);
  });

  it("cai no e-mail quando a pessoa não tem nome", () => {
    const r = summarizeToday(
      [tarefa({ due_date: HOJE, assignee_id: "u2" })],
      setores,
      membros,
      HOJE
    );
    expect(r.porPessoa[0].name).toBe("bob@x.com");
  });

  it("ordena do mais carregado para o menos", () => {
    const r = summarizeToday(
      [
        tarefa({ sector_id: "s1", due_date: HOJE }),
        tarefa({ sector_id: "s2", due_date: HOJE }),
        tarefa({ sector_id: "s2", due_date: "2026-08-10" }),
      ],
      setores,
      membros,
      HOJE
    );
    expect(r.porSetor.map((s) => s.name)).toEqual(["Social", "Design"]);
  });

  it("dia vazio devolve zeros sem quebrar", () => {
    const r = summarizeToday([], setores, membros, HOJE);
    expect(r).toEqual({
      atrasadas: 0,
      hoje: 0,
      semData: 0,
      concluidasHoje: 0,
      porSetor: [],
      porPessoa: [],
    });
  });
});
