import { describe, expect, it } from "vitest";

import {
  aplicarFiltro,
  indicadoresDe,
  riscoDePrazo,
  serieDeFluxo,
  taxaDePontualidade,
  variacaoDeDias,
  variacaoEmPontos,
  variacaoPercentual,
  SEM_RESPONSAVEL,
  type Periodo,
} from "./overview";
import {
  baldesDo,
  diasDoPeriodo,
  granularidadePadrao,
  periodoAnterior,
  resolverPeriodo,
} from "./periodo";
import type { Task } from "@/types/database";

/**
 * Este relatório decide se alguém vai remanejar equipe. Cada caso aqui é
 * uma forma concreta de ele mentir: contar quem não tinha prazo como
 * pontual, transformar "não sei" em zero, chamar de crescimento a primeira
 * semana de uso, ou somar atraso aberto com entrega fora do prazo.
 */

const SETOR_A = "s-a";
const SETOR_B = "s-b";
const ANA = "u-ana";

// Setembro de 2026 inteiro. "Hoje" é dia 20, para haver passado e futuro
// dentro do mesmo período.
const SETEMBRO: Periodo = { de: "2026-09-01", ate: "2026-09-30" };
const AGORA = new Date(2026, 8, 20, 10, 0, 0);

function tarefa(p: Partial<Task>): Task {
  return {
    id: Math.random().toString(36).slice(2),
    workspace_id: "w",
    sector_id: SETOR_A,
    assignee_id: null,
    column_id: null,
    due_date: null,
    completed_at: null,
    cancelled_at: null,
    created_at: "2026-09-01T09:00:00-03:00",
    title: "Demanda",
    ...p,
  } as unknown as Task;
}

describe("indicadoresDe — volume", () => {
  it("conta criadas pela data de criação dentro do período", () => {
    const ind = indicadoresDe(
      [
        tarefa({ created_at: "2026-09-05T10:00:00-03:00" }),
        tarefa({ created_at: "2026-09-29T10:00:00-03:00" }),
        // Fora do período.
        tarefa({ created_at: "2026-08-31T10:00:00-03:00" }),
      ],
      SETEMBRO,
      AGORA
    );
    expect(ind.criadas).toBe(2);
  });

  it("conta entregue a demanda concluída no período mesmo que criada antes", () => {
    // É o ponto do indicador: trabalho antigo que finalmente saiu é
    // produção do período. Amarrá-lo à criação esconderia justamente o
    // que foi mais difícil de entregar.
    const ind = indicadoresDe(
      [
        tarefa({
          created_at: "2026-07-10T09:00:00-03:00",
          completed_at: "2026-09-10T09:00:00-03:00",
        }),
      ],
      SETEMBRO,
      AGORA
    );
    expect(ind.criadas).toBe(0);
    expect(ind.entregues).toBe(1);
  });

  it("cancelada conta como criada, nunca como entregue", () => {
    const ind = indicadoresDe(
      [
        tarefa({
          created_at: "2026-09-02T09:00:00-03:00",
          completed_at: "2026-09-03T09:00:00-03:00",
          cancelled_at: "2026-09-04T09:00:00-03:00",
          due_date: "2026-09-01",
        }),
      ],
      SETEMBRO,
      AGORA
    );
    expect(ind.criadas).toBe(1);
    expect(ind.entregues).toBe(0);
    expect(ind.atrasadasAgora).toBe(0);
  });
});

