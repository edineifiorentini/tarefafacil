import { describe, expect, it } from "vitest";

import type { Task } from "@/types/database";

import {
  paraCSV,
  pontualidade,
  relatorioPorSetor,
  type Periodo,
} from "./sector";

/**
 * Este relatório vai para o CEO. Cada caso aqui é uma forma de ele mentir:
 * contar cancelada como entrega, chamar de pontual quem não tinha prazo, ou
 * mostrar zero onde a resposta é "não sei".
 */

const OBRAS = "s-obras";
const RH = "s-rh";
const AGOSTO: Periodo = { de: "2026-08-01", ate: "2026-08-31" };
const HOJE = "2026-08-31";

function tarefa(p: Partial<Task>): Task {
  return {
    id: Math.random().toString(36).slice(2),
    workspace_id: "w",
    sector_id: OBRAS,
    assignee_id: null,
    due_date: null,
    completed_at: null,
    cancelled_at: null,
    created_at: "2026-08-01T09:00:00-03:00",
    title: "Demanda",
    ...p,
  } as unknown as Task;
}

describe("relatorioPorSetor — volume", () => {
  it("conta criadas e entregues no período", () => {
    const r = relatorioPorSetor(
      [
        tarefa({ created_at: "2026-08-05T10:00:00-03:00" }),
        tarefa({
          created_at: "2026-08-05T10:00:00-03:00",
          completed_at: "2026-08-10T10:00:00-03:00",
        }),
      ],
      AGOSTO,
      HOJE
    );
    expect(r[0].criadas).toBe(2);
    expect(r[0].entregues).toBe(1);
  });

  it("criada fora do período não conta", () => {
    const r = relatorioPorSetor(
      [tarefa({ created_at: "2026-07-20T10:00:00-03:00" })],
      AGOSTO,
      HOJE
    );
    expect(r).toEqual([]);
  });

  it("criada em julho e entregue em agosto conta só a entrega", () => {
    // O caso comum de virada de mês. Contá-la como criada inflaria o
    // volume de entrada do período.
    const r = relatorioPorSetor(
      [
        tarefa({
          created_at: "2026-07-20T10:00:00-03:00",
          completed_at: "2026-08-03T10:00:00-03:00",
        }),
      ],
      AGOSTO,
      HOJE
    );
    expect(r[0].criadas).toBe(0);
    expect(r[0].entregues).toBe(1);
  });

  it("CANCELADA não é entrega nem atraso", () => {
    const r = relatorioPorSetor(
      [
        tarefa({
          created_at: "2026-08-02T10:00:00-03:00",
          cancelled_at: "2026-08-04T10:00:00-03:00",
          due_date: "2026-08-01",
        }),
      ],
      AGOSTO,
      HOJE
    );
    expect(r[0].criadas).toBe(1);
    expect(r[0].entregues).toBe(0);
    expect(r[0].atrasadasAgora).toBe(0);
  });

  it("separa por setor", () => {
    const r = relatorioPorSetor(
      [
        tarefa({ sector_id: OBRAS, created_at: "2026-08-02T10:00:00-03:00" }),
        tarefa({ sector_id: RH, created_at: "2026-08-02T10:00:00-03:00" }),
      ],
      AGOSTO,
      HOJE
    );
    expect(r).toHaveLength(2);
  });

  it("setor sem movimento nenhum não vira linha", () => {
    // Num workspace com doze setores, oito linhas zeradas escondem as
    // quatro que importam.
    expect(relatorioPorSetor([], AGOSTO, HOJE)).toEqual([]);
  });
});

describe("relatorioPorSetor — pontualidade", () => {
  it("entregue até a data é pontual; depois, não", () => {
    const r = relatorioPorSetor(
      [
        tarefa({
          created_at: "2026-08-01T10:00:00-03:00",
          due_date: "2026-08-10",
          completed_at: "2026-08-09T10:00:00-03:00",
        }),
        tarefa({
          created_at: "2026-08-01T10:00:00-03:00",
          due_date: "2026-08-10",
          completed_at: "2026-08-12T10:00:00-03:00",
        }),
      ],
      AGOSTO,
      HOJE
    );
    expect(r[0].entregues).toBe(2);
    expect(r[0].entreguesNoPrazo).toBe(1);
  });

  it("entregue NO DIA do prazo é pontual", () => {
    // Fronteira: `<=` e não `<`. Entregar no dia combinado é cumprir.
    const r = relatorioPorSetor(
      [
        tarefa({
          created_at: "2026-08-01T10:00:00-03:00",
          due_date: "2026-08-10",
          completed_at: "2026-08-10T23:00:00-03:00",
        }),
      ],
      AGOSTO,
      HOJE
    );
    expect(r[0].entreguesNoPrazo).toBe(1);
  });

  it("SEM PRAZO não entra em pontual nem em atrasada", () => {
    // Jogá-la em qualquer um dos lados inventa um número.
    const r = relatorioPorSetor(
      [
        tarefa({
          created_at: "2026-08-01T10:00:00-03:00",
          completed_at: "2026-08-05T10:00:00-03:00",
        }),
      ],
      AGOSTO,
      HOJE
    );
    expect(r[0].entregues).toBe(1);
    expect(r[0].semPrazo).toBe(1);
    expect(r[0].entreguesNoPrazo).toBe(0);
  });

  it("pontualidade usa a base SEM as sem-prazo", () => {
    const l = {
      sectorId: OBRAS,
      criadas: 0,
      entregues: 10,
      entreguesNoPrazo: 2,
      semPrazo: 8,
      atrasadasAgora: 0,
      diasMedios: 3,
    };
    // 2 de 2 com prazo = 100%, não 20% de 10.
    expect(pontualidade(l)).toEqual({ pct: 100, base: 2 });
  });

  it("pontualidade é null quando ninguém tinha prazo", () => {
    expect(
      pontualidade({
        sectorId: OBRAS,
        criadas: 0,
        entregues: 5,
        entreguesNoPrazo: 0,
        semPrazo: 5,
        atrasadasAgora: 0,
        diasMedios: 1,
      })
    ).toEqual({ pct: null, base: 0 });
  });
});

