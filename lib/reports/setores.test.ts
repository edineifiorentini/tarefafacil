import { describe, expect, it } from "vitest";

import { gargalosDoFluxo, etapaQueMaisSegura } from "./gargalos";
import { insightsOperacionais } from "./insights";
import { riscoDePrazo, indicadoresDe, type Periodo } from "./overview";
import {
  classificarSaude,
  linhasPorSetor,
  ordenarSetores,
  LIMITES_DE_SAUDE,
} from "./setores";
import { linhasPorPessoa } from "./equipe";
import { urlDaLista } from "./drill";
import { montarCSV } from "./csv";
import type { Task } from "@/types/database";

const A = "s-a";
const B = "s-b";
const ANA = "u-ana";
const BENTO = "u-bento";

const SETEMBRO: Periodo = { de: "2026-09-01", ate: "2026-09-30" };
const AGORA = new Date(2026, 8, 20, 10, 0, 0);

function tarefa(p: Partial<Task>): Task {
  return {
    id: Math.random().toString(36).slice(2),
    workspace_id: "w",
    sector_id: A,
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

describe("classificarSaude", () => {
  it("demanda atrasada ganha de qualquer taxa", () => {
    // Cem por cento de pontualidade histórica com três demandas vencidas
    // agora não é um setor saudável: são três clientes esperando.
    const s = classificarSaude({
      atrasadas: 3,
      emAtencao: 0,
      pontualidade: 100,
    });
    expect(s.nivel).toBe("critico");
    expect(s.motivo).toContain("3");
  });

  it("pontualidade abaixo do piso é crítica quando há base para dizer isso", () => {
    expect(
      classificarSaude({
        atrasadas: 0,
        emAtencao: 0,
        pontualidade: LIMITES_DE_SAUDE.pontualidadeCritica - 1,
        base: LIMITES_DE_SAUDE.baseMinimaParaJulgar,
      }).nivel
    ).toBe("critico");
  });

  it("taxa sobre amostra pequena NÃO derruba o setor", () => {
    // Apareceu com dados reais em 3/set/2026: cinco de dez setores saíram
    // "Crítico" com ZERO atrasadas, todos por "pontualidade de 67%" — que
    // sobre três entregas é uma entrega. Metade da tabela em vermelho
    // apaga o sinal de quem está mal de verdade.
    const s = classificarSaude({
      atrasadas: 0,
      emAtencao: 0,
      pontualidade: 67,
      base: 3,
    });
    expect(s.nivel).toBe("em_dia");
    // Mas a taxa continua sendo dita: ela é um fato, só não é veredito.
    expect(s.motivo).toContain("67%");
    expect(s.motivo).toContain("3 entregas com prazo");
  });

  it("0% de pontualidade nunca sai como 'Saudável'", () => {
    // Foi o que a tela mostrou em 3/set/2026 depois do primeiro conserto:
    // "Esporte — Saudável — pontualidade de 0%". Nada vencido era verdade,
    // mas "Saudável" é uma afirmação que uma entrega não sustenta.
    expect(
      classificarSaude({
        atrasadas: 0,
        emAtencao: 0,
        pontualidade: 0,
        base: 1,
      }).nivel
    ).toBe("em_dia");
  });

  it("uma única entrega atrasada não faz um setor CRÍTICO", () => {
    // 4 de 5 = 80%: cai em atenção, que é o julgamento proporcional. É por
    // isso que cinco é o piso — com três, a mesma entrega dava 67% e
    // "Crítico".
    expect(
      classificarSaude({
        atrasadas: 0,
        emAtencao: 0,
        pontualidade: 80,
        base: 5,
      }).nivel
    ).toBe("atencao");
  });

  it("com base suficiente e tudo em dia, aí sim é saudável", () => {
    expect(
      classificarSaude({
        atrasadas: 0,
        emAtencao: 0,
        pontualidade: 90,
        base: 10,
      }).nivel
    ).toBe("saudavel");
  });

  it("demanda vencida classifica mesmo sem base nenhuma", () => {
    // Atraso não depende de amostra: é um cliente esperando agora.
    expect(
      classificarSaude({
        atrasadas: 1,
        emAtencao: 0,
        pontualidade: null,
        base: 0,
      }).nivel
    ).toBe("critico");
  });

  it("demanda próxima do vencimento é atenção", () => {
    expect(
      classificarSaude({ atrasadas: 0, emAtencao: 2, pontualidade: 100 }).nivel
    ).toBe("atencao");
  });

  it("pontualidade entre os dois limites é atenção", () => {
    expect(
      classificarSaude({
        atrasadas: 0,
        emAtencao: 0,
        pontualidade: 75,
        base: 8,
      }).nivel
    ).toBe("atencao");
  });

  it("sem base de pontualidade não inventa julgamento — nem para o bem", () => {
    // Um setor que entregou dez demandas sem prazo não é bom nem ruim
    // nessa dimensão. "Saudável" seria uma afirmação; "Sem base" é o fato.
    const s = classificarSaude({
      atrasadas: 0,
      emAtencao: 0,
      pontualidade: null,
    });
    expect(s.nivel).toBe("em_dia");
    expect(s.motivo).toContain("Nenhuma entrega com prazo");
  });

  it("tudo em dia e pontualidade alta é saudável", () => {
    expect(
      classificarSaude({
        atrasadas: 0,
        emAtencao: 0,
        pontualidade: 95,
        base: 20,
      }).nivel
    ).toBe("saudavel");
  });
});

describe("linhasPorSetor", () => {
  it("separa por setor e não cria linha para setor sem movimento", () => {
    // Num workspace com doze setores, oito linhas zeradas escondem as
    // quatro que importam.
    const linhas = linhasPorSetor(
      [
        tarefa({ sector_id: A, created_at: "2026-09-02T09:00:00-03:00" }),
        // Criada e entregue ANTES do período, e nada aberto: B não tem
        // movimento nenhum em setembro.
        tarefa({
          sector_id: B,
          created_at: "2026-08-01T09:00:00-03:00",
          completed_at: "2026-08-10T09:00:00-03:00",
        }),
      ],
      SETEMBRO,
      AGORA
    );
    expect(linhas.map((l) => l.sectorId)).toEqual([A]);
  });

  it("os números da linha batem com os do cartão do topo", () => {
    // O ponto de reusar `indicadoresDe`: o ranking e os cartões não podem
    // divergir por uma condição a mais em um dos dois.
    const tarefas = [
      tarefa({ sector_id: A, due_date: "2026-09-19" }),
      tarefa({
        sector_id: A,
        due_date: "2026-09-05",
        completed_at: "2026-09-04T09:00:00-03:00",
      }),
    ];
    const linha = linhasPorSetor(tarefas, SETEMBRO, AGORA)[0];
    const total = indicadoresDe(tarefas, SETEMBRO, AGORA);
    expect(linha.ind).toEqual(total);
  });

  it("ordena por atenção: crítico antes de saudável", () => {
    const linhas = linhasPorSetor(
      [
        tarefa({ sector_id: A, completed_at: "2026-09-05T09:00:00-03:00" }),
        tarefa({ sector_id: B, due_date: "2026-09-10" }), // vencida
      ],
      SETEMBRO,
      AGORA
    );
    expect(linhas[0].sectorId).toBe(B);
  });

  it("ordenar por pontualidade põe o 'não sei' por último", () => {
    const linhas = ordenarSetores(
      [
        { sectorId: A, pontualidade: 50 } as never,
        { sectorId: B, pontualidade: null } as never,
      ],
      "pontualidade"
    );
    expect(linhas.map((l) => l.sectorId)).toEqual([A, B]);
  });
});

describe("gargalosDoFluxo", () => {
  const COLUNAS = [
    { id: "c1", name: "A fazer", position: 0, is_done_column: false },
    { id: "c2", name: "Em produção", position: 1, is_done_column: false },
    // Mesmo nome, outro setor: o quadro de cada setor é independente.
    { id: "c3", name: "Em produção", position: 1, is_done_column: false },
  ];

  it("agrupa etapas pelo NOME, não pelo id da coluna", () => {
    // "Revisão" do Marketing e "Revisão" das Obras são duas linhas em
    // `board_column`. Num relatório que cruza setores, mostrá-las separadas
    // responderia "quantas colunas existem", não "onde o trabalho para".
    const etapas = gargalosDoFluxo(
      [tarefa({ column_id: "c2" }), tarefa({ column_id: "c3" })],
      COLUNAS,
      [],
      AGORA
    );
    expect(etapas).toHaveLength(1);
    expect(etapas[0].nome).toBe("Em produção");
    expect(etapas[0].quantidade).toBe(2);
    expect(etapas[0].colunaIds.sort()).toEqual(["c2", "c3"]);
  });

  it("ignora demandas concluídas — elas não estão paradas em lugar nenhum", () => {
    const etapas = gargalosDoFluxo(
      [
        tarefa({ column_id: "c1" }),
        tarefa({ column_id: "c1", completed_at: "2026-09-10T09:00:00-03:00" }),
      ],
      COLUNAS,
      [],
      AGORA
    );
    expect(etapas[0].quantidade).toBe(1);
  });

  it("conta o tempo desde a ÚLTIMA entrada na coluna atual", () => {
    // Uma demanda que foi para Revisão e voltou para Produção está em
    // Produção desde a volta, não desde a primeira vez.
    const t = tarefa({
      id: "t1",
      column_id: "c2",
      created_at: "2026-09-01T09:00:00-03:00",
    });
    const etapas = gargalosDoFluxo(
      [t],
      COLUNAS,
      [
        { task_id: "t1", new_value: "c2", created_at: "2026-09-02T09:00:00-03:00" },
        { task_id: "t1", new_value: "c1", created_at: "2026-09-10T09:00:00-03:00" },
        { task_id: "t1", new_value: "c2", created_at: "2026-09-18T09:00:00-03:00" },
      ],
      AGORA
    );
    expect(etapas[0].diasMedios).toBe(2);
  });

  it("sem histórico, conta desde a criação", () => {
    // O gatilho da 0025 é `after update`: a coluna inicial não gera
    // registro. Contar desde a criação é o que é verdade, e está anotado
    // na interface.
    const etapas = gargalosDoFluxo(
      [
        tarefa({
          id: "t1",
          column_id: "c1",
          created_at: "2026-09-15T09:00:00-03:00",
        }),
      ],
      COLUNAS,
      [],
      AGORA
    );
    expect(etapas[0].diasMedios).toBe(5);
  });

  it("demanda sem coluna vai para um balde próprio, não some", () => {
    const etapas = gargalosDoFluxo([tarefa({})], COLUNAS, [], AGORA);
    expect(etapas[0].nome).toBe("Sem etapa");
  });

  it("o destaque olha a ESPERA acumulada, não a quantidade", () => {
    // Dez demandas que chegaram hoje não são gargalo; três paradas há duas
    // semanas são.
    const etapas = gargalosDoFluxo(
      [
        ...Array.from({ length: 10 }, () =>
          tarefa({ column_id: "c1", created_at: "2026-09-20T09:00:00-03:00" })
        ),
        ...Array.from({ length: 3 }, () =>
          tarefa({ column_id: "c2", created_at: "2026-09-01T09:00:00-03:00" })
        ),
      ],
      COLUNAS,
      [],
      AGORA
    );
    expect(etapaQueMaisSegura(etapas)?.etapa.nome).toBe("Em produção");
  });

  it("não aponta gargalo quando nenhuma etapa se destaca", () => {
    // Três etapas com um terço cada: anunciar uma seria sortear um culpado.
    const etapas = gargalosDoFluxo(
      [
        tarefa({ column_id: "c1", created_at: "2026-09-10T09:00:00-03:00" }),
        tarefa({ column_id: "c2", created_at: "2026-09-10T09:00:00-03:00" }),
        tarefa({ column_id: "c3", created_at: "2026-09-10T09:00:00-03:00" }),
      ],
      COLUNAS,
      [],
      AGORA
    );
    // c2 e c3 agrupam no mesmo nome, então há duas etapas: 1/3 e 2/3.
    // A maior tem 66%, acima do limiar — o teste confere o caso contrário.
    expect(etapaQueMaisSegura(etapas, 0.9)).toBeNull();
  });

  it("'Sem etapa' nunca é apontada como gargalo", () => {
    // Não é etapa do fluxo: anunciar que ela concentra 100% da espera é
    // uma frase que não sugere ação nenhuma.
    const etapas = gargalosDoFluxo(
      [
        tarefa({ created_at: "2026-09-01T09:00:00-03:00" }),
        tarefa({ created_at: "2026-09-01T09:00:00-03:00" }),
      ],
      COLUNAS,
      [],
      AGORA
    );
    expect(etapas[0].chave).toContain("sem_etapa");
    expect(etapaQueMaisSegura(etapas)).toBeNull();
  });

  it("sem espera acumulada não há gargalo a apontar", () => {
    const etapas = gargalosDoFluxo(
      [tarefa({ column_id: "c1", created_at: "2026-09-20T09:00:00-03:00" })],
      COLUNAS,
      [],
      AGORA
    );
    expect(etapaQueMaisSegura(etapas)).toBeNull();
  });
});

describe("insightsOperacionais", () => {
  const semGargalo = { etapas: [] };

  it("não diz nada quando a operação está saudável", () => {
    // "Tudo em dia" ocupando o mesmo espaço de "4 demandas atrasadas"
    // treina quem lê a ignorar a área inteira.
    const insights = insightsOperacionais({
      risco: { noPrazo: 5, emAtencao: 0, atrasadas: 0, semPrazo: 0, comPrazo: 5 },
      criadas: 4,
      entregues: 4,
      ...semGargalo,
    });
    expect(insights).toEqual([]);
  });

  it("o mais urgente vem primeiro", () => {
    const insights = insightsOperacionais({
      risco: { noPrazo: 1, emAtencao: 5, atrasadas: 4, semPrazo: 0, comPrazo: 10 },
      criadas: 10,
      entregues: 4,
      ...semGargalo,
    });
    expect(insights[0].id).toBe("atrasadas");
    expect(insights[0].tom).toBe("critico");
  });

  it("no máximo três", () => {
    const insights = insightsOperacionais({
      risco: { noPrazo: 1, emAtencao: 5, atrasadas: 4, semPrazo: 0, comPrazo: 10 },
      criadas: 20,
      entregues: 4,
      etapas: [],
      setorLider: { sectorId: A, nome: "Educação", entregues: 4 },
    });
    expect(insights.length).toBeLessThanOrEqual(3);
  });

  it("não anuncia concentração sem volume que a sustente", () => {
    // "Um setor fez 100% das entregas" quando houve duas entregas é ruído.
    const insights = insightsOperacionais({
      risco: { noPrazo: 2, emAtencao: 0, atrasadas: 0, semPrazo: 0, comPrazo: 2 },
      criadas: 2,
      entregues: 2,
      etapas: [],
      setorLider: { sectorId: A, nome: "Educação", entregues: 2 },
    });
    expect(insights.find((i) => i.id === "lider")).toBeUndefined();
  });

  it("saldo pequeno não vira alerta", () => {
    const insights = insightsOperacionais({
      risco: { noPrazo: 3, emAtencao: 0, atrasadas: 0, semPrazo: 0, comPrazo: 3 },
      criadas: 6,
      entregues: 5,
      ...semGargalo,
    });
    expect(insights.find((i) => i.id === "saldo")).toBeUndefined();
  });
});

describe("linhasPorPessoa", () => {
  it("pessoa da equipe sem demanda aparece zerada", () => {
    // "Ninguém atribuiu nada ao Bento" é exatamente o que um gestor
    // precisa enxergar.
    const linhas = linhasPorPessoa(
      [tarefa({ assignee_id: ANA, due_date: "2026-09-25" })],
      SETEMBRO,
      AGORA,
      [ANA, BENTO]
    );
    const bento = linhas.find((l) => l.userId === BENTO);
    expect(bento).toBeDefined();
    expect(bento?.abertas).toBe(0);
  });

  it("o balde sem responsável só nasce se houver demanda sem dono", () => {
    const semNinguem = linhasPorPessoa(
      [tarefa({ assignee_id: ANA })],
      SETEMBRO,
      AGORA,
      [ANA]
    );
    expect(semNinguem.find((l) => l.userId === null)).toBeUndefined();

    const comOrfa = linhasPorPessoa(
      [tarefa({ assignee_id: null })],
      SETEMBRO,
      AGORA,
      [ANA]
    );
    // E vem primeiro: a demanda que ninguém assumiu é a que mais apodrece.
    expect(comOrfa[0].userId).toBeNull();
  });

  it("calcula pontualidade da pessoa sobre as entregas COM prazo dela", () => {
    const linhas = linhasPorPessoa(
      [
        tarefa({
          assignee_id: ANA,
          due_date: "2026-09-05",
          completed_at: "2026-09-04T09:00:00-03:00",
        }),
        tarefa({
          assignee_id: ANA,
          completed_at: "2026-09-06T09:00:00-03:00",
        }),
      ],
      SETEMBRO,
      AGORA,
      [ANA]
    );
    const ana = linhas.find((l) => l.userId === ANA);
    expect(ana?.ind.entregues).toBe(2);
    expect(ana?.pontualidade).toBe(100);
  });
});

describe("urlDaLista", () => {
  it("atrasadas leva ao filtro de atrasadas da Lista", () => {
    expect(urlDaLista({ tipo: "atrasadas" }, { sectorIds: [], assigneeIds: [] })).toBe(
      "/lista?status=atrasada"
    );
  });

  it("em atenção usa a mesma janela do relatório", () => {
    const url = urlDaLista({ tipo: "atencao" }, { sectorIds: [], assigneeIds: [] });
    expect(url).toContain("status=aberta");
    expect(url).toContain("prazo=7");
  });

  it("carrega os filtros da tela junto", () => {
    // Quem está vendo só Obras e clica em "4 atrasadas" quer as quatro de
    // Obras, não todas do workspace.
    const url = urlDaLista(
      { tipo: "atrasadas" },
      { sectorIds: [A, B], assigneeIds: [ANA] }
    );
    expect(url).toContain(`setores=${A}%2C${B}`);
    expect(url).toContain(`responsavel=${ANA}`);
  });

  it("não filtra por responsável quando há mais de um selecionado", () => {
    // `ListFilters.assigneeId` é singular; mandar o primeiro de três
    // filtraria por alguém que a pessoa não escolheu.
    const url = urlDaLista(
      { tipo: "abertas" },
      { sectorIds: [], assigneeIds: [ANA, BENTO] }
    );
    expect(url).not.toContain("responsavel=");
  });
});

describe("montarCSV", () => {
  const cabecalho = {
    nome: "Relatórios — Visão geral",
    periodo: SETEMBRO,
    setores: ["Obras"],
    responsaveis: [],
    geradoEm: new Date(2026, 8, 20, 14, 30),
  };

  it("registra o período e os filtros no topo do arquivo", () => {
    // Sem eles, daqui a duas semanas ninguém sabe se aquilo era o mês
    // inteiro ou só um setor.
    const csv = montarCSV(cabecalho, ["Setor"], [["Obras"]]);
    expect(csv).toContain("Periodo;01/09/2026 a 30/09/2026");
    expect(csv).toContain("Setores;Obras");
    expect(csv).toContain("Gerado em;20/09/2026 14:30");
  });

  it("diz 'Todos' em vez de deixar a célula vazia", () => {
    const csv = montarCSV(cabecalho, ["Setor"], [["Obras"]]);
    expect(csv).toContain("Responsaveis;Todos");
  });

  it("exporta TODAS as linhas recebidas, não uma página", () => {
    const linhas = Array.from({ length: 40 }, (_, i) => [`Setor ${i}`, i]);
    const csv = montarCSV(cabecalho, ["Setor", "Criadas"], linhas);
    expect(csv.split("\r\n").filter((l) => l.startsWith("Setor "))).toHaveLength(
      40
    );
  });

  it("escapa ponto e vírgula dentro do texto", () => {
    const csv = montarCSV(
      cabecalho,
      ["Setor", "Motivo"],
      [["Obras; e Vias", "2 vencidas"]]
    );
    expect(csv).toContain('"Obras; e Vias"');
  });

  it("decimal sai com vírgula, para o Excel em português somar a coluna", () => {
    // Com ponto, "1.7" chega à planilha como texto e a coluna para de
    // somar. Visto no arquivo gerado em 3/set/2026.
    const csv = montarCSV(cabecalho, ["Setor", "Tempo"], [["Obras", 1.7]]);
    expect(csv).toContain("Obras;1,7");
  });

  it("inteiro continua inteiro, sem separador de milhar", () => {
    const csv = montarCSV(cabecalho, ["Setor", "Criadas"], [["Obras", 1200]]);
    expect(csv).toContain("Obras;1200");
  });

  it("célula nula vira vazia, não a palavra null", () => {
    const csv = montarCSV(cabecalho, ["Setor", "No prazo"], [["Obras", null]]);
    expect(csv).toContain("Obras;");
    expect(csv).not.toContain("null");
  });
});

describe("riscoDePrazo", () => {
  it("o denominador do donut são só as demandas com prazo", () => {
    const ind = indicadoresDe(
      [
        tarefa({ due_date: "2026-09-19" }), // atrasada
        tarefa({ due_date: "2026-09-22" }), // atenção
        tarefa({ due_date: "2026-10-30" }), // no prazo
        tarefa({}), // sem prazo
      ],
      SETEMBRO,
      AGORA
    );
    const r = riscoDePrazo(ind);
    expect(r).toEqual({
      noPrazo: 1,
      emAtencao: 1,
      atrasadas: 1,
      semPrazo: 1,
      comPrazo: 3,
    });
  });
});
