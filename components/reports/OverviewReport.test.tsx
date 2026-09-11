import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  indicadoresDe,
  riscoDePrazo,
  serieDeFluxo,
} from "@/lib/reports/overview";
import { baldesDo, type Periodo } from "@/lib/reports/periodo";
import { reprogramacoesDoPeriodo } from "@/lib/reports/reprogramacoes";
import { linhasPorSetor } from "@/lib/reports/setores";
import type { Task } from "@/types/database";

import { DeadlineRescheduleCard } from "./DeadlineRescheduleCard";
import { DeadlineRiskCard } from "./DeadlineRiskCard";
import { DemandFlowChart } from "./DemandFlowChart";
import { SectorDetailTable } from "./SectorDetailTable";

/**
 * A tela renderizando com dados de verdade.
 *
 * Os testes de `lib/reports` provam as CONTAS. Estes provam que o número
 * certo chega à tela e que quem não enxerga o gráfico consegue ler o mesmo
 * conteúdo — que é onde um relatório costuma falhar sem ninguém notar: a
 * conta está certa e a tela mostra outra coisa.
 */

const OBRAS = "s-obras";
const RH = "s-rh";
const SETEMBRO: Periodo = { de: "2026-09-01", ate: "2026-09-30" };
const AGORA = new Date(2026, 8, 20, 10, 0, 0);

const NOMES = new Map([
  [OBRAS, "Obras"],
  [RH, "Recursos humanos"],
]);
const CORES = new Map([
  [OBRAS, "#2563EB"],
  [RH, "#7C3AED"],
]);

function tarefa(p: Partial<Task>): Task {
  return {
    id: Math.random().toString(36).slice(2),
    workspace_id: "w",
    sector_id: OBRAS,
    assignee_id: null,
    column_id: null,
    due_date: null,
    completed_at: null,
    cancelled_at: null,
    created_at: "2026-09-02T09:00:00-03:00",
    title: "Demanda",
    ...p,
  } as unknown as Task;
}

