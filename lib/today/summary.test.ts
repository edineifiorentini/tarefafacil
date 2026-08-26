import { describe, expect, it } from "vitest";

import type { Member } from "@/lib/queries/useMembers";
import type { Sector, Task } from "@/types/database";

import { bucketTasks, countConcluidasHoje, distribute } from "./summary";

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

const contar = (b: ReturnType<typeof bucketTasks>) => ({
  atrasadas: b.atrasadas.length,
  hoje: b.hoje.length,
  proximos: b.proximos.length,
  sem_data: b.sem_data.length,
});

describe("bucketTasks", () => {
  it("cada tarefa aberta cai em exatamente um balde", () => {
    const b = bucketTasks(
      [
        tarefa({ due_date: "2026-08-20" }),
        tarefa({ due_date: "2026-08-24" }),
        tarefa({ due_date: HOJE }),
        tarefa({ due_date: "2026-08-28" }),
        tarefa({ due_date: null }),
      ],
      HOJE
    );
    expect(contar(b)).toEqual({
      atrasadas: 2,
      hoje: 1,
      proximos: 1,
      sem_data: 1,
    });
  });

  it("a janela dos próximos dias é fechada no sétimo dia", () => {
    // O limite tem que ser exato: uma tarefa que cai fora da janela some da
    // tela, e "some" é o pior desfecho possível para uma demanda.
    const b = bucketTasks(
      [
        tarefa({ due_date: "2026-09-01" }), // exatamente 7 dias
        tarefa({ due_date: "2026-09-02" }), // 8 dias: fora
      ],
      HOJE
    );
    expect(contar(b).proximos).toBe(1);
  });

  it("atravessa a virada do mês sem erro", () => {
    // Somar dias sobre texto YYYY-MM-DD é onde se erra: 31/ago + 7 dias.
    const b = bucketTasks([tarefa({ due_date: "2026-09-05" })], "2026-08-31");
    expect(contar(b).proximos).toBe(1);
  });

  it("concluída e cancelada não são pendência", () => {
    const b = bucketTasks(
      [
        tarefa({ due_date: "2026-08-20", cancelled_at: `${HOJE}T10:00:00Z` }),
        tarefa({ due_date: HOJE, completed_at: `${HOJE}T10:00:00Z` }),
      ],
      HOJE
    );
    expect(contar(b)).toEqual({
      atrasadas: 0,
      hoje: 0,
      proximos: 0,
      sem_data: 0,
    });
  });

  it("dentro do balde, a mais urgente primeiro", () => {
    const b = bucketTasks(
      [
        tarefa({ due_date: "2026-08-24", title: "ontem" }),
        tarefa({ due_date: "2026-08-10", title: "faz tempo" }),
      ],
      HOJE
    );
    expect(b.atrasadas.map((t) => t.title)).toEqual(["faz tempo", "ontem"]);
  });

  it("sem data ordena pela chegada, da mais recente", () => {
    // Sem prazo para comparar, a útil é a que a pessoa acabou de registrar.
    const b = bucketTasks(
      [
        tarefa({ created_at: "2026-08-01T10:00:00Z", title: "velha" }),
        tarefa({ created_at: "2026-08-25T10:00:00Z", title: "nova" }),
      ],
      HOJE
    );
    expect(b.sem_data.map((t) => t.title)).toEqual(["nova", "velha"]);
  });
});

describe("distribute", () => {
  it("conta só o que recebeu — é o filtro ativo, não o total", () => {
    // A garantia que importa: a distribuição não pode contradizer a lista ao
    // lado dela. Recebe a lista já filtrada e não sabe do resto.
    const d = distribute(
      [tarefa({ sector_id: "s2", assignee_id: "u1" })],
      setores,
      membros
    );
    expect(d.porSetor).toEqual([
      { id: "s2", name: "Social", color: "#7c3aed", count: 1 },
    ]);
    expect(d.porPessoa).toEqual([{ id: "u1", name: "Ana", count: 1 }]);
  });

  it("agrupa quem não tem responsável num balde próprio", () => {
    const d = distribute(
      [
        tarefa({ assignee_id: "u1" }),
        tarefa({ assignee_id: null }),
        tarefa({ assignee_id: null }),
      ],
      setores,
      membros
    );
    expect(d.porPessoa).toEqual([
      { id: null, name: "Sem responsável", count: 2 },
      { id: "u1", name: "Ana", count: 1 },
    ]);
  });

  it("cai no e-mail quando a pessoa não tem nome", () => {
    const d = distribute([tarefa({ assignee_id: "u2" })], setores, membros);
    expect(d.porPessoa[0].name).toBe("bob@x.com");
  });

  it("ordena do mais carregado para o menos", () => {
    const d = distribute(
      [
        tarefa({ sector_id: "s1" }),
        tarefa({ sector_id: "s2" }),
        tarefa({ sector_id: "s2" }),
      ],
      setores,
      membros
    );
    expect(d.porSetor.map((s) => s.name)).toEqual(["Social", "Design"]);
  });

  it("lista vazia não quebra", () => {
    expect(distribute([], setores, membros)).toEqual({
      porSetor: [],
      porPessoa: [],
    });
  });
});

describe("countConcluidasHoje", () => {
  it("conta pelo dia local, não por UTC", () => {
    // 23h30 em UTC-3 é 02h30 do dia seguinte em UTC. Contando em UTC, a
    // tarefa entregue à noite sumiria do dia de quem a entregou.
    expect(
      countConcluidasHoje([tarefa({ completed_at: `${HOJE}T23:30:00` })], HOJE)
    ).toBe(1);
  });

  it("ignora o que foi concluído em outro dia", () => {
    expect(
      countConcluidasHoje(
        [tarefa({ completed_at: "2026-08-24T10:00:00" })],
        HOJE
      )
    ).toBe(0);
  });
});
