import { describe, expect, it } from "vitest";

import type { Task } from "@/types/database";

import {
  EMPTY_LIST_FILTERS,
  filterTasks,
  groupTasks,
  sortTasks,
} from "./list-view";

const NOW = new Date("2026-08-14T12:00:00Z");

function task(partial: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    workspace_id: "ws",
    sector_id: "sec-1",
    project_id: null,
    column_id: null,
    client_id: null,
    title: "Tarefa",
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
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...partial,
  } as Task;
}

describe("filterTasks", () => {
  it("status atrasada só pega aberta com prazo vencido (exclui cancelada)", () => {
    const tasks = [
      task({ title: "vencida", due_date: "2026-08-01" }),
      task({
        title: "cancelada vencida",
        due_date: "2026-08-01",
        cancelled_at: "2026-08-05T00:00:00Z",
      }),
      task({ title: "futura", due_date: "2026-09-01" }),
    ];
    const result = filterTasks(
      tasks,
      { ...EMPTY_LIST_FILTERS, status: "atrasada" },
      NOW
    );
    expect(result.map((t) => t.title)).toEqual(["vencida"]);
  });

  it("dueWithinDays filtra prazo dentro da janela, ignora sem prazo", () => {
    const tasks = [
      task({ title: "em 3 dias", due_date: "2026-08-17" }),
      task({ title: "em 20 dias", due_date: "2026-09-03" }),
      task({ title: "sem prazo" }),
    ];
    const result = filterTasks(
      tasks,
      { ...EMPTY_LIST_FILTERS, dueWithinDays: 7 },
      NOW
    );
    expect(result.map((t) => t.title)).toEqual(["em 3 dias"]);
  });

  it("busca por texto é case-insensitive", () => {
    const tasks = [
      task({ title: "Revisar Contrato" }),
      task({ title: "Outra coisa" }),
    ];
    const result = filterTasks(
      tasks,
      { ...EMPTY_LIST_FILTERS, q: "contrato" },
      NOW
    );
    expect(result).toHaveLength(1);
  });
});

describe("sortTasks", () => {
  it("ordena por prioridade: urgente primeiro", () => {
    const tasks = [
      task({ title: "baixa", priority: "baixa" }),
      task({ title: "urgente", priority: "urgente" }),
      task({ title: "normal", priority: "media" }),
    ];
    const result = sortTasks(tasks, "priority", new Map());
    expect(result.map((t) => t.title)).toEqual(["urgente", "normal", "baixa"]);
  });
});

describe("groupTasks", () => {
  it("agrupa por status (aberta/concluida/cancelada)", () => {
    const tasks = [
      task({ title: "a" }),
      task({ title: "b", completed_at: "2026-08-10T00:00:00Z" }),
      task({ title: "c", cancelled_at: "2026-08-10T00:00:00Z" }),
    ];
    const groups = groupTasks(
      tasks,
      "status",
      { clientNameById: new Map(), memberNameById: new Map() },
      NOW
    );
    const byKey = new Map(groups.map((g) => [g.key, g.tasks.length]));
    expect(byKey.get("aberta")).toBe(1);
    expect(byKey.get("concluida")).toBe(1);
    expect(byKey.get("cancelada")).toBe(1);
  });

  it("agrupa por cliente resolvendo o nome", () => {
    const tasks = [
      task({ title: "a", client_id: "c1" }),
      task({ title: "b", client_id: "c1" }),
      task({ title: "c" }),
    ];
    const groups = groupTasks(
      tasks,
      "client",
      { clientNameById: new Map([["c1", "ACME"]]), memberNameById: new Map() },
      NOW
    );
    const acme = groups.find((g) => g.key === "c1");
    const none = groups.find((g) => g.key === "none");
    expect(acme).toMatchObject({ label: "ACME" });
    expect(acme?.tasks).toHaveLength(2);
    expect(none).toMatchObject({ label: "Sem cliente" });
  });
});
