import { describe, expect, it } from "vitest";

import { descreverPrazo } from "./deadline";
import {
  contarVisoes,
  aplicarVisao,
  naVisao,
  semanaCorrente,
} from "./quick-views";
import {
  contarFiltrosAtivos,
  estadoDaURL,
  estadoParaURL,
  filterTasks,
  groupTasks,
  sortTasks,
  EMPTY_LIST_FILTERS,
  ESTADO_PADRAO,
} from "./list-view";
import type { Task } from "@/types/database";

/**
 * Esta tela é usada para decidir o que fazer hoje. Cada caso aqui é uma
 * forma de ela mentir: mostrar concluída como atrasada, misturar cancelada
 * com entregue, contar demanda sem prazo como pontual, ou dizer um número
 * de chip que não bate com a lista embaixo dele.
 */

const OBRAS = "s-obras";
const RH = "s-rh";
const ANA = "u-ana";

// Quinta-feira, 3 de setembro de 2026. A semana vai de 31/ago a 6/set.
const AGORA = new Date(2026, 8, 3, 10, 0, 0);

function tarefa(p: Partial<Task>): Task {
  return {
    id: Math.random().toString(36).slice(2),
    workspace_id: "w",
    sector_id: OBRAS,
    assignee_id: null,
    client_id: null,
    column_id: null,
    due_date: null,
    due_time: null,
    priority: "media",
    completed_at: null,
    cancelled_at: null,
    created_at: "2026-09-01T09:00:00-03:00",
    updated_at: "2026-09-01T09:00:00-03:00",
    title: "Demanda",
    ...p,
  } as unknown as Task;
}

describe("visões rápidas", () => {
  it("'Em aberto' exclui concluídas E canceladas", () => {
    const lista = [
      tarefa({ title: "viva" }),
      tarefa({ title: "feita", completed_at: "2026-09-02T10:00:00-03:00" }),
      tarefa({ title: "cancelada", cancelled_at: "2026-09-02T10:00:00-03:00" }),
    ];
    expect(aplicarVisao(lista, "aberto", AGORA).map((t) => t.title)).toEqual([
      "viva",
    ]);
  });

  it("'Concluídas' NÃO inclui canceladas", () => {
    // Cancelada saiu do fluxo por decisão, não por entrega. Somá-las
    // faria o contador dizer que se entregou trabalho que foi abandonado.
    const lista = [
      tarefa({ completed_at: "2026-09-02T10:00:00-03:00" }),
      tarefa({ cancelled_at: "2026-09-02T10:00:00-03:00" }),
    ];
    expect(aplicarVisao(lista, "concluidas", AGORA)).toHaveLength(1);
  });

  it("'Atrasadas' é só o que está ABERTO e venceu", () => {
    const lista = [
      tarefa({ title: "aberta e vencida", due_date: "2026-09-01" }),
      // Entregue depois do prazo: é história, não atraso de hoje.
      tarefa({
        title: "entregue com atraso",
        due_date: "2026-09-01",
        completed_at: "2026-09-02T10:00:00-03:00",
      }),
    ];
    expect(
      aplicarVisao(lista, "atrasadas", AGORA).map((t) => t.title)
    ).toEqual(["aberta e vencida"]);
  });

  it("'Para hoje' é o dia civil de hoje, não as próximas 24 horas", () => {
    const lista = [
      tarefa({ title: "hoje", due_date: "2026-09-03" }),
      tarefa({ title: "amanhã", due_date: "2026-09-04" }),
      tarefa({ title: "ontem", due_date: "2026-09-02" }),
    ];
    expect(aplicarVisao(lista, "hoje", AGORA).map((t) => t.title)).toEqual([
      "hoje",
    ]);
  });

  it("'Esta semana' vai de segunda a domingo", () => {
    expect(semanaCorrente(AGORA)).toEqual({
      de: "2026-08-31",
      ate: "2026-09-06",
    });

    const lista = [
      tarefa({ title: "segunda", due_date: "2026-08-31" }),
      tarefa({ title: "domingo", due_date: "2026-09-06" }),
      tarefa({ title: "segunda que vem", due_date: "2026-09-07" }),
    ];
    expect(aplicarVisao(lista, "semana", AGORA).map((t) => t.title)).toEqual([
      "segunda",
      "domingo",
    ]);
  });

  it("'Sem responsável' só conta demanda viva", () => {
    const lista = [
      tarefa({ title: "órfã" }),
      tarefa({
        title: "órfã mas feita",
        completed_at: "2026-09-02T10:00:00-03:00",
      }),
      tarefa({ title: "com dono", assignee_id: ANA }),
    ];
    expect(
      aplicarVisao(lista, "sem_responsavel", AGORA).map((t) => t.title)
    ).toEqual(["órfã"]);
  });

  it("demanda sem prazo entra em 'Em aberto' e em mais nenhuma de prazo", () => {
    const t = tarefa({});
    expect(naVisao(t, "aberto", AGORA)).toBe(true);
    expect(naVisao(t, "atrasadas", AGORA)).toBe(false);
    expect(naVisao(t, "hoje", AGORA)).toBe(false);
    expect(naVisao(t, "semana", AGORA)).toBe(false);
  });
});