describe("indicadoresDe — pontualidade", () => {
  it("entrega no dia do prazo é pontual", () => {
    const ind = indicadoresDe(
      [
        tarefa({
          due_date: "2026-09-10",
          completed_at: "2026-09-10T18:00:00-03:00",
        }),
      ],
      SETEMBRO,
      AGORA
    );
    expect(taxaDePontualidade(ind)).toBe(100);
  });

  it("demanda SEM PRAZO fica fora do denominador", () => {
    // O caso que mais distorce o número: dez entregas sem prazo e duas com
    // prazo, uma delas atrasada, é 50% — não 90%.
    const ind = indicadoresDe(
      [
        ...Array.from({ length: 10 }, () =>
          tarefa({ completed_at: "2026-09-05T09:00:00-03:00" })
        ),
        tarefa({
          due_date: "2026-09-05",
          completed_at: "2026-09-04T09:00:00-03:00",
        }),
        tarefa({
          due_date: "2026-09-05",
          completed_at: "2026-09-09T09:00:00-03:00",
        }),
      ],
      SETEMBRO,
      AGORA
    );
    expect(ind.entregues).toBe(12);
    expect(ind.entreguesSemPrazo).toBe(10);
    expect(ind.entreguesComPrazo).toBe(2);
    expect(taxaDePontualidade(ind)).toBe(50);
  });

  it("sem nenhuma entrega com prazo, a pontualidade é null e não zero", () => {
    const ind = indicadoresDe(
      [tarefa({ completed_at: "2026-09-05T09:00:00-03:00" })],
      SETEMBRO,
      AGORA
    );
    expect(taxaDePontualidade(ind)).toBeNull();
  });

  it("entregue DEPOIS do prazo não vira 'atrasada agora'", () => {
    // A distinção que o relatório inteiro depende: uma é história, a outra
    // é o que ainda dá para salvar. Somá-las produz um número que não
    // responde a pergunta nenhuma.
    const ind = indicadoresDe(
      [
        tarefa({
          due_date: "2026-09-02",
          completed_at: "2026-09-08T09:00:00-03:00",
        }),
      ],
      SETEMBRO,
      AGORA
    );
    expect(ind.atrasadasAgora).toBe(0);
    expect(ind.entreguesComPrazo).toBe(1);
    expect(taxaDePontualidade(ind)).toBe(0);
  });
});

describe("indicadoresDe — risco agora", () => {
  it("aberta com prazo vencido é atrasada", () => {
    const ind = indicadoresDe(
      [tarefa({ due_date: "2026-09-19" })],
      SETEMBRO,
      AGORA
    );
    expect(ind.atrasadasAgora).toBe(1);
  });

  it("vence hoje ainda não é atraso — é atenção", () => {
    const ind = indicadoresDe(
      [tarefa({ due_date: "2026-09-20" })],
      SETEMBRO,
      AGORA
    );
    expect(ind.atrasadasAgora).toBe(0);
    expect(ind.emAtencaoAgora).toBe(1);
  });

  it("dentro da janela de 7 dias é atenção; fora dela, no prazo", () => {
    const ind = indicadoresDe(
      [
        tarefa({ due_date: "2026-09-27" }), // último dia da janela
        tarefa({ due_date: "2026-09-28" }), // um dia além
      ],
      SETEMBRO,
      AGORA
    );
    expect(ind.emAtencaoAgora).toBe(1);
    expect(ind.noPrazoAgora).toBe(1);
  });

  it("aberta SEM PRAZO nunca entra em 'no prazo'", () => {
    // Uma demanda sem data combinada não está no prazo: está sem prazo.
    const ind = indicadoresDe([tarefa({})], SETEMBRO, AGORA);
    const r = riscoDePrazo(ind);
    expect(r.noPrazo).toBe(0);
    expect(r.semPrazo).toBe(1);
    expect(r.comPrazo).toBe(0);
  });
});

describe("indicadoresDe — tempo de ciclo", () => {
  it("mede da criação à conclusão", () => {
    const ind = indicadoresDe(
      [
        tarefa({
          created_at: "2026-09-01T09:00:00-03:00",
          completed_at: "2026-09-05T09:00:00-03:00",
        }),
        tarefa({
          created_at: "2026-09-01T09:00:00-03:00",
          completed_at: "2026-09-03T09:00:00-03:00",
        }),
      ],
      SETEMBRO,
      AGORA
    );
    expect(ind.tempoMedioDias).toBe(3);
  });

  it("sem entregas devolve null, não zero", () => {
    // Zero diria "saiu no mesmo dia", que é uma afirmação diferente de
    // "não houve entrega".
    const ind = indicadoresDe([tarefa({})], SETEMBRO, AGORA);
    expect(ind.tempoMedioDias).toBeNull();
  });
});