describe("DeadlineRiskCard", () => {
  it("mostra os três grupos e separa as demandas SEM PRAZO", () => {
    // A separação é o ponto do cartão: uma demanda sem data combinada não
    // está "no prazo", e somá-la ao verde inventaria tranquilidade.
    const ind = indicadoresDe(
      [
        tarefa({ due_date: "2026-09-19" }),
        tarefa({ due_date: "2026-09-22" }),
        tarefa({ due_date: "2026-10-30" }),
        tarefa({}),
        tarefa({}),
      ],
      SETEMBRO,
      AGORA
    );

    render(<DeadlineRiskCard risco={riscoDePrazo(ind)} onVerRisco={vi.fn()} />);

    // O donut fala só das que têm prazo.
    expect(screen.getByRole("img")).toHaveAccessibleName(
      /3 demandas abertas com prazo/
    );
    // E as sem prazo aparecem por escrito, fora da conta.
    expect(screen.getByText(/2/)).toBeInTheDocument();
    expect(
      screen.getByText(/não têm prazo e ficam fora desta conta/)
    ).toBeInTheDocument();
  });

  it("sem nenhuma demanda com prazo, diz isso em vez de desenhar um donut vazio", () => {
    const ind = indicadoresDe([tarefa({}), tarefa({})], SETEMBRO, AGORA);
    render(<DeadlineRiskCard risco={riscoDePrazo(ind)} onVerRisco={vi.fn()} />);
    expect(
      screen.getByText(/não há risco de prazo a calcular/)
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("clicar numa fatia leva ao drill correspondente", async () => {
    const aoVerFatia = vi.fn();
    const ind = indicadoresDe(
      [tarefa({ due_date: "2026-09-19" })],
      SETEMBRO,
      AGORA
    );

    render(
      <DeadlineRiskCard
        risco={riscoDePrazo(ind)}
        onVerRisco={vi.fn()}
        onVerFatia={aoVerFatia}
      />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Ver as 1 demandas atrasadas" })
    );
    expect(aoVerFatia).toHaveBeenCalledWith("atrasadas");
  });
});

describe("DemandFlowChart", () => {
  const pontos = serieDeFluxo(
    [
      tarefa({ created_at: "2026-09-01T09:00:00-03:00" }),
      tarefa({ created_at: "2026-09-01T15:00:00-03:00" }),
      tarefa({
        created_at: "2026-09-02T09:00:00-03:00",
        completed_at: "2026-09-03T09:00:00-03:00",
      }),
    ],
    baldesDo({ de: "2026-09-01", ate: "2026-09-04" }, "dia")
  );

  it("descreve a CONCLUSÃO do gráfico, não o desenho", () => {
    // "Gráfico de linhas com duas séries" descreve o desenho. Quem não o
    // enxerga precisa da informação: a fila cresceu ou encolheu.
    render(<DemandFlowChart pontos={pontos} grao="dia" onGrao={vi.fn()} />);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      /3 criadas e 1 entregues no período — entraram 2 a mais do que saíram/
    );
  });

  it("oferece os mesmos números em tabela", () => {
    render(<DemandFlowChart pontos={pontos} grao="dia" onGrao={vi.fn()} />);
    const tabela = screen.getByRole("table", {
      name: /criadas e entregues por intervalo/i,
    });
    // 01/09: duas criadas, nenhuma entregue, saldo +2. A tabela usa a data
    // por extenso; o rótulo curto é só do eixo, onde falta espaço.
    const primeira = within(tabela).getAllByRole("row")[1];
    expect(within(primeira).getByText("01/09/2026")).toBeInTheDocument();
    expect(within(primeira).getByText("+2")).toBeInTheDocument();
  });

  it("o seletor de grão some quando o período é diário", () => {
    // Num período de sete dias, "Mês" desenharia um ponto só.
    render(<DemandFlowChart pontos={pontos} grao="dia" onGrao={vi.fn()} />);
    expect(
      screen.queryByRole("group", { name: /agrupamento/i })
    ).not.toBeInTheDocument();
  });

  it("com período longo, trocar o grão avisa quem controla", async () => {
    const aoGrao = vi.fn();
    render(<DemandFlowChart pontos={pontos} grao="semana" onGrao={aoGrao} />);
    await userEvent.click(screen.getByRole("button", { name: "Mês" }));
    expect(aoGrao).toHaveBeenCalledWith("mes");
  });

  it("período sem nenhuma demanda mostra o estado vazio do próprio gráfico", () => {
    render(<DemandFlowChart pontos={[]} grao="dia" onGrao={vi.fn()} />);
    expect(
      screen.getByText(/Nenhuma demanda criada ou entregue neste período/)
    ).toBeInTheDocument();
  });
});

describe("SectorDetailTable", () => {
  const linhas = linhasPorSetor(
    [
      // Obras: uma vencida (crítico) e uma entregue com atraso.
      tarefa({ sector_id: OBRAS, due_date: "2026-09-10" }),
      tarefa({
        sector_id: OBRAS,
        due_date: "2026-09-05",
        completed_at: "2026-09-08T09:00:00-03:00",
      }),
      // RH: entregue no prazo, nada aberto.
      tarefa({
        sector_id: RH,
        due_date: "2026-09-12",
        completed_at: "2026-09-11T09:00:00-03:00",
      }),
    ],
    SETEMBRO,
    AGORA
  );

  function montar() {
    return render(
      <SectorDetailTable
        linhas={linhas}
        nomes={NOMES}
        cores={CORES}
        onSelecionarSetor={vi.fn()}
      />
    );
  }

  it("marca a coluna ordenada com aria-sort", () => {
    montar();
    const cabecalho = screen.getByRole("columnheader", { name: /Atrasadas/ });
    expect(cabecalho).toHaveAttribute("aria-sort", "descending");
  });

  it("clicar num cabeçalho inverte a ordem e atualiza o aria-sort", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: /Criadas/ }));
    expect(
      screen.getByRole("columnheader", { name: /Criadas/ })
    ).toHaveAttribute("aria-sort", "descending");

    await userEvent.click(screen.getByRole("button", { name: /Criadas/ }));
    expect(
      screen.getByRole("columnheader", { name: /Criadas/ })
    ).toHaveAttribute("aria-sort", "ascending");
  });

  it("o risco não depende só da cor: tem texto e motivo", () => {
    montar();
    // Obras tem uma demanda vencida em aberto.
    expect(screen.getByText("Crítico")).toBeInTheDocument();
    expect(
      screen.getByText(/1 demanda vencida e ainda em aberto/)
    ).toBeInTheDocument();
  });

  it("a busca filtra as linhas", async () => {
    montar();
    await userEvent.type(screen.getByRole("searchbox"), "recursos");

    expect(screen.queryByText("Obras")).not.toBeInTheDocument();
    expect(screen.getByText("Recursos humanos")).toBeInTheDocument();
  });

  it("busca sem resultado explica, em vez de mostrar tabela vazia", async () => {
    montar();
    await userEvent.type(screen.getByRole("searchbox"), "jurídico");
    expect(screen.getByText(/Nenhum setor com/)).toBeInTheDocument();
  });

  it("'—' em vez de 0% quando não houve entrega com prazo", () => {
    // Zero por cento é uma afirmação; "não sei" é outra.
    const semPrazo = linhasPorSetor(
      [
        tarefa({
          sector_id: OBRAS,
          completed_at: "2026-09-08T09:00:00-03:00",
        }),
      ],
      SETEMBRO,
      AGORA
    );
    render(
      <SectorDetailTable
        linhas={semPrazo}
        nomes={NOMES}
        cores={CORES}
        onSelecionarSetor={vi.fn()}
      />
    );
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});