describe("contagem dos chips", () => {
  it("bate exatamente com o que cada visão devolve", () => {
    // É o defeito que este teste existe para impedir: o chip dizer 4 e a
    // lista mostrar 3. Duas implementações do mesmo recorte divergem.
    const lista = [
      tarefa({ due_date: "2026-09-01" }),
      tarefa({ due_date: "2026-09-03", assignee_id: ANA }),
      tarefa({ due_date: "2026-09-05" }),
      tarefa({ completed_at: "2026-09-02T10:00:00-03:00" }),
      tarefa({ cancelled_at: "2026-09-02T10:00:00-03:00" }),
      tarefa({}),
    ];
    const c = contarVisoes(lista, AGORA);

    for (const visao of [
      "aberto",
      "atrasadas",
      "hoje",
      "semana",
      "sem_responsavel",
      "concluidas",
    ] as const) {
      expect(c[visao]).toBe(aplicarVisao(lista, visao, AGORA).length);
    }
  });
});

describe("semântica de prazo", () => {
  it("aberta e vencida é atraso do presente", () => {
    const p = descreverPrazo({ due_date: "2026-09-01" } as Task, AGORA);
    expect(p.tom).toBe("atrasada");
    expect(p.texto).toBe("Atrasada há 2 dias");
  });

  it("CONCLUÍDA fora do prazo não é atraso atual", () => {
    // O defeito mais visível da tela antiga: a data vencida ficava em
    // vermelho mesmo depois de entregue, e quem lia procurava uma ação
    // que não existia.
    const p = descreverPrazo(
      {
        due_date: "2026-09-01",
        completed_at: "2026-09-03T10:00:00-03:00",
      } as Task,
      AGORA
    );
    expect(p.tom).toBe("concluida");
    expect(p.tom).not.toBe("atrasada");
    expect(p.texto).toBe("Concluída com 2 dias de atraso");
  });

  it("concluída no prazo diz quando saiu, não quando venceria", () => {
    const p = descreverPrazo(
      {
        due_date: "2026-09-10",
        completed_at: "2026-09-03T10:00:00-03:00",
      } as Task,
      AGORA
    );
    expect(p.tom).toBe("concluida");
    expect(p.texto).toContain("Concluída em");
  });

  it("cancelada não mostra prazo — ela saiu do fluxo", () => {
    const p = descreverPrazo(
      {
        due_date: "2026-09-01",
        cancelled_at: "2026-09-02T10:00:00-03:00",
      } as Task,
      AGORA
    );
    expect(p.tom).toBe("cancelada");
    expect(p.texto).toBe("Cancelada");
  });

  it("sem prazo diz sem prazo, e não é nem pontual nem atrasada", () => {
    const p = descreverPrazo({} as Task, AGORA);
    expect(p.tom).toBe("sem_prazo");
    expect(p.texto).toBe("Sem prazo");
    expect(p.diasDeAtraso).toBe(0);
  });

  it("hoje com hora mostra a hora", () => {
    const p = descreverPrazo(
      { due_date: "2026-09-03", due_time: "15:00:00" } as Task,
      AGORA
    );
    expect(p.texto).toBe("Hoje, 15h");
    expect(p.titulo).toBe("3 de setembro de 2026, às 15h");
  });

  it("minuto só aparece quando existe", () => {
    const p = descreverPrazo(
      { due_date: "2026-09-03", due_time: "15:30:00" } as Task,
      AGORA
    );
    expect(p.texto).toBe("Hoje, 15h30");
  });

  it("prazo distante vira data, porque ninguém converte 'em 34 dias' de cabeça", () => {
    const p = descreverPrazo({ due_date: "2026-10-07" } as Task, AGORA);
    expect(p.tom).toBe("normal");
    expect(p.texto).toMatch(/out/);
  });
});