describe("comparação com o período anterior", () => {
  it("variação percentual usa a base anterior", () => {
    expect(variacaoPercentual(28, 25)).toBe(12);
  });

  it("base zero devolve null, NUNCA 100%", () => {
    // A mentira mais comum de painel, e ela aparece justo no mês de
    // estreia — quando alguém está decidindo se a ferramenta serve.
    expect(variacaoPercentual(6, 0)).toBeNull();
  });

  it("taxas comparam em pontos percentuais, não em porcentagem", () => {
    // De 70% para 79% são +9 p.p. Chamar de +12,9% faria o leitor achar
    // que a pontualidade cresceu treze por cento.
    expect(variacaoEmPontos(79, 70)).toBe(9);
  });

  it("taxa ausente não vira variação", () => {
    expect(variacaoEmPontos(null, 70)).toBeNull();
    expect(variacaoEmPontos(79, null)).toBeNull();
    expect(variacaoDeDias(null, 2)).toBeNull();
  });

  it("período anterior tem a mesma duração e termina na véspera", () => {
    const anterior = periodoAnterior({ de: "2026-09-01", ate: "2026-09-30" });
    expect(anterior).toEqual({ de: "2026-08-02", ate: "2026-08-31" });
    expect(diasDoPeriodo(anterior)).toBe(30);
  });

  it("período vazio não inventa crescimento", () => {
    const anterior = indicadoresDe([], SETEMBRO, AGORA);
    const atual = indicadoresDe(
      [tarefa({ created_at: "2026-09-05T09:00:00-03:00" })],
      SETEMBRO,
      AGORA
    );
    expect(variacaoPercentual(atual.criadas, anterior.criadas)).toBeNull();
  });
});

describe("resolverPeriodo", () => {
  it("'últimos 30 dias' cobre 30 dias, incluindo hoje", () => {
    const p = resolverPeriodo("30d", AGORA);
    expect(p.ate).toBe("2026-09-20");
    expect(diasDoPeriodo(p)).toBe(30);
  });

  it("'mês anterior' vai do dia 1 ao último dia do mês passado", () => {
    expect(resolverPeriodo("mes_anterior", AGORA)).toEqual({
      de: "2026-08-01",
      ate: "2026-08-31",
    });
  });

  it("'este trimestre' começa no primeiro mês do trimestre", () => {
    expect(resolverPeriodo("trimestre", AGORA).de).toBe("2026-07-01");
  });

  it("período personalizado invertido é normalizado, não recusado", () => {
    expect(
      resolverPeriodo("custom", AGORA, { de: "2026-09-30", ate: "2026-09-01" })
    ).toEqual({ de: "2026-09-01", ate: "2026-09-30" });
  });

  it("período personalizado sem as duas pontas cai no padrão", () => {
    expect(resolverPeriodo("custom", AGORA, { de: "", ate: "" })).toEqual(
      resolverPeriodo("30d", AGORA)
    );
  });
});

