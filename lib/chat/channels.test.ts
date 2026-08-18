import { describe, expect, it } from "vitest";

import type { ChatChannel, Task } from "@/types/database";

import {
  deadlinesLabel,
  sectorDeadlines,
  sortChannelViews,
  toChannelViews,
} from "./channels";

const EU = "user-1";
const OUTRO = "user-2";
const NOW = new Date(2026, 7, 17, 12, 0, 0);

function channel(partial: Partial<ChatChannel>): ChatChannel {
  return {
    id: crypto.randomUUID(),
    workspace_id: "ws",
    sector_id: null,
    kind: "setor",
    dm_key: null,
    name: "Canal",
    created_at: "2026-08-01T00:00:00Z",
    ...partial,
  } as ChatChannel;
}

function task(partial: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    workspace_id: "ws",
    sector_id: "sec-1",
    title: "Demanda",
    due_date: null,
    completed_at: null,
    cancelled_at: null,
    ...partial,
  } as Task;
}

const nomes: Record<string, string> = { [EU]: "Eu", [OUTRO]: "Maria" };
const nameOf = (id: string) => nomes[id] ?? "Alguém";

describe("toChannelViews", () => {
  it("canal de setor usa o próprio nome", () => {
    const views = toChannelViews(
      [channel({ name: "Obras", sector_id: "s1" })],
      new Map(),
      EU,
      nameOf
    );
    expect(views[0]).toMatchObject({ label: "Obras", otherUserId: null });
  });

  it("conversa direta se chama pela outra pessoa", () => {
    const c = channel({ kind: "direta", name: "", dm_key: "a:b" });
    const views = toChannelViews(
      [c],
      new Map([[c.id, [EU, OUTRO]]]),
      EU,
      nameOf
    );
    expect(views[0]).toMatchObject({ label: "Maria", otherUserId: OUTRO });
  });

  it("o mesmo canal tem nome diferente para cada lado", () => {
    const c = channel({ kind: "direta", name: "", dm_key: "a:b" });
    const membros = new Map([[c.id, [EU, OUTRO]]]);
    const meu = toChannelViews([c], membros, EU, nameOf)[0];
    const dela = toChannelViews([c], membros, OUTRO, nameOf)[0];
    expect(meu.label).toBe("Maria");
    expect(dela.label).toBe("Eu");
  });

  it("conversa sem participante conhecido não quebra", () => {
    const c = channel({ kind: "direta", name: "" });
    const views = toChannelViews([c], new Map(), EU, nameOf);
    expect(views[0]).toMatchObject({ label: "Conversa", otherUserId: null });
  });
});

describe("sortChannelViews", () => {
  it("geral, setores em ordem, diretas por último", () => {
    const views = toChannelViews(
      [
        channel({ kind: "setor", name: "Obras", sector_id: "s2" }),
        channel({ kind: "direta", name: "", dm_key: "x" }),
        channel({ kind: "geral", name: "Geral" }),
        channel({ kind: "setor", name: "Agricultura", sector_id: "s1" }),
      ],
      new Map(),
      EU,
      nameOf
    );
    expect(sortChannelViews(views).map((v) => v.label)).toEqual([
      "Geral",
      "Agricultura",
      "Obras",
      "Conversa",
    ]);
  });
});

describe("sectorDeadlines", () => {
  it("separa atrasada, hoje e próximos dias", () => {
    const tasks = [
      task({ due_date: "2026-08-14" }),
      task({ due_date: "2026-08-17" }),
      task({ due_date: "2026-08-19" }),
      task({ due_date: "2026-08-30" }),
    ];
    expect(sectorDeadlines(tasks, "sec-1", NOW)).toEqual({
      overdue: 1,
      today: 1,
      soon: 1,
    });
  });

  it("ignora outro setor, concluída e cancelada", () => {
    const tasks = [
      task({ due_date: "2026-08-14", sector_id: "outro" }),
      task({ due_date: "2026-08-14", completed_at: "2026-08-13T00:00:00Z" }),
      task({ due_date: "2026-08-14", cancelled_at: "2026-08-13T00:00:00Z" }),
      task({ sector_id: "sec-1" }),
    ];
    expect(sectorDeadlines(tasks, "sec-1", NOW)).toEqual({
      overdue: 0,
      today: 0,
      soon: 0,
    });
  });
});

describe("deadlinesLabel", () => {
  it("nada a dizer devolve null — o resumo some da tela", () => {
    expect(deadlinesLabel({ overdue: 0, today: 0, soon: 0 })).toBeNull();
  });

  it("singular e plural corretos", () => {
    expect(deadlinesLabel({ overdue: 1, today: 1, soon: 1 })).toBe(
      "1 atrasada · 1 vence hoje · 1 vence nos próximos dias"
    );
    expect(deadlinesLabel({ overdue: 2, today: 3, soon: 0 })).toBe(
      "2 atrasadas · 3 vencem hoje"
    );
  });
});