describe("relatorioPorSetor — tempo e atraso", () => {
  it("dias médios contam da criação à conclusão", () => {
    const r = relatorioPorSetor(
      [
        tarefa({
          created_at: "2026-08-01T10:00:00-03:00",
          completed_at: "2026-08-05T10:00:00-03:00",
        }),
        tarefa({
          created_at: "2026-08-01T10:00:00-03:00",
          completed_at: "2026-08-11T10:00:00-03:00",
        }),
      ],
      AGOSTO,
      HOJE
    );
    expect(r[0].diasMedios).toBe(7); // (4 + 10) / 2
  });

  it("nada entregue devolve NULL, não zero", () => {
    // Zero significaria "entregue no mesmo dia". A resposta certa é "não
    // dá para dizer".
    const r = relatorioPorSetor(
      [tarefa({ created_at: "2026-08-02T10:00:00-03:00" })],
      AGOSTO,
      HOJE
    );
    expect(r[0].diasMedios).toBeNull();
  });

  it("atrasadasAgora é retrato de hoje, não do período", () => {
    const r = relatorioPorSetor(
      [
        tarefa({ created_at: "2026-08-02T10:00:00-03:00", due_date: "2026-08-20" }),
        tarefa({ created_at: "2026-08-02T10:00:00-03:00", due_date: "2026-09-30" }),
      ],
      AGOSTO,
      HOJE
    );
    expect(r[0].atrasadasAgora).toBe(1);
  });

  it("concluída vencida NÃO conta como atrasada agora", () => {
    // Ela saiu; o atraso dela já foi medido na pontualidade.
    const r = relatorioPorSetor(
      [
        tarefa({
          created_at: "2026-08-02T10:00:00-03:00",
          due_date: "2026-08-05",
          completed_at: "2026-08-20T10:00:00-03:00",
        }),
      ],
      AGOSTO,
      HOJE
    );
    expect(r[0].atrasadasAgora).toBe(0);
  });

  it("ordena por atrasadas agora, depois por entregues", () => {
    const r = relatorioPorSetor(
      [
        tarefa({ sector_id: RH, created_at: "2026-08-02T10:00:00-03:00", completed_at: "2026-08-03T10:00:00-03:00" }),
        tarefa({ sector_id: OBRAS, created_at: "2026-08-02T10:00:00-03:00", due_date: "2026-08-10" }),
      ],
      AGOSTO,
      HOJE
    );
    expect(r[0].sectorId).toBe(OBRAS);
  });
});

describe("paraCSV", () => {
  const linhas = relatorioPorSetor(
    [
      tarefa({
        created_at: "2026-08-01T10:00:00-03:00",
        due_date: "2026-08-10",
        completed_at: "2026-08-09T10:00:00-03:00",
      }),
    ],
    AGOSTO,
    HOJE
  );

  it("separa por ponto e vírgula", () => {
    // O Excel em português abre CSV de vírgula tudo numa coluna só, e quem
    // recebe acha que o relatório quebrou.
    const csv = paraCSV(linhas, () => "Obras", AGOSTO);
    expect(csv).toContain("Setor;Criadas;Entregues");
    expect(csv).toContain("Obras;1;1;1;0;100;8;0");
  });

  it("declara o período no topo", () => {
    expect(paraCSV(linhas, () => "Obras", AGOSTO)).toContain(
      "Periodo;2026-08-01 a 2026-08-31"
    );
  });

  it("escapa nome de setor com ponto e vírgula", () => {
    const csv = paraCSV(linhas, () => 'Obras; Vias e "Praças"', AGOSTO);
    expect(csv).toContain('"Obras; Vias e ""Praças"""');
  });

  it("célula sem valor sai vazia, não como 'null'", () => {
    const semEntrega = relatorioPorSetor(
      [tarefa({ created_at: "2026-08-02T10:00:00-03:00" })],
      AGOSTO,
      HOJE
    );
    const csv = paraCSV(semEntrega, () => "Obras", AGOSTO);
    expect(csv).not.toContain("null");
    expect(csv).toContain("Obras;1;0;0;0;;;0");
  });
});