describe("DeadlineRescheduleCard", () => {
  const porMotivo = reprogramacoesDoPeriodo(
    [
      {
        task_id: "a",
        motivo: "cliente_pediu_mudanca",
        created_at: "2026-09-05T10:00:00-03:00",
      },
      {
        task_id: "b",
        motivo: "aguardando_cliente",
        created_at: "2026-09-06T10:00:00-03:00",
      },
      {
        task_id: "b",
        motivo: "aguardando_cliente",
        created_at: "2026-09-12T10:00:00-03:00",
      },
    ],
    new Set(["a", "b"]),
    SETEMBRO,
    "America/Sao_Paulo"
  );

  function montar(
    p: Partial<Parameters<typeof DeadlineRescheduleCard>[0]> = {}
  ) {
    render(
      <DeadlineRescheduleCard
        base={14}
        noPrazo={12}
        noPrazoOriginal={10}
        pontual={86}
        pontualOriginal={71}
        reprogramacoes={porMotivo}
        carregando={false}
        erro={false}
        onTentarDeNovo={vi.fn()}
        {...p}
      />
    );
  }

  it("mostra os dois prazos lado a lado, com a base de cada número", () => {
    montar();
    expect(screen.getByText("86%")).toBeInTheDocument();
    expect(screen.getByText("No prazo combinado")).toBeInTheDocument();
    expect(screen.getByText("12 de 14 entregas")).toBeInTheDocument();
    expect(screen.getByText("71%")).toBeInTheDocument();
    expect(screen.getByText("No prazo original")).toBeInTheDocument();
    expect(screen.getByText("10 de 14 entregas")).toBeInTheDocument();
    // A diferença dita em entregas, e o tamanho dela em pontos.
    expect(
      screen.getByText(
        /2 entregas só ficaram no prazo porque o prazo mudou: 15 p.p./
      )
    ).toBeInTheDocument();
  });

  it("lista os motivos do mais frequente ao menos", () => {
    montar();
    const itens = screen.getAllByRole("listitem");
    expect(itens[0]).toHaveTextContent("Aguardando retorno do cliente");
    expect(itens[0]).toHaveTextContent("2");
    expect(itens[1]).toHaveTextContent("Cliente pediu mudança");
    expect(
      screen.getByText("3 reprogramações em 2 demandas")
    ).toBeInTheDocument();
  });

  it("sem entrega com prazo, '—' em vez de 0%", () => {
    montar({
      base: 0,
      noPrazo: 0,
      noPrazoOriginal: 0,
      pontual: null,
      pontualOriginal: null,
    });
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("período sem reprogramação diz isso, em vez de mostrar uma lista vazia", () => {
    montar({ reprogramacoes: { total: 0, demandas: 0, porMotivo: [] } });
    expect(
      screen.getByText("Nenhum prazo foi reprogramado neste período.")
    ).toBeInTheDocument();
  });
});
