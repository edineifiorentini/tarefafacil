import { describe, expect, it } from "vitest";

import type { FinanceEntry, Task } from "@/types/database";

import {
  completionRateSeries,
  deliveredInMonth,
  deliveriesByWeek,
  doneBy,
  openAt,
  openBacklogSeries,
  overdueAt,
  percentChange,
  pointChange,
  revenueByMonth,
  upcomingDeliveries,
  weekEnds,
} from "./trends";

const NOW = new Date("2026-08-14T12:00:00Z");

function task(partial: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    workspace_id: "ws",
    sector_id: "sec-1",
    project_id: null,
    column_id: null,
    client_id: null,
    title: "Demanda",
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
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...partial,
  } as Task;
}

function entry(partial: Partial<FinanceEntry>): FinanceEntry {
  return {
    id: crypto.randomUUID(),
    workspace_id: "ws",
    kind: "entrada",
    description: "e",
    amount_cents: 10000,
    status: "confirmado",
    due_date: "2026-03-01",
    confirmed_at: "2026-03-01",
    category: null,
    client_id: null,
    notes: null,
    source_type: null,
    source_id: null,
    installment_number: null,
    needs_invoice: false,
    invoice_number: null,
    invoice_issued_at: null,
    invoice_file_url: null,
    created_by: null,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
    ...partial,
  } as FinanceEntry;
}

describe("openAt", () => {
  it("não conta antes de existir", () => {
    const t = task({ created_at: "2026-08-10T00:00:00Z" });
    expect(openAt(t, new Date("2026-08-01T00:00:00Z"))).toBe(false);
    expect(openAt(t, new Date("2026-08-12T00:00:00Z"))).toBe(true);
  });

  it("deixa de contar a partir da conclusão, não antes", () => {
    const t = task({ completed_at: "2026-08-10T00:00:00Z" });
    expect(openAt(t, new Date("2026-08-09T00:00:00Z"))).toBe(true);
    expect(openAt(t, new Date("2026-08-11T00:00:00Z"))).toBe(false);
  });

  it("cancelada também sai do backlog na data do cancelamento", () => {
    const t = task({ cancelled_at: "2026-08-05T00:00:00Z" });
    expect(openAt(t, new Date("2026-08-04T00:00:00Z"))).toBe(true);
    expect(openAt(t, new Date("2026-08-06T00:00:00Z"))).toBe(false);
  });
});

describe("doneBy / overdueAt", () => {
  it("doneBy respeita o instante", () => {
    const t = task({ completed_at: "2026-08-10T00:00:00Z" });
    expect(doneBy(t, new Date("2026-08-09T00:00:00Z"))).toBe(false);
    expect(doneBy(t, new Date("2026-08-11T00:00:00Z"))).toBe(true);
  });

  it("só é atrasada se ainda estiver aberta naquele momento", () => {
    const vencida = task({ due_date: "2026-08-01" });
    expect(overdueAt(vencida, NOW)).toBe(true);

    const entregue = task({
      due_date: "2026-08-01",
      completed_at: "2026-08-02T00:00:00Z",
    });
    expect(overdueAt(entregue, NOW)).toBe(false);
  });
});

describe("weekEnds", () => {
  it("gera N marcos e o último é o agora (semana em curso)", () => {
    const ends = weekEnds(NOW, 4);
    expect(ends).toHaveLength(4);
    expect(ends[3].getTime()).toBe(NOW.getTime());
    expect(ends[0].getTime()).toBeLessThan(ends[3].getTime());
  });
});

describe("openBacklogSeries", () => {
  it("cresce conforme as demandas são criadas", () => {
    const tasks = [
      task({ created_at: "2026-07-20T00:00:00Z" }),
      task({ created_at: "2026-08-13T00:00:00Z" }),
    ];
    const series = openBacklogSeries(tasks, NOW, 4);
    expect(series[series.length - 1]).toBe(2);
    expect(series[0]).toBeLessThanOrEqual(series[series.length - 1]);
  });

  it("aceita filtro (ex.: só com responsável)", () => {
    const tasks = [task({ assignee_id: "u1" }), task({ assignee_id: null })];
    const series = openBacklogSeries(tasks, NOW, 2, (t) => !!t.assignee_id);
    expect(series[series.length - 1]).toBe(1);
  });
});

describe("completionRateSeries", () => {
  it("é 0 quando não há nada decidido e 100 quando tudo foi entregue", () => {
    expect(completionRateSeries([], NOW, 2).every((v) => v === 0)).toBe(true);

    const tudoFeito = [task({ completed_at: "2026-07-05T00:00:00Z" })];
    const series = completionRateSeries(tudoFeito, NOW, 2);
    expect(series[series.length - 1]).toBe(100);
  });
});

