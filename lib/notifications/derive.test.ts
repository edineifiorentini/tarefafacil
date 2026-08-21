import { describe, expect, it } from "vitest";

import type { Contract, FinanceEntry, Task } from "@/types/database";

import {
  deriveContractAlerts,
  deriveFinanceAlerts,
  deriveTaskAlerts,
  mergeFeed,
  todayISO,
  unreadCount,
} from "./derive";
import type { FeedEvent } from "./types";

// 12h local evita que a virada de fuso jogue a data para o dia vizinho.
const NOW = new Date(2026, 7, 17, 12, 0, 0);
const EU = "user-1";
const OUTRO = "user-2";

function task(partial: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    workspace_id: "ws",
    sector_id: "sec",
    title: "Demanda",
    due_date: null,
    due_time: null,
    assignee_id: null,
    completed_at: null,
    cancelled_at: null,
    created_at: "2026-08-01T00:00:00Z",
    ...partial,
  } as Task;
}

function contract(partial: Partial<Contract>): Contract {
  return {
    id: crypto.randomUUID(),
    workspace_id: "ws",
    title: "Contrato",
    status: "ativo",
    ends_on: null,
    renew_notice_days: null,
    ...partial,
  } as Contract;
}

function entry(partial: Partial<FinanceEntry>): FinanceEntry {
  return {
    id: crypto.randomUUID(),
    workspace_id: "ws",
    description: "Parcela",
    kind: "entrada",
    amount_cents: 10000,
    status: "previsto",
    due_date: null,
    ...partial,
  } as FinanceEntry;
}

function event(partial: Partial<FeedEvent>): FeedEvent {
  return {
    id: crypto.randomUUID(),
    kind: "mencao",
    title: "Alguém mencionou você",
    detail: null,
    target: { type: "task", id: "t1" },
    readAt: null,
    createdAt: "2026-08-17T10:00:00Z",
    ...partial,
  };
}

describe("todayISO", () => {
  it("usa a data local, não a UTC", () => {
    // 21h de 17/ago em UTC-3 já é dia 18 em UTC. Para quem olha, ainda é 17.
    expect(todayISO(new Date(2026, 7, 17, 21, 0, 0))).toBe("2026-08-17");
  });
});

describe("deriveTaskAlerts", () => {
  it("classifica atrasada, hoje e prazo próximo", () => {
    const tasks = [
      task({ title: "Atrasada", due_date: "2026-08-14", assignee_id: EU }),
      task({ title: "Hoje", due_date: "2026-08-17", assignee_id: EU }),
      task({ title: "Em dois dias", due_date: "2026-08-19", assignee_id: EU }),
    ];
    const alerts = deriveTaskAlerts(tasks, { myId: EU }, NOW);
    expect(alerts.map((a) => a.kind)).toEqual([
      "atrasada",
      "prazo_hoje",
      "prazo_proximo",
    ]);
    expect(alerts[0].detail).toBe("Atrasada há 3 dias");
    expect(alerts[2].detail).toBe("Vence em 2 dias");
  });

  it("singular não vira '1 dias'", () => {
    const alerts = deriveTaskAlerts(
      [task({ due_date: "2026-08-18", assignee_id: EU })],
      { myId: EU },
      NOW
    );
    expect(alerts[0].detail).toBe("Vence em 1 dia");
  });

  it("mostra o horário quando a demanda tem hora marcada", () => {
    const alerts = deriveTaskAlerts(
      [task({ due_date: "2026-08-17", due_time: "15:30:00", assignee_id: EU })],
      { myId: EU },
      NOW
    );
    expect(alerts[0].detail).toBe("Vence hoje às 15:30");
  });

  it("ignora concluída e cancelada", () => {
    const tasks = [
      task({
        due_date: "2026-08-10",
        assignee_id: EU,
        completed_at: "2026-08-09T00:00:00Z",
      }),
      task({
        due_date: "2026-08-10",
        assignee_id: EU,
        cancelled_at: "2026-08-09T00:00:00Z",
      }),
    ];
    expect(deriveTaskAlerts(tasks, { myId: EU }, NOW)).toEqual([]);
  });

  it("fora do horizonte não alerta", () => {
    const alerts = deriveTaskAlerts(
      [task({ due_date: "2026-08-25", assignee_id: EU })],
      { myId: EU },
      NOW
    );
    expect(alerts).toEqual([]);
  });

  it("o sino é pessoal: demanda de outro não entra", () => {
    const tasks = [task({ due_date: "2026-08-17", assignee_id: OUTRO })];
    expect(deriveTaskAlerts(tasks, { myId: EU }, NOW)).toEqual([]);
  });

  it("gestor vê o atraso da equipe, mas não o prazo futuro dela", () => {
    const tasks = [
      task({
        title: "Atraso alheio",
        due_date: "2026-08-10",
        assignee_id: OUTRO,
      }),
      task({
        title: "Futuro alheio",
        due_date: "2026-08-18",
        assignee_id: OUTRO,
      }),
    ];
    const alerts = deriveTaskAlerts(
      tasks,
      { myId: EU, alsoTeamOverdue: true },
      NOW
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].title).toBe("Atraso alheio");
    expect(alerts[0].detail).toContain("Da equipe");
  });

  it("o meu atraso pesa menos que o da equipe (vem antes)", () => {
    const tasks = [
      task({ title: "Do time", due_date: "2026-08-10", assignee_id: OUTRO }),
      task({ title: "Meu", due_date: "2026-08-10", assignee_id: EU }),
    ];
    const feed = mergeFeed(
      deriveTaskAlerts(tasks, { myId: EU, alsoTeamOverdue: true }, NOW),
      []
    );
    expect(feed.map((f) => f.title)).toEqual(["Meu", "Do time"]);
  });
});

