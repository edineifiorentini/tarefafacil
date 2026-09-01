import { describe, expect, it } from "vitest";

import type { Task } from "@/types/database";

import {
  equipeDoRelatorio,
  escopoDe,
  porPessoa,
  riscoDe,
  tarefasDoEscopo,
  type SetorComGestor,
} from "./escalation";

/**
 * A regra que decide quem enxerga o atraso de quem.
 *
 * Errar para MAIS entrega a fila do time inteiro a quem não deveria vê-la.
 * Errar para MENOS devolve o problema que isto existe para resolver: o
 * gestor descobrindo o atraso tarde.
 */

const HOJE = new Date("2026-08-31T12:00:00");

const ANA = "ana";
const BRUNO = "bruno";
const CARLA = "carla";
const OBRAS = "s-obras";
const RH = "s-rh";

function tarefa(p: Partial<Task> & { due_date?: string | null }): Task {
  return {
    id: Math.random().toString(36).slice(2),
    workspace_id: "w",
    sector_id: OBRAS,
    assignee_id: null,
    due_date: null,
    due_time: null,
    completed_at: null,
    cancelled_at: null,
    title: "Demanda",
    ...p,
  } as unknown as Task;
}

describe("escopoDe", () => {
  const setores: SetorComGestor[] = [
    { id: OBRAS, responsavel_id: ANA },
    { id: RH, responsavel_id: null },
  ];

  it("dono enxerga tudo", () => {
    expect(escopoDe(BRUNO, "owner", setores)).toEqual({
      tudo: true,
      setores: [],
    });
  });

  it("admin enxerga tudo", () => {
    expect(escopoDe(BRUNO, "admin", setores).tudo).toBe(true);
  });

  it("gestor enxerga os setores dele, mesmo sendo member comum", () => {
    // A decisão da 0082: ser gestor não exige papel admin, porque admin
    // abriria o módulo financeiro junto.
    const e = escopoDe(ANA, "member", setores);
    expect(e.tudo).toBe(false);
    expect(e.setores).toEqual([OBRAS]);
  });

  it("funcionário sem setor sob gestão não enxerga setor nenhum", () => {
    expect(escopoDe(CARLA, "member", setores)).toEqual({
      tudo: false,
      setores: [],
    });
  });

  it("uma pessoa pode responder por mais de um setor", () => {
    const e = escopoDe(ANA, "member", [
      { id: OBRAS, responsavel_id: ANA },
      { id: RH, responsavel_id: ANA },
    ]);
    expect(e.setores).toEqual([OBRAS, RH]);
  });

  it("papel ausente não vira dono por acidente", () => {
    // `viewer` e undefined não podem cair no ramo do `tudo`.
    expect(escopoDe(ANA, "viewer", setores).tudo).toBe(false);
    expect(escopoDe(ANA, undefined, setores).tudo).toBe(false);
  });
});

describe("tarefasDoEscopo", () => {
  const doObras = tarefa({ sector_id: OBRAS, assignee_id: BRUNO });
  const doRh = tarefa({ sector_id: RH, assignee_id: BRUNO });
  const minhaNoRh = tarefa({ sector_id: RH, assignee_id: ANA });
  const todas = [doObras, doRh, minhaNoRh];

  it("quem enxerga tudo recebe tudo", () => {
    expect(tarefasDoEscopo(todas, { tudo: true, setores: [] }, ANA)).toEqual(
      todas
    );
  });

  it("gestor recebe o setor dele", () => {
    const r = tarefasDoEscopo(todas, { tudo: false, setores: [OBRAS] }, ANA);
    expect(r).toContain(doObras);
    expect(r).not.toContain(doRh);
  });

  it("gestor também recebe as PRÓPRIAS, mesmo fora do setor dele", () => {
    // Quem lidera também entrega. Um relatório de prazos que esconde o
    // próprio atraso não é levado a sério.
    const r = tarefasDoEscopo(todas, { tudo: false, setores: [OBRAS] }, ANA);
    expect(r).toContain(minhaNoRh);
  });

  it("funcionário sem gestão recebe só as próprias", () => {
    const r = tarefasDoEscopo(todas, { tudo: false, setores: [] }, BRUNO);
    expect(r).toHaveLength(2);
    expect(r).not.toContain(minhaNoRh);
  });
});

describe("riscoDe", () => {
  it("prazo passado é atrasada", () => {
    expect(riscoDe(tarefa({ due_date: "2026-08-25" }), HOJE)).toBe("atrasada");
  });

  it("prazo de hoje é vence_hoje", () => {
    expect(riscoDe(tarefa({ due_date: "2026-08-31" }), HOJE)).toBe(
      "vence_hoje"
    );
  });

  it("dentro da janela curta é vence_em_breve", () => {
    expect(riscoDe(tarefa({ due_date: "2026-09-02" }), HOJE)).toBe(
      "vence_em_breve"
    );
  });

  it("prazo distante não é risco", () => {
    expect(riscoDe(tarefa({ due_date: "2026-10-30" }), HOJE)).toBeNull();
  });

  it("concluída não é risco, mesmo vencida", () => {
    expect(
      riscoDe(
        tarefa({ due_date: "2026-08-01", completed_at: "2026-08-02" }),
        HOJE
      )
    ).toBeNull();
  });

  it("cancelada não é risco", () => {
    expect(
      riscoDe(
        tarefa({ due_date: "2026-08-01", cancelled_at: "2026-08-02" }),
        HOJE
      )
    ).toBeNull();
  });

  it("sem prazo não é risco", () => {
    expect(riscoDe(tarefa({ due_date: null }), HOJE)).toBeNull();
  });
});