describe("percentChange / pointChange", () => {
  it("percentChange compara os dois últimos pontos", () => {
    expect(percentChange([10, 11])).toBeCloseTo(10);
    expect(percentChange([10, 5])).toBeCloseTo(-50);
  });

  it("base zero não vira infinito", () => {
    expect(percentChange([0, 0])).toBe(0);
    expect(percentChange([0, 7])).toBe(100);
  });

  it("pointChange devolve a diferença absoluta (p.p.)", () => {
    expect(pointChange([80, 86])).toBe(6);
  });
});

describe("deliveriesByWeek", () => {
  it("sempre devolve 4 semanas, sem os baldes de 1 dia da semana ISO", () => {
    // Agosto/2026 começa num sábado: por semana ISO daria 6 baldes, com o
    // primeiro cobrindo 2 dias e o último cobrindo 1.
    const result = deliveriesByWeek([], "2026-08");
    expect(result.labels).toEqual(["Sem 1", "Sem 2", "Sem 3", "Sem 4"]);
  });

  it("a última semana absorve o resto do mês", () => {
    const tasks = [
      task({ completed_at: "2026-08-31T10:00:00Z" }), // dia 31 cai na Sem 4
      task({ completed_at: "2026-08-22T10:00:00Z" }), // início da Sem 4
    ];
    const result = deliveriesByWeek(tasks, "2026-08");
    expect(result.delivered).toEqual([0, 0, 0, 2]);
  });

  it("distribui pelos dias 1-7, 8-14, 15-21, 22-fim", () => {
    const tasks = [
      task({ completed_at: "2026-08-03T10:00:00Z" }),
      task({ completed_at: "2026-08-10T10:00:00Z" }),
      task({ completed_at: "2026-08-17T10:00:00Z" }),
    ];
    expect(deliveriesByWeek(tasks, "2026-08").delivered).toEqual([1, 1, 1, 0]);
  });

  it("funciona em fevereiro (mês curto)", () => {
    const tasks = [task({ completed_at: "2026-02-28T10:00:00Z" })];
    const result = deliveriesByWeek(tasks, "2026-02");
    expect(result.labels).toHaveLength(4);
    expect(result.delivered).toEqual([0, 0, 0, 1]);
  });

  it("separa entregues (conclusão) de planejadas (prazo)", () => {
    const tasks = [
      task({ completed_at: "2026-08-04T10:00:00Z", due_date: "2026-08-04" }),
      task({ due_date: "2026-08-05" }),
      // cancelada não conta em nenhuma das séries
      task({ due_date: "2026-08-05", cancelled_at: "2026-08-06T00:00:00Z" }),
    ];
    const result = deliveriesByWeek(tasks, "2026-08");
    expect(result.labels[0]).toBe("Sem 1");
    expect(result.totalDelivered).toBe(1);
    expect(result.planned.reduce((a, b) => a + b, 0)).toBe(2);
  });
});

describe("deliveredInMonth", () => {
  it("conta só conclusões daquele mês", () => {
    const tasks = [
      task({ completed_at: "2026-08-04T10:00:00Z" }),
      task({ completed_at: "2026-07-30T10:00:00Z" }),
    ];
    expect(deliveredInMonth(tasks, "2026-08")).toBe(1);
    expect(deliveredInMonth(tasks, "2026-07")).toBe(1);
  });
});

describe("upcomingDeliveries", () => {
  it("ordena por data e horário, e classifica o estado", () => {
    const tasks = [
      task({ title: "tarde", due_date: "2026-08-14", due_time: "15:00:00" }),
      task({
        title: "manhã",
        due_date: "2026-08-14",
        due_time: "09:00:00",
        assignee_id: "u1",
      }),
      task({ title: "passado", due_date: "2026-08-01" }),
    ];
    const result = upcomingDeliveries(tasks, NOW);
    expect(result.map((r) => r.task.title)).toEqual(["manhã", "tarde"]);
    expect(result[0]).toMatchObject({ time: "09:00", state: "andamento" });
    expect(result[1]).toMatchObject({ state: "pendente" });
  });

  it("mantém a concluída do dia na lista", () => {
    const tasks = [
      task({ due_date: "2026-08-14", completed_at: "2026-08-14T10:00:00Z" }),
    ];
    expect(upcomingDeliveries(tasks, NOW)[0].state).toBe("concluida");
  });
});