describe("deriveContractAlerts", () => {
  it("avisa dentro da janela padrão de 30 dias", () => {
    const alerts = deriveContractAlerts(
      [contract({ ends_on: "2026-09-01" })],
      NOW
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].detail).toBe("Vigência termina em 15 dias");
  });

  it("respeita o aviso prévio do próprio contrato", () => {
    // Faltam 15 dias, mas este contrato só quer aviso com 5.
    const alerts = deriveContractAlerts(
      [contract({ ends_on: "2026-09-01", renew_notice_days: 5 })],
      NOW
    );
    expect(alerts).toEqual([]);
  });

  it("rascunho, encerrado e cancelado não alertam", () => {
    const alerts = deriveContractAlerts(
      [
        contract({ ends_on: "2026-08-20", status: "rascunho" }),
        contract({ ends_on: "2026-08-20", status: "encerrado" }),
        contract({ ends_on: "2026-08-20", status: "cancelado" }),
      ],
      NOW
    );
    expect(alerts).toEqual([]);
  });

  it("vigência já terminada não vira alerta de 'vencendo'", () => {
    expect(
      deriveContractAlerts([contract({ ends_on: "2026-08-01" })], NOW)
    ).toEqual([]);
  });
});

describe("deriveFinanceAlerts", () => {
  it("sem permissão financeira não devolve nada", () => {
    const entries = [entry({ due_date: "2026-08-18" })];
    expect(deriveFinanceAlerts(entries, NOW, false)).toEqual([]);
    expect(deriveFinanceAlerts(entries, NOW, true)).toHaveLength(1);
  });

  it("só lançamento previsto — confirmado e cancelado ficam de fora", () => {
    const entries = [
      entry({ due_date: "2026-08-18", status: "confirmado" }),
      entry({ due_date: "2026-08-18", status: "cancelado" }),
    ];
    expect(deriveFinanceAlerts(entries, NOW, true)).toEqual([]);
  });

  it("vencido pesa mais que a vencer", () => {
    const alerts = deriveFinanceAlerts(
      [
        entry({ description: "A vencer", due_date: "2026-08-20" }),
        entry({ description: "Vencido", due_date: "2026-08-12" }),
      ],
      NOW,
      true
    );
    const feed = mergeFeed(alerts, []);
    expect(feed.map((f) => f.title)).toEqual(["Vencido", "A vencer"]);
    expect(feed[0].nature === "alerta" && feed[0].detail).toBe(
      "Vencido há 5 dias"
    );
  });
});

describe("mergeFeed", () => {
  it("alertas antes de eventos", () => {
    const feed = mergeFeed(
      deriveTaskAlerts(
        [task({ title: "T", due_date: "2026-08-17", assignee_id: EU })],
        { myId: EU },
        NOW
      ),
      [event({ title: "E" })]
    );
    expect(feed.map((f) => f.nature)).toEqual(["alerta", "evento"]);
  });

  it("evento não lido vem antes do lido, depois por recência", () => {
    const feed = mergeFeed(
      [],
      [
        event({
          title: "Lido antigo",
          readAt: "2026-08-17T11:00:00Z",
          createdAt: "2026-08-15T00:00:00Z",
        }),
        event({ title: "Novo", createdAt: "2026-08-17T09:00:00Z" }),
        event({ title: "Mais novo", createdAt: "2026-08-17T10:00:00Z" }),
      ]
    );
    expect(feed.map((f) => f.title)).toEqual([
      "Mais novo",
      "Novo",
      "Lido antigo",
    ]);
  });
});

describe("unreadCount", () => {
  it("conta todo alerta ativo e só os eventos não lidos", () => {
    const feed = mergeFeed(
      deriveTaskAlerts(
        [
          task({ due_date: "2026-08-10", assignee_id: EU }),
          task({ due_date: "2026-08-17", assignee_id: EU }),
        ],
        { myId: EU },
        NOW
      ),
      [event({}), event({ readAt: "2026-08-17T11:00:00Z" })]
    );
    expect(unreadCount(feed)).toBe(3);
  });

  it("feed vazio não conta nada", () => {
    expect(unreadCount([])).toBe(0);
  });
});