describe("fuso horário", () => {
  /**
   * O defeito que `lib/dates/day.ts` documenta: em UTC-3, das 21h à
   * meia-noite, `toISOString().slice(0,10)` já é o dia seguinte. Uma
   * demanda entregue às 21h30 do dia 30 cairia FORA de um período que
   * termina no dia 30 — e o mês fecharia com uma entrega a menos.
   */
  it("entrega às 21h30 do último dia conta no período, não no seguinte", () => {
    const ind = indicadoresDe(
      [
        tarefa({
          created_at: "2026-09-01T09:00:00-03:00",
          completed_at: "2026-09-30T21:30:00-03:00",
        }),
      ],
      SETEMBRO,
      new Date(2026, 9, 1, 10, 0, 0)
    );
    expect(ind.entregues).toBe(1);
  });

  it("prazo é data civil e é comparado como tal", () => {
    // `due_date` não tem hora nem fuso. Concluir às 23h do dia do prazo
    // continua sendo pontual.
    const ind = indicadoresDe(
      [
        tarefa({
          due_date: "2026-09-15",
          completed_at: "2026-09-15T23:00:00-03:00",
        }),
      ],
      SETEMBRO,
      AGORA
    );
    expect(taxaDePontualidade(ind)).toBe(100);
  });
});

describe("serieDeFluxo", () => {
  it("distribui criadas e entregues pelos baldes e calcula o saldo", () => {
    const baldes = baldesDo({ de: "2026-09-01", ate: "2026-09-04" }, "dia");
    const pontos = serieDeFluxo(
      [
        tarefa({ created_at: "2026-09-01T09:00:00-03:00" }),
        tarefa({ created_at: "2026-09-01T15:00:00-03:00" }),
        tarefa({
          created_at: "2026-09-02T09:00:00-03:00",
          completed_at: "2026-09-03T09:00:00-03:00",
        }),
      ],
      baldes
    );

    expect(pontos).toHaveLength(4);
    expect(pontos[0]).toMatchObject({ criadas: 2, entregues: 0, saldo: 2 });
    expect(pontos[1]).toMatchObject({ criadas: 1, entregues: 0, saldo: 1 });
    expect(pontos[2]).toMatchObject({ criadas: 0, entregues: 1, saldo: -1 });
  });

  it("o último balde da semana é recortado ao fim do período", () => {
    // Arredondar para a semana cheia faria o gráfico contar demandas de
    // fora do filtro, e o total do gráfico divergiria dos cartões.
    const baldes = baldesDo({ de: "2026-09-01", ate: "2026-09-10" }, "semana");
    expect(baldes[baldes.length - 1].ate).toBe("2026-09-10");
    expect(baldes[0]).toMatchObject({ de: "2026-09-01", ate: "2026-09-07" });
  });

  it("escolhe o grão pelo tamanho do período", () => {
    expect(granularidadePadrao({ de: "2026-09-01", ate: "2026-09-20" })).toBe(
      "dia"
    );
    expect(granularidadePadrao({ de: "2026-06-01", ate: "2026-09-01" })).toBe(
      "semana"
    );
    expect(granularidadePadrao({ de: "2026-01-01", ate: "2026-12-31" })).toBe(
      "mes"
    );
  });
});

describe("aplicarFiltro", () => {
  const lista = [
    tarefa({ sector_id: SETOR_A, assignee_id: ANA }),
    tarefa({ sector_id: SETOR_B, assignee_id: ANA }),
    tarefa({ sector_id: SETOR_A, assignee_id: null }),
  ];

  it("sem filtro devolve tudo", () => {
    expect(aplicarFiltro(lista, { sectorIds: [], assigneeIds: [] })).toHaveLength(
      3
    );
  });

  it("filtra por setor", () => {
    expect(
      aplicarFiltro(lista, { sectorIds: [SETOR_A], assigneeIds: [] })
    ).toHaveLength(2);
  });

  it("combina setor e responsável", () => {
    expect(
      aplicarFiltro(lista, { sectorIds: [SETOR_A], assigneeIds: [ANA] })
    ).toHaveLength(1);
  });

  it("'sem responsável' é um filtro de verdade, não a ausência de filtro", () => {
    const r = aplicarFiltro(lista, {
      sectorIds: [],
      assigneeIds: [SEM_RESPONSAVEL],
    });
    expect(r).toHaveLength(1);
    expect(r[0].assignee_id).toBeNull();
  });
});