describe("fuso horário", () => {
  /**
   * `due_date` é data civil, sem hora e sem fuso. A conta precisa comparar
   * com o dia civil de quem lê — não com o instante em UTC. Em UTC-3, das
   * 21h à meia-noite, o instante já é o dia seguinte, e uma demanda "para
   * hoje" viraria "atrasada" às 21h01.
   */
  it("às 21h30 a demanda de hoje ainda é de hoje, não atrasada", () => {
    const noiteDeHoje = new Date(2026, 8, 3, 21, 30, 0);
    const p = descreverPrazo({ due_date: "2026-09-03" } as Task, noiteDeHoje);
    expect(p.tom).toBe("atencao");
    expect(p.texto).toBe("Hoje");

    expect(
      naVisao(tarefa({ due_date: "2026-09-03" }), "hoje", noiteDeHoje)
    ).toBe(true);
    expect(
      naVisao(tarefa({ due_date: "2026-09-03" }), "atrasadas", noiteDeHoje)
    ).toBe(false);
  });
});

describe("ordenação por urgência", () => {
  it("atrasadas, depois hoje, depois futuro, e sem prazo por último", () => {
    const lista = [
      tarefa({ title: "sem prazo" }),
      tarefa({ title: "futuro", due_date: "2026-09-20" }),
      tarefa({ title: "atrasada", due_date: "2026-08-28" }),
      tarefa({ title: "hoje", due_date: "2026-09-03" }),
    ];
    expect(
      sortTasks(lista, "due", new Map(), AGORA).map((t) => t.title)
    ).toEqual(["atrasada", "hoje", "futuro", "sem prazo"]);
  });

  it("'prazo mais distante' também deixa sem prazo por último", () => {
    // Sem prazo não é "a mais distante de todas" — é outra coisa.
    const lista = [
      tarefa({ title: "sem prazo" }),
      tarefa({ title: "perto", due_date: "2026-09-04" }),
      tarefa({ title: "longe", due_date: "2026-12-01" }),
    ];
    expect(
      sortTasks(lista, "due_desc", new Map(), AGORA).map((t) => t.title)
    ).toEqual(["longe", "perto", "sem prazo"]);
  });

  it("ordena por título respeitando acento", () => {
    const lista = [
      tarefa({ title: "Zebra" }),
      tarefa({ title: "Álvaro" }),
      tarefa({ title: "Banana" }),
    ];
    expect(
      sortTasks(lista, "title_az", new Map(), AGORA).map((t) => t.title)
    ).toEqual(["Álvaro", "Banana", "Zebra"]);
  });
});

