import { describe, expect, it } from "vitest";

import type { Member } from "@/lib/queries/useMembers";
import type { Client, Sector, Task } from "@/types/database";

import { computeDashboard } from "./stats";

const NOW = new Date("2026-08-14T12:00:00Z");

// Fábrica mínima: só os campos que a agregação lê.
function task(partial: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    workspace_id: "ws",
    sector_id: "sec-1",
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
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...partial,
  } as Task;
}

const sectors = [
  { id: "sec-1", name: "Jurídico", color: "#123456" },
  { id: "sec-2", name: "Marketing", color: "#654321" },
] as unknown as Sector[];
const clients = [
  { id: "cli-1", name: "ACME" },
  { id: "cli-2", name: "Globex" },
] as unknown as Client[];
const members = [
  { user_id: "u1", display_name: "Ana", email: "ana@x.com" },
  { user_id: "u2", display_name: null, email: "bob@x.com" },
] as unknown as Member[];

describe("computeDashboard", () => {
  it("classifica atrasada, vencendo e concluída nos últimos 30 dias", () => {
    const tasks = [
      task({ due_date: "2026-08-10" }), // atrasada (-4)
      task({ due_date: "2026-08-16" }), // vencendo (+2)
      task({ due_date: "2026-09-30" }), // futura, nem atrasada nem vencendo
      task({ completed_at: "2026-08-01T10:00:00Z" }), // concluída 13d atrás
      task({ completed_at: "2026-06-01T10:00:00Z" }), // concluída >30d
    ];
    const s = computeDashboard({ tasks, sectors, clients, members }, NOW);
    expect(s.open).toBe(3);
    expect(s.overdue).toBe(1);
    expect(s.dueSoon).toBe(1);
    expect(s.done30).toBe(1);
    expect(s.total).toBe(5);
  });

  it("agrupa abertas por setor e por cliente (top desc)", () => {
    const tasks = [
      task({ sector_id: "sec-1", client_id: "cli-1" }),
      task({ sector_id: "sec-1", client_id: "cli-1" }),
      task({ sector_id: "sec-2", client_id: "cli-2" }),
      task({ sector_id: "sec-2", completed_at: "2026-08-13T10:00:00Z" }), // não conta (concluída)
    ];
    const s = computeDashboard({ tasks, sectors, clients, members }, NOW);
    expect(s.bySector.map((b) => [b.name, b.open])).toEqual([
      ["Jurídico", 2],
      ["Marketing", 1],
    ]);
    expect(s.bySector[0].color).toBe("#123456");
    expect(s.byClient.map((b) => [b.name, b.open])).toEqual([
      ["ACME", 2],
      ["Globex", 1],
    ]);
  });

  it("produtividade por responsável: abertas + concluídas 30d, e sem responsável", () => {
    const tasks = [
      task({ assignee_id: "u1" }),
      task({ assignee_id: "u1", completed_at: "2026-08-10T10:00:00Z" }),
      task({ assignee_id: null }), // sem responsável, aberta
      task({ assignee_id: "u2", completed_at: "2026-08-12T10:00:00Z" }),
    ];
    const s = computeDashboard({ tasks, sectors, clients, members }, NOW);
    const ana = s.byAssignee.find((b) => b.id === "u1");
    const none = s.byAssignee.find((b) => b.id === "__none__");
    const bob = s.byAssignee.find((b) => b.id === "u2");
    expect(ana).toMatchObject({ name: "Ana", open: 1, done30: 1 });
    expect(none).toMatchObject({ name: "Sem responsável", open: 1, done30: 0 });
    expect(bob).toMatchObject({ name: "bob@x.com", open: 0, done30: 1 });
  });
});