describe("revenueByMonth", () => {
  it("soma só entradas confirmadas, pelo mês da confirmação", () => {
    const entries = [
      entry({ confirmed_at: "2026-03-10", amount_cents: 50000 }),
      entry({ confirmed_at: "2026-03-20", amount_cents: 25000 }),
      entry({ kind: "saida", confirmed_at: "2026-03-11", amount_cents: 90000 }),
      entry({ status: "previsto", confirmed_at: null, amount_cents: 70000 }),
    ];
    const result = revenueByMonth(entries, 2026);
    expect(result.values[2]).toBe(75000);
    expect(result.totalCents).toBe(75000);
  });

  it("calcula crescimento sobre o ano anterior", () => {
    const entries = [
      entry({ confirmed_at: "2026-01-10", amount_cents: 12000 }),
      entry({ confirmed_at: "2025-01-10", amount_cents: 10000 }),
    ];
    expect(revenueByMonth(entries, 2026).growth).toBeCloseTo(20);
  });

  it("sem ano anterior não inventa crescimento", () => {
    const entries = [
      entry({ confirmed_at: "2026-01-10", amount_cents: 12000 }),
    ];
    expect(revenueByMonth(entries, 2026).growth).toBe(0);
  });
});

describe("fuso: entrega da noite", () => {
  it("conclusão às 22h conta no dia local, não no dia seguinte em UTC", () => {
    // Em UTC-3, 22h do dia 19 é dia 20 em UTC. Com slice(0,10) do ISO essa
    // entrega caía na Sem 4 (22-fim) em vez da Sem 3 (15-21).
    const noite = new Date(2026, 7, 19, 22, 0);
    const tasks = [task({ completed_at: noite.toISOString() })];
    const result = deliveriesByWeek(tasks, "2026-08");
    expect(result.delivered).toEqual([0, 0, 1, 0]);
  });

  it("conclusão no dia 31 à noite não vaza para o mês seguinte", () => {
    // O pior caso: fechamento do mês perdendo a última entrega.
    const virada = new Date(2026, 7, 31, 22, 30);
    const tasks = [task({ completed_at: virada.toISOString() })];
    expect(deliveredInMonth(tasks, "2026-08")).toBe(1);
    expect(deliveredInMonth(tasks, "2026-09")).toBe(0);
  });

  it("atraso usa o dia local — 22h não antecipa o vencimento", () => {
    // Uma demanda para hoje não pode aparecer como atrasada às 22h.
    const noite = new Date(2026, 7, 19, 22, 0);
    const hoje = task({ due_date: "2026-08-19" });
    expect(overdueAt(hoje, noite)).toBe(false);
  });
});

describe("deliveriesByWeek — atrasadas", () => {
  const AGORA = new Date(2026, 7, 20, 12, 0); // 20/ago, dentro da Sem 3

  it("prazo vencido e não entregue conta como atrasada", () => {
    const tasks = [task({ due_date: "2026-08-10" })]; // Sem 2
    const r = deliveriesByWeek(tasks, "2026-08", AGORA);
    expect(r.overdue).toEqual([0, 1, 0, 0]);
    expect(r.totalOverdue).toBe(1);
  });

  it("entregue DEPOIS do prazo continua sendo atraso", () => {
    // Esconder isso faria a série virar elogio em vez de diagnóstico.
    const tasks = [
      task({ due_date: "2026-08-10", completed_at: "2026-08-13T10:00:00Z" }),
    ];
    expect(deliveriesByWeek(tasks, "2026-08", AGORA).overdue).toEqual([
      0, 1, 0, 0,
    ]);
  });

  it("entregue dentro do prazo não é atraso", () => {
    const tasks = [
      task({ due_date: "2026-08-10", completed_at: "2026-08-09T10:00:00Z" }),
    ];
    expect(deliveriesByWeek(tasks, "2026-08", AGORA).overdue).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it("entregue no próprio dia do prazo não é atraso", () => {
    const noPrazo = new Date(2026, 7, 10, 18, 0);
    const tasks = [
      task({ due_date: "2026-08-10", completed_at: noPrazo.toISOString() }),
    ];
    expect(deliveriesByWeek(tasks, "2026-08", AGORA).overdue).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it("semana futura não acusa atraso — o prazo ainda não venceu", () => {
    const tasks = [task({ due_date: "2026-08-28" })]; // Sem 4, ainda a vencer
    expect(deliveriesByWeek(tasks, "2026-08", AGORA).overdue).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it("prazo hoje ainda não é atraso", () => {
    const tasks = [task({ due_date: "2026-08-20" })];
    expect(deliveriesByWeek(tasks, "2026-08", AGORA).overdue).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it("cancelada não entra em atrasadas", () => {
    const tasks = [
      task({ due_date: "2026-08-10", cancelled_at: "2026-08-11T00:00:00Z" }),
    ];
    expect(deliveriesByWeek(tasks, "2026-08", AGORA).overdue).toEqual([
      0, 0, 0, 0,
    ]);
  });
});
