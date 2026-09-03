"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconChartBar,
  IconChartLine,
  IconClock,
  IconFileText,
  IconLayoutGrid,
  IconProgressCheck,
  IconTargetArrow,
} from "@tabler/icons-react";

import { ChartCard } from "@/components/ui/ChartCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { escopoDe, tarefasDoEscopo } from "@/lib/notifications/escalation";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useSectors } from "@/lib/queries/useSectors";
import { useTasks } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { montarCSV, nomeDoArquivo } from "@/lib/reports/csv";
import { urlDaLista, type Drill } from "@/lib/reports/drill";
import type { EtapaDoFluxo } from "@/lib/reports/gargalos";
import { insightsOperacionais } from "@/lib/reports/insights";
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
} from "@/lib/reports/overview";
import {
  baldesDo,
  granularidadePadrao,
  periodoAnterior,
  rotuloDoPeriodo,
  type Granularidade,
} from "@/lib/reports/periodo";
import { linhasPorSetor, ROTULO_DE_SAUDE } from "@/lib/reports/setores";

import { DeadlineRiskCard } from "./DeadlineRiskCard";
import { DemandFlowChart } from "./DemandFlowChart";
import { OperationalInsights } from "./OperationalInsights";
import { ReportFilters } from "./ReportFilters";
import { SectorDetailTable } from "./SectorDetailTable";
import { SectorPerformanceCard } from "./SectorPerformanceCard";
import { WorkflowBottleneckCard } from "./WorkflowBottleneckCard";
import type { FiltrosDoRelatorio } from "./useReportFilters";

/**
 * A visão geral: saúde, diagnóstico, detalhamento — nessa ordem.
 *
 * ARQUITETURA DE DADOS, e por que ela é o que é:
 *
 * As demandas saem de `useTasks`, que o aplicativo inteiro já mantém em
 * cache — o quadro, a lista e o painel leem dele. Calcular aqui não custa
 * uma requisição sequer, e os números do relatório ficam idênticos aos do
 * resto do produto por construção, não por coincidência.
 *
 * A ÚNICA coisa que vem de rota própria é o tempo por etapa: ele depende de
 * `task_activity`, que é uma linha por movimentação de qualquer demanda
 * desde a migration 0025. Mandá-la ao navegador para extrair cinco números
 * seria trocar kilobytes por megabytes. O agregado é calculado no servidor
 * e volta pronto.
 *
 * Uma requisição, não uma por cartão.
 */