describe("filtros combinados", () => {
  const lista = [
    tarefa({ title: "obras urgente", priority: "urgente" }),
    tarefa({ title: "obras normal" }),
    tarefa({ title: "rh urgente", sector_id: RH, priority: "urgente" }),
    tarefa({ title: "obras sem prazo" }),
    tarefa({ title: "obras com prazo", due_date: "2026-09-10" }),
  ];

  it("setor e prioridade se somam", () => {
    const r = filterTasks(
      lista,
      { ...EMPTY_LIST_FILTERS, sectorIds: [OBRAS], priorities: ["urgente"] },
      AGORA
    );
    expect(r.map((t) => t.title)).toEqual(["obras urgente"]);
  });

  it("'só sem prazo' é diferente de 'próximos N dias'", () => {
    const semPrazo = filterTasks(
      lista,
      { ...EMPTY_LIST_FILTERS, temPrazo: "sem" },
      AGORA
    );
    expect(semPrazo.every((t) => !t.due_date)).toBe(true);
    expect(semPrazo).toHaveLength(4);

    const comPrazo = filterTasks(
      lista,
      { ...EMPTY_LIST_FILTERS, temPrazo: "com" },
      AGORA
    );
    expect(comPrazo.map((t) => t.title)).toEqual(["obras com prazo"]);
  });

  it("conta os filtros ligados, sem contar a visão", () => {
    // A visão rápida é navegação, não filtro esquecido. Contá-la faria o
    // badge nascer com 1 e o "Limpar" aparecer sempre.
    expect(contarFiltrosAtivos(EMPTY_LIST_FILTERS)).toBe(0);
    expect(
      contarFiltrosAtivos({
        ...EMPTY_LIST_FILTERS,
        sectorIds: [OBRAS],
        temPrazo: "sem",
      })
    ).toBe(2);
    // A busca também não conta: ela está visível no próprio campo.
    expect(contarFiltrosAtivos({ ...EMPTY_LIST_FILTERS, q: "convite" })).toBe(0);
  });
});

describe("agrupamento", () => {
  it("agrupa por setor com o nome, não com o id", () => {
    const setores = new Map([
      [OBRAS, { id: OBRAS, name: "Obras" }],
      [RH, { id: RH, name: "Recursos humanos" }],
    ]);
    const grupos = groupTasks(
      [tarefa({}), tarefa({ sector_id: RH })],
      "sector",
      {
        clientNameById: new Map(),
        memberNameById: new Map(),
        sectorById: setores as never,
      },
      AGORA
    );
    expect(grupos.map((g) => g.label).sort()).toEqual([
      "Obras",
      "Recursos humanos",
    ]);
  });

  it("agrupa por prioridade com rótulo humano", () => {
    const grupos = groupTasks(
      [tarefa({ priority: "urgente" }), tarefa({ priority: "media" })],
      "priority",
      { clientNameById: new Map(), memberNameById: new Map() },
      AGORA
    );
    expect(grupos.map((g) => g.label).sort()).toEqual(["Normal", "Urgente"]);
  });
});

describe("estado na URL", () => {
  it("ida e volta preserva tudo", () => {
    const estado = {
      visao: "atrasadas" as const,
      filtros: {
        ...EMPTY_LIST_FILTERS,
        q: "convite",
        status: "aberta" as const,
        sectorIds: [OBRAS, RH],
        priorities: ["urgente"],
        assigneeId: ANA,
        temPrazo: "com" as const,
      },
      groupBy: "sector" as const,
      sortBy: "title_az" as const,
    };
    expect(estadoDaURL(new URLSearchParams(estadoParaURL(estado)))).toEqual(
      estado
    );
  });

  it("o padrão não escreve nada na URL", () => {
    // Uma URL cheia de valores padrão diz o mesmo que /lista e é pior de
    // ler, compartilhar e reconhecer no histórico.
    expect(estadoParaURL(ESTADO_PADRAO)).toBe("");
  });

  it("valor inválido na barra de endereço cai no padrão, sem quebrar", () => {
    const e = estadoDaURL(
      new URLSearchParams("visao=xyz&ordenar=abc&agrupar=???&status=nada")
    );
    expect(e.visao).toBe("aberto");
    expect(e.sortBy).toBe("due");
    expect(e.groupBy).toBe("none");
    expect(e.filtros.status).toBe("todas");
  });

  it("o link que o relatório monta continua funcionando", () => {
    // /lista?status=atrasada&prazo=7 é o que `urlDaLista` gera. Se esta
    // leitura mudar, o drill-down do relatório vira um beco.
    const e = estadoDaURL(new URLSearchParams("status=aberta&prazo=7"));
    expect(e.filtros.status).toBe("aberta");
    expect(e.filtros.dueWithinDays).toBe(7);
  });
});
