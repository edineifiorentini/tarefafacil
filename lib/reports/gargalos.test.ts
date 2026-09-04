import { describe, expect, it } from "vitest";

import type { Task } from "@/types/database";

import {
  gargalosDoFluxo,
  type ColunaDoQuadro,
  type MovimentoDeColuna,
} from "./gargalos";

/**
 * **Esta função roda no SERVIDOR** — rota /api/reports/etapas —, e lá o
 * ambiente é UTC. Sem o fuso escrito, "parada há N dias" comparava dias
 * civis de UTC: a demanda que entrou na etapa às 22h de ontem no Brasil
 * aparecia parada há zero dias, porque em UTC ela entrou hoje de madrugada.
 *
 * Os casos abaixo fixam o resultado BRASILEIRO a partir de instantes UTC, e
 * por isso valem igual rodando aqui ou na Vercel.
 */

const COLUNA: ColunaDoQuadro = {
  id: "col-1",
  name: "Em produção",
  position: 0,
  is_done_column: false,
};

function tarefa(p: Partial<Task> = {}): Task {
  return {
    id: "t1",
    column_id: "col-1",
    completed_at: null,
    cancelled_at: null,
    created_at: "2026-09-01T12:00:00Z",
    ...p,
  } as unknown as Task;
}

describe("dias parados na etapa, no fuso de quem lê", () => {
  it("entrou às 22h de ontem: parada há 1 dia, não zero", () => {
    // Entrada: 2026-09-04 22:00 BRT === 2026-09-05 01:00 UTC.
    // Agora:   2026-09-05 10:00 BRT === 2026-09-05 13:00 UTC.
    // No Brasil virou o dia; em UTC não. O certo é 1.
    const movimentos: MovimentoDeColuna[] = [
      { task_id: "t1", new_value: "col-1", created_at: "2026-09-05T01:00:00Z" },
    ];
    const etapas = gargalosDoFluxo(
      [tarefa()],
      [COLUNA],
      movimentos,
      new Date("2026-09-05T13:00:00Z"),
      "America/Sao_Paulo"
    );
    expect(etapas[0]?.diasMedios).toBe(1);
  });

  it("o mesmo instante em UTC responde zero — é o defeito que existia", () => {
    const movimentos: MovimentoDeColuna[] = [
      { task_id: "t1", new_value: "col-1", created_at: "2026-09-05T01:00:00Z" },
    ];
    const etapas = gargalosDoFluxo(
      [tarefa()],
      [COLUNA],
      movimentos,
      new Date("2026-09-05T13:00:00Z"),
      "UTC"
    );
    expect(etapas[0]?.diasMedios).toBe(0);
  });

  it("não depende do fuso do processo", () => {
    // Roda igual na minha máquina e na Vercel: o fuso vem por parâmetro.
    const movimentos: MovimentoDeColuna[] = [
      { task_id: "t1", new_value: "col-1", created_at: "2026-09-01T12:00:00Z" },
    ];
    const etapas = gargalosDoFluxo(
      [tarefa()],
      [COLUNA],
      movimentos,
      new Date("2026-09-05T13:00:00Z"),
      "America/Sao_Paulo"
    );
    expect(etapas[0]?.diasMedios).toBe(4);
  });

  it("demanda concluída não está parada em lugar nenhum", () => {
    const etapas = gargalosDoFluxo(
      [tarefa({ completed_at: "2026-09-03T12:00:00Z" })],
      [COLUNA],
      [],
      new Date("2026-09-05T13:00:00Z"),
      "America/Sao_Paulo"
    );
    expect(etapas).toHaveLength(0);
  });
});
