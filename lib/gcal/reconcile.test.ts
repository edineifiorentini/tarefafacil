import { describe, expect, it } from "vitest";

import {
  eventToPatch,
  reconcile,
  stripAppLink,
  taskIdOf,
  type GcalEvent,
  type ReconcileTask,
} from "./reconcile";

const baseTask: ReconcileTask = {
  id: "task-1",
  title: "Original",
  description: "descrição",
  due_date: "2026-08-10",
  due_time: null,
  due_end_time: null,
  gcal_event_id: "evt-1",
  gcal_synced_at: "2026-08-10T12:00:00.000Z",
};

function event(overrides: Partial<GcalEvent>): GcalEvent {
  return {
    id: "evt-1",
    status: "confirmed",
    extendedProperties: { private: { tarefafacil_task_id: "task-1" } },
    ...overrides,
  };
}

describe("taskIdOf", () => {
  it("lê o id da tarefa em extendedProperties.private", () => {
    expect(taskIdOf(event({}))).toBe("task-1");
  });
  it("retorna null quando não é um evento nosso", () => {
    expect(taskIdOf({ id: "x" })).toBeNull();
  });
});

describe("stripAppLink", () => {
  it("remove a linha do link do TarefaFácil", () => {
    const desc = "Notas do cliente\n\nAbrir no TarefaFácil: http://x/setor/1";
    expect(stripAppLink(desc)).toBe("Notas do cliente");
  });
  it("vira null quando só havia o link", () => {
    expect(stripAppLink("Abrir no TarefaFácil: http://x")).toBeNull();
  });
});

describe("eventToPatch", () => {
  it("evento de dia inteiro → due_time null", () => {
    const patch = eventToPatch(event({ summary: "Novo", start: { date: "2026-08-15" } }));
    expect(patch).toMatchObject({ title: "Novo", due_date: "2026-08-15", due_time: null });
  });
  it("evento com horário → extrai data e hora de parede", () => {
    const patch = eventToPatch(
      event({ start: { dateTime: "2026-08-15T14:30:00-03:00" } })
    );
    expect(patch.due_date).toBe("2026-08-15");
    expect(patch.due_time).toBe("14:30:00");
  });

  it("reunião com início e fim → extrai due_end_time", () => {
    const patch = eventToPatch(
      event({
        start: { dateTime: "2026-08-15T15:30:00-03:00" },
        end: { dateTime: "2026-08-15T17:00:00-03:00" },
      })
    );
    expect(patch.due_time).toBe("15:30:00");
    expect(patch.due_end_time).toBe("17:00:00");
  });

  it("dia inteiro zera início e fim", () => {
    const patch = eventToPatch(event({ start: { date: "2026-08-15" } }));
    expect(patch.due_time).toBeNull();
    expect(patch.due_end_time).toBeNull();
  });
});

describe("reconcile — cenários do aceite E16", () => {
  it("evento editado no Google (mais novo) → update com snapshot", () => {
    const action = reconcile(
      baseTask,
      event({ summary: "Editado no Google", updated: "2026-08-10T13:00:00.000Z" })
    );
    expect(action.type).toBe("update");
    if (action.type === "update") {
      expect(action.patch.title).toBe("Editado no Google");
      expect(action.undo).toMatchObject({ kind: "edited", title: "Original" });
    }
  });

  it("evento deletado no Google → delete, mantém snapshot para desfazer", () => {
    const action = reconcile(baseTask, event({ status: "cancelled" }));
    expect(action.type).toBe("delete");
    if (action.type === "delete") {
      expect(action.undo.kind).toBe("removed");
    }
  });

  it("edição simultânea: nosso push é mais recente que o evento → ignore", () => {
    const action = reconcile(
      { ...baseTask, gcal_synced_at: "2026-08-10T14:00:00.000Z" },
      event({ summary: "Google antigo", updated: "2026-08-10T13:00:00.000Z" })
    );
    expect(action.type).toBe("ignore");
  });

  it("evento de outro id não sequestra a tarefa", () => {
    const action = reconcile(
      baseTask,
      event({ id: "outro-evento", updated: "2026-08-10T20:00:00.000Z" })
    );
    expect(action.type).toBe("ignore");
  });

  it("primeira sincronização (sem gcal_synced_at) aplica a mudança", () => {
    const action = reconcile(
      { ...baseTask, gcal_synced_at: null },
      event({ summary: "Vindo do Google", updated: "2026-08-10T13:00:00.000Z" })
    );
    expect(action.type).toBe("update");
  });
});