describe("porPessoa", () => {
  it("agrupa e conta por tipo de risco", () => {
    const linhas = porPessoa(
      [
        tarefa({ assignee_id: BRUNO, due_date: "2026-08-20" }),
        tarefa({ assignee_id: BRUNO, due_date: "2026-08-28" }),
        tarefa({ assignee_id: BRUNO, due_date: "2026-08-31" }),
        tarefa({ assignee_id: CARLA, due_date: "2026-09-01" }),
      ],
      {},
      HOJE
    );
    const bruno = linhas.find((l) => l.userId === BRUNO)!;
    expect(bruno.atrasadas).toBe(2);
    expect(bruno.venceHoje).toBe(1);
    expect(bruno.total).toBe(3);
    expect(bruno.abertas).toBe(3);

    expect(linhas.find((l) => l.userId === CARLA)!.venceEmBreve).toBe(1);
  });

  it("SEM RESPONSÁVEL vira balde próprio, e vem primeiro", () => {
    const linhas = porPessoa(
      [
        tarefa({ assignee_id: BRUNO, due_date: "2026-08-20" }),
        tarefa({ assignee_id: null, due_date: "2026-08-20" }),
      ],
      {},
      HOJE
    );
    expect(linhas[0].userId).toBeNull();
    expect(linhas[0].atrasadas).toBe(1);
  });

  it("ordena por atrasadas, depois por em risco, depois por abertas", () => {
    const linhas = porPessoa(
      [
        tarefa({ assignee_id: CARLA, due_date: "2026-08-20" }),
        tarefa({ assignee_id: CARLA, due_date: "2026-08-21" }),
        tarefa({ assignee_id: BRUNO, due_date: "2026-08-20" }),
      ],
      {},
      HOJE
    );
    expect(linhas[0].userId).toBe(CARLA);
  });

  it("QUEM NÃO TEM RISCO APARECE, se estiver na equipe", () => {
    // O defeito que o dono apontou em 31/ago/2026: listando só exceções,
    // "em dia" e "sem nada atribuído" sumiam do mesmo jeito.
    const linhas = porPessoa(
      [tarefa({ assignee_id: ANA, due_date: "2026-12-01" })],
      { equipe: [ANA, BRUNO] },
      HOJE
    );
    const ana = linhas.find((l) => l.userId === ANA)!;
    expect(ana.total).toBe(0);
    expect(ana.abertas).toBe(1); // em dia: tem trabalho, sem risco

    const bruno = linhas.find((l) => l.userId === BRUNO)!;
    expect(bruno.abertas).toBe(0); // sem nada atribuído — o caso do Igor
  });

  it("`abertas` conta demanda SEM prazo, que não tem risco", () => {
    // Trabalho sem data continua sendo trabalho. Sem isto, quem só tem
    // demanda sem prazo pareceria ocioso.
    const linhas = porPessoa(
      [tarefa({ assignee_id: ANA, due_date: null })],
      { equipe: [ANA] },
      HOJE
    );
    expect(linhas[0].abertas).toBe(1);
    expect(linhas[0].total).toBe(0);
  });

  it("concluída e cancelada não contam como aberta", () => {
    const linhas = porPessoa(
      [
        tarefa({ assignee_id: ANA, completed_at: "2026-08-30" }),
        tarefa({ assignee_id: ANA, cancelled_at: "2026-08-30" }),
      ],
      { equipe: [ANA] },
      HOJE
    );
    expect(linhas[0].abertas).toBe(0);
  });

  it("a janela do relatório é maior que a do sino", () => {
    // 7 dias contra 3: quem planeja a semana precisa enxergar mais longe
    // que quem é interrompido por um alerta.
    const daquiACinco = tarefa({ assignee_id: ANA, due_date: "2026-09-05" });
    expect(riscoDe(daquiACinco, HOJE)).toBeNull();
    const linhas = porPessoa([daquiACinco], {}, HOJE);
    expect(linhas[0].venceEmBreve).toBe(1);
  });

  it("sem equipe e sem demanda, lista vazia", () => {
    expect(porPessoa([], {}, HOJE)).toEqual([]);
  });

  it("balde sem dono NÃO nasce sozinho", () => {
    // Uma linha "Sem responsável: 0" seria ruído permanente.
    const linhas = porPessoa([], { equipe: [ANA] }, HOJE);
    expect(linhas.some((l) => l.userId === null)).toBe(false);
  });
});

describe("equipeDoRelatorio", () => {
  const TODOS = [ANA, BRUNO, CARLA];

  it("dono recebe a lista inteira, para ver quem está ocioso", () => {
    expect(
      equipeDoRelatorio({ tudo: true, setores: [] }, ANA, TODOS)
    ).toEqual(TODOS);
  });

  it("GESTOR DE SETOR não recebe a empresa inteira", () => {
    // O defeito: o escopo dele é "meus setores", e a lista de gente era a
    // empresa toda. O relatório enchia de pessoas de outras áreas, quase
    // todas com "sem demanda".
    expect(
      equipeDoRelatorio({ tudo: false, setores: [OBRAS] }, ANA, TODOS)
    ).toEqual([ANA]);
  });

  it("o gestor sempre aparece, mesmo sem demanda própria", () => {
    // Quem lidera também entrega; esconder o próprio nome tira a
    // credibilidade do relatório.
    const r = equipeDoRelatorio({ tudo: false, setores: [OBRAS] }, CARLA, TODOS);
    expect(r).toContain(CARLA);
  });
});