function baixarCSV(conteudo: string, nome: string) {
  // BOM: sem ele o Excel lê "Manutenção" como "ManutenÃ§Ã£o".
  const blob = new Blob(["﻿" + conteudo], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

type RespostaDasEtapas = {
  etapas: EtapaDoFluxo[];
  semHistorico: number;
  totalAbertas: number;
};

export function OverviewReport({
  filtros,
  alterar,
  limpar,
  temFiltro,
  agora,
}: {
  filtros: FiltrosDoRelatorio;
  alterar: (m: Partial<Omit<FiltrosDoRelatorio, "periodo">>) => void;
  limpar: () => void;
  temFiltro: boolean;
  agora: Date;
}) {
  const router = useRouter();
  const workspace = useWorkspace();
  const { data: userId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const { data: sectors = [] } = useSectors(workspace.id);
  const { data: tasks = [], isLoading } = useTasks(workspace.id);

  const [grao, setGrao] = useState<Granularidade | null>(null);

  const meuPapel = members.find((m) => m.user_id === userId)?.role;

  const nomePorSetor = useMemo(
    () => new Map(sectors.map((s) => [s.id, s.name] as const)),
    [sectors]
  );
  const corPorSetor = useMemo(
    () => new Map(sectors.map((s) => [s.id, s.color] as const)),
    [sectors]
  );
  const nomePorPessoa = useMemo(
    () =>
      new Map(
        members.map((m) => [m.user_id, m.display_name ?? m.email] as const)
      ),
    [members]
  );

  // Escopo primeiro, filtro depois. A ordem importa: o filtro de setor não
  // pode dar acesso a um setor fora do escopo de quem está olhando.
  const noEscopo = useMemo(() => {
    if (!userId) return [];
    return tarefasDoEscopo(tasks, escopoDe(userId, meuPapel, sectors), userId);
  }, [tasks, sectors, userId, meuPapel]);

  const visiveis = useMemo(
    () =>
      aplicarFiltro(noEscopo, {
        sectorIds: filtros.sectorIds,
        assigneeIds: filtros.assigneeIds,
      }),
    [noEscopo, filtros.sectorIds, filtros.assigneeIds]
  );

  const dados = useMemo(() => {
    const ind = indicadoresDe(visiveis, filtros.periodo, agora);
    const anterior = filtros.comparar
      ? indicadoresDe(visiveis, periodoAnterior(filtros.periodo), agora)
      : null;

    const grauEfetivo = grao ?? granularidadePadrao(filtros.periodo);
    const pontos = serieDeFluxo(
      visiveis,
      baldesDo(filtros.periodo, grauEfetivo)
    );
    const setores = linhasPorSetor(
      visiveis,
      filtros.periodo,
      agora,
      filtros.ordem
    );

    return {
      ind,
      anterior,
      pontual: taxaDePontualidade(ind),
      pontualAnterior: anterior ? taxaDePontualidade(anterior) : null,
      risco: riscoDePrazo(ind),
      pontos,
      grauEfetivo,
      setores,
    };
  }, [visiveis, filtros.periodo, filtros.comparar, filtros.ordem, grao, agora]);

  // As etapas do fluxo: a única ida ao servidor. A chave inclui os filtros,
  // então trocar de setor não mostra o resultado do setor anterior — e o
  // TanStack Query descarta a resposta antiga sozinho.
  const etapas = useQuery({
    queryKey: [
      "reportStages",
      workspace.id,
      filtros.sectorIds.join(","),
      filtros.assigneeIds.join(","),
    ],
    queryFn: async (): Promise<RespostaDasEtapas> => {
      const p = new URLSearchParams();
      if (filtros.sectorIds.length) p.set("setores", filtros.sectorIds.join(","));
      if (filtros.assigneeIds.length) {
        p.set("responsaveis", filtros.assigneeIds.join(","));
      }
      const res = await fetch(`/api/reports/etapas?${p.toString()}`);
      if (!res.ok) throw new Error("falha");
      return (await res.json()) as RespostaDasEtapas;
    },
    // O relatório não muda a cada foco de janela; recarregá-lo ali só
    // pisca a tela de quem voltou de outra aba do navegador.
    refetchOnWindowFocus: false,
  });

  const insights = useMemo(
    () =>
      insightsOperacionais({
        risco: dados.risco,
        criadas: dados.ind.criadas,
        entregues: dados.ind.entregues,
        etapas: etapas.data?.etapas ?? [],
        setorLider:
          dados.setores.length > 0
            ? (() => {
                const lider = [...dados.setores].sort(
                  (a, b) => b.ind.entregues - a.ind.entregues
                )[0];
                return lider.ind.entregues > 0
                  ? {
                      sectorId: lider.sectorId,
                      nome: nomePorSetor.get(lider.sectorId) ?? "Setor",
                      entregues: lider.ind.entregues,
                    }
                  : null;
              })()
            : null,
      }),
    [dados, etapas.data, nomePorSetor]
  );

  function irPara(drill: Drill) {
    router.push(
      urlDaLista(drill, {
        sectorIds: filtros.sectorIds,
        assigneeIds: filtros.assigneeIds,
      })
    );
  }

  function exportar() {
    // TODAS as linhas do período, não a página visível da tabela.
    const linhas = dados.setores.map((l) => [
      nomePorSetor.get(l.sectorId) ?? "Setor removido",
      l.ind.criadas,
      l.ind.entregues,
      l.emAndamento,
      l.ind.atrasadasAgora,
      l.pontualidade,
      l.ind.tempoMedioDias,
      ROTULO_DE_SAUDE[l.saude.nivel],
      l.saude.motivo,
    ]);

    baixarCSV(
      montarCSV(
        {
          nome: "Relatórios — Visão geral",
          periodo: filtros.periodo,
          setores: filtros.sectorIds.map(
            (id) => nomePorSetor.get(id) ?? "Setor removido"
          ),
          responsaveis: filtros.assigneeIds.map((id) =>
            id === SEM_RESPONSAVEL
              ? "Sem responsável"
              : (nomePorPessoa.get(id) ?? "—")
          ),
          geradoEm: agora,
          ordenacao: filtros.ordem,
        },
        [
          "Setor",
          "Criadas",
          "Entregues",
          "Em andamento",
          "Atrasadas agora",
          "No prazo (%)",
          "Tempo medio (dias)",
          "Risco",
          "Motivo do risco",
        ],
        linhas
      ),
      nomeDoArquivo("visao-geral", filtros.periodo)
    );
  }

  const temSemResponsavel = useMemo(
    () => noEscopo.some((t) => !t.assignee_id),
    [noEscopo]
  );

  if (isLoading || !userId) return <OverviewSkeleton />;

  const { ind, anterior, pontual, pontualAnterior } = dados;
  const semNada =
    ind.criadas === 0 && ind.entregues === 0 && dados.risco.comPrazo === 0 && dados.risco.semPrazo === 0;

  // Quando a comparação está ligada mas o período anterior não tem base, o
  // cartão DIZ isso em vez de mostrar um selo. Ausência de dado nunca vira
  // 0% nem 100%.
  const semBase = filtros.comparar ? "Sem base para comparação" : undefined;
  const varOu = (v: number | null | undefined) =>
    v === null || v === undefined ? undefined : v;

  return (
    <div className="flex flex-col gap-[var(--space-block-gap)]">
      <ReportFilters
        filtros={filtros}
        alterar={alterar}
        limpar={limpar}
        temFiltro={temFiltro}
        setores={sectors.map((s) => ({
          id: s.id,
          nome: s.name,
          cor: s.color,
        }))}
        pessoas={members
          .filter((m) => m.status === "active")
          .map((m) => ({
            id: m.user_id,
            nome: m.display_name ?? m.email ?? "—",
          }))}
        temSemResponsavel={temSemResponsavel}
        onExportar={exportar}
        exportarDesabilitado={dados.setores.length === 0}
      />

      {semNada ? (
        <EmptyState
          icon={IconChartBar}
          title="Nenhuma demanda encontrada neste período"
          description={`Nada foi criado nem entregue entre ${rotuloDoPeriodo(filtros.periodo)}.`}
          action={
            temFiltro ? (
              <button
                type="button"
                onClick={limpar}
                className="text-fg-link rounded-xs text-[length:var(--text-small-size)] outline-none hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              >
                Limpar filtros
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* 1 — saúde geral */}
          <div className="grid gap-[var(--space-block-gap)] sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <MetricCard
              icon={IconFileText}
              label="Demandas criadas"
              value={String(ind.criadas)}
              tone="var(--chart-2)"
              trend={
                anterior
                  ? varOu(variacaoPercentual(ind.criadas, anterior.criadas))
                  : undefined
              }
              trendLabel="vs. período anterior"
              trendNote={
                anterior && variacaoPercentual(ind.criadas, anterior.criadas) === null
                  ? semBase
                  : undefined
              }
              series={dados.pontos.map((p) => p.criadas)}
              hint="Demandas cuja data de criação caiu dentro do período selecionado."
            />

            <MetricCard
              icon={IconProgressCheck}
              label="Entregues"
              value={String(ind.entregues)}
              tone="var(--chart-1)"
              trend={
                anterior
                  ? varOu(variacaoPercentual(ind.entregues, anterior.entregues))
                  : undefined
              }
              trendLabel="vs. período anterior"
              trendNote={
                anterior && variacaoPercentual(ind.entregues, anterior.entregues) === null
                  ? semBase
                  : undefined
              }
              series={dados.pontos.map((p) => p.entregues)}
              hint={
                ind.criadas > 0
                  ? `Concluídas no período, tenham sido criadas nele ou antes. Equivale a ${Math.round((ind.entregues / ind.criadas) * 100)}% do que foi criado no mesmo período.`
                  : "Concluídas no período, tenham sido criadas nele ou antes."
              }
            />

            <MetricCard
              icon={IconTargetArrow}
              label="No prazo"
              value={pontual === null ? "—" : `${pontual}%`}
              tone="var(--chart-1)"
              // Pontos percentuais, não por cento: de 70% para 79% são
              // +9 p.p. Escrever "%" faria parecer crescimento de 13%.
              trend={
                anterior
                  ? varOu(variacaoEmPontos(pontual, pontualAnterior))
                  : undefined
              }
              trendUnit=" p.p."
              trendLabel="vs. período anterior"
              trendNote={
                anterior && variacaoEmPontos(pontual, pontualAnterior) === null
                  ? semBase
                  : undefined
              }
              hint={
                ind.entreguesComPrazo > 0
                  ? `${ind.entreguesNoPrazo} de ${ind.entreguesComPrazo} demandas com prazo foram entregues pontualmente. As ${ind.entreguesSemPrazo} sem prazo ficam fora da conta.`
                  : "Nenhuma entrega do período tinha prazo definido — não há pontualidade a apurar."
              }
            />

            {/* **Sem selo de tendência, e é decisão.** "Atrasadas" é um
                retrato de AGORA: `indicadoresDe` mede o vencimento contra
                a data de hoje, não contra o recorte. Calculá-lo para o
                período anterior devolve exatamente o mesmo número, e o selo
                diria "estável 0%" — uma afirmação sobre uma mudança que
                ninguém mediu. Apareceu ligando a comparação com dados reais
                em 3/set/2026. */}
            <MetricCard
              icon={IconAlertTriangle}
              label="Atrasadas"
              value={String(ind.atrasadasAgora)}
              tone="var(--status-overdue-fg)"
              trendNote={
                filtros.comparar ? "Retrato de agora, não do período" : undefined
              }
              hint={`Demandas abertas cujo prazo já passou — contadas hoje, não dentro do período, e por isso sem comparação. Não inclui as que foram entregues com atraso: essas contam na pontualidade. ${ind.emAtencaoAgora} exigem atenção nos próximos dias.`}
            />

            <MetricCard
              icon={IconClock}
              label="Tempo médio de ciclo"
              value={
                ind.tempoMedioDias === null
                  ? "—"
                  : `${ind.tempoMedioDias.toLocaleString("pt-BR")} ${ind.tempoMedioDias === 1 ? "dia" : "dias"}`
              }
              tone="var(--accent-600)"
              trendInvert
              trendUnit=" dia"
              trend={
                anterior
                  ? varOu(
                      variacaoDeDias(
                        ind.tempoMedioDias,
                        anterior.tempoMedioDias
                      )
                    )
                  : undefined
              }
              trendNote={
                anterior &&
                variacaoDeDias(ind.tempoMedioDias, anterior.tempoMedioDias) === null
                  ? semBase
                  : undefined
              }
              hint="Tempo entre a criação da demanda e sua conclusão, incluindo períodos de espera. É o tempo que o cliente esperou, não só o de execução."
            />
          </div>

          <OperationalInsights insights={insights} onDrill={irPara} />

          {/* 2 — diagnóstico */}
          <div className="grid gap-[var(--space-block-gap)] xl:grid-cols-3">
            <ChartCard
              icon={IconChartLine}
              title="Fluxo de demandas"
              subtitle="Quanto entrou e quanto saiu"
              className="xl:col-span-2"
            >
              <DemandFlowChart
                pontos={dados.pontos}
                grao={dados.grauEfetivo}
                onGrao={setGrao}
              />
            </ChartCard>

            <ChartCard
              icon={IconTargetArrow}
              title="Risco de prazo"
              subtitle="Demandas abertas agora"
              tone="var(--status-due-soon-fg)"
            >
              <DeadlineRiskCard
                risco={dados.risco}
                onVerRisco={() => irPara({ tipo: "atencao" })}
                onVerFatia={(chave) =>
                  irPara({
                    tipo:
                      chave === "atrasadas"
                        ? "atrasadas"
                        : chave === "emAtencao"
                          ? "atencao"
                          : "abertas",
                  })
                }
              />
            </ChartCard>
          </div>

          <div className="grid gap-[var(--space-block-gap)] xl:grid-cols-2">
            <ChartCard
              icon={IconLayoutGrid}
              title="Desempenho por setor"
              subtitle="Clique num setor para filtrar a tela"
            >
              <SectorPerformanceCard
                linhas={dados.setores}
                nomes={nomePorSetor}
                cores={corPorSetor}
                ordem={filtros.ordem}
                onOrdem={(o) => alterar({ ordem: o })}
                setorAtivo={
                  filtros.sectorIds.length === 1
                    ? filtros.sectorIds[0]
                    : undefined
                }
                onSelecionarSetor={(id) =>
                  alterar({
                    sectorIds: filtros.sectorIds.includes(id) ? [] : [id],
                  })
                }
              />
            </ChartCard>

            <ChartCard
              icon={IconClock}
              title="Gargalos do fluxo"
              subtitle="Onde as demandas abertas estão paradas"
              tone="var(--accent-600)"
            >
              <WorkflowBottleneckCard
                etapas={etapas.data?.etapas ?? []}
                semHistorico={etapas.data?.semHistorico ?? 0}
                totalAbertas={etapas.data?.totalAbertas ?? 0}
                carregando={etapas.isPending}
                erro={etapas.isError}
                onTentarDeNovo={() => void etapas.refetch()}
              />
            </ChartCard>
          </div>

          {/* 3 — detalhamento */}
          <ChartCard
            icon={IconChartBar}
            title="Detalhamento por setor"
            subtitle={rotuloDoPeriodo(filtros.periodo)}
          >
            <SectorDetailTable
              linhas={dados.setores}
              nomes={nomePorSetor}
              cores={corPorSetor}
              onSelecionarSetor={(id) =>
                alterar({
                  sectorIds: filtros.sectorIds.includes(id) ? [] : [id],
                })
              }
            />
          </ChartCard>
        </>
      )}
    </div>
  );
}

/**
 * O esqueleto tem as MESMAS alturas do conteúdo.
 *
 * Sem isso a página salta quando os dados chegam, e quem já estava lendo o
 * primeiro cartão perde o lugar.
 */
function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--space-block-gap)]">
      <Skeleton variant="block" className="h-9 max-w-2xl" />
      <div className="grid gap-[var(--space-block-gap)] sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} className="h-[7.5rem]" />
        ))}
      </div>
      <div className="grid gap-[var(--space-block-gap)] xl:grid-cols-3">
        <SkeletonCard className="h-80 xl:col-span-2" />
        <SkeletonCard className="h-80" />
      </div>
      <div className="grid gap-[var(--space-block-gap)] xl:grid-cols-2">
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </div>
    </div>
  );
}
