"use client";

import { useMemo } from "react";

import { IconChartBar } from "@tabler/icons-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { localDayISO } from "@/lib/dates/day";
import { escopoDe, tarefasDoEscopo } from "@/lib/notifications/escalation";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useSectors } from "@/lib/queries/useSectors";
import { useTasks } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { montarCSV, nomeDoArquivo } from "@/lib/reports/csv";
import { aplicarFiltro, SEM_RESPONSAVEL } from "@/lib/reports/overview";
import { rotuloDoPeriodo } from "@/lib/reports/periodo";
import {
  paraCSV,
  pontualidade,
  relatorioPorSetor,
} from "@/lib/reports/sector";

import { ReportFilters } from "./ReportFilters";
import type { FiltrosDoRelatorio } from "./useReportFilters";

/**
 * Relatório por setor (§26 do roadmap).
 *
 * Responde UMA pergunta: como foi o período deste setor. Volume,
 * pontualidade e tempo. Continua sendo a tabela que sempre foi — o que
 * mudou é que o período, o setor e o responsável agora vêm da barra de
 * filtros comum, em vez de um seletor só dela.
 *
 * O escopo é o mesmo do relatório de equipe (0082): o dono vê todos os
 * setores, o gestor vê os dele. Reusar `escopoDe` em vez de escrever outra
 * regra evita que as telas discordem sobre quem enxerga o quê.
 */
export function SectorReport({
  filtros,
  alterar,
  agora,
}: {
  filtros: FiltrosDoRelatorio;
  alterar: (m: Partial<Omit<FiltrosDoRelatorio, "periodo">>) => void;
  agora: Date;
}) {
  const workspace = useWorkspace();
  const { data: userId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const { data: sectors = [] } = useSectors(workspace.id);
  const { data: tasks = [], isLoading } = useTasks(workspace.id);

  const meuPapel = members.find((m) => m.user_id === userId)?.role;
  const nomePorId = useMemo(
    () => new Map(sectors.map((s) => [s.id, s.name] as const)),
    [sectors]
  );
  const nomePorPessoa = useMemo(
    () =>
      new Map(
        members.map((m) => [m.user_id, m.display_name ?? m.email] as const)
      ),
    [members]
  );

  const { linhas, temSemResponsavel } = useMemo(() => {
    if (!userId) return { linhas: [], temSemResponsavel: false };

    const escopo = escopoDe(userId, meuPapel, sectors);
    const doEscopo = tarefasDoEscopo(tasks, escopo, userId);
    const visiveis = aplicarFiltro(doEscopo, {
      sectorIds: filtros.sectorIds,
      assigneeIds: filtros.assigneeIds,
    });

    return {
      linhas: relatorioPorSetor(visiveis, filtros.periodo, localDayISO(agora)),
      temSemResponsavel: doEscopo.some((t) => !t.assignee_id),
    };
  }, [tasks, sectors, userId, meuPapel, filtros, agora]);

  function exportar() {
    // O CSV desta aba ganhou o cabeçalho de contexto (período, setores,
    // responsáveis) que a versão antiga não tinha. `paraCSV` continua
    // gerando o corpo — a lógica de colunas não mudou.
    const corpo = paraCSV(
      linhas,
      (id) => nomePorId.get(id) ?? "Setor removido",
      filtros.periodo
    )
      .split("\n")
      // As duas primeiras linhas do formato antigo eram "Periodo;…" e uma
      // vazia. O cabeçalho novo diz isso e mais, então elas saem.
      .slice(2);

    const [colunas, ...dados] = corpo;
    const conteudo = montarCSV(
      {
        nome: "Relatórios — Por setor",
        periodo: filtros.periodo,
        setores: filtros.sectorIds.map(
          (id) => nomePorId.get(id) ?? "Setor removido"
        ),
        responsaveis: filtros.assigneeIds.map((id) =>
          id === SEM_RESPONSAVEL
            ? "Sem responsável"
            : (nomePorPessoa.get(id) ?? "—")
        ),
        geradoEm: agora,
      },
      colunas.split(";"),
      dados.map((l) => l.split(";"))
    );

    const blob = new Blob(["﻿" + conteudo], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeDoArquivo("setores", filtros.periodo);
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading || !userId) return <Skeleton variant="block" className="h-64" />;

  return (
    <div className="flex flex-col gap-4">
      <ReportFilters
        filtros={filtros}
        alterar={alterar}
        limpar={() => alterar({ sectorIds: [], assigneeIds: [] })}
        temFiltro={
          filtros.sectorIds.length > 0 || filtros.assigneeIds.length > 0
        }
        setores={sectors.map((s) => ({ id: s.id, nome: s.name, cor: s.color }))}
        pessoas={members
          .filter((m) => m.status === "active")
          .map((m) => ({
            id: m.user_id,
            nome: m.display_name ?? m.email ?? "—",
          }))}
        temSemResponsavel={temSemResponsavel}
        onExportar={exportar}
        exportarDesabilitado={linhas.length === 0}
      />

      {linhas.length === 0 ? (
        <EmptyState
          icon={IconChartBar}
          title="Nenhum movimento no período"
          description={`Nada foi criado nem entregue entre ${rotuloDoPeriodo(filtros.periodo)} nos setores que você acompanha`}
        />
      ) : (
        <div className="overflow-x-auto">
          {/* `relative`: ver a nota em SectorDetailTable. */}
          <table className="relative w-full border-collapse text-left">
            <caption className="sr-only">
              Volume, pontualidade e tempo por setor no período
            </caption>
            <thead>
              <tr className="text-fg-muted text-[length:var(--text-caption-size)] tracking-wide uppercase">
                <th scope="col" className="px-3 py-2 font-medium">
                  Setor
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Criadas
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Entregues
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  No prazo
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Dias médios
                </th>
                {/* "hoje" no rótulo porque esta coluna é retrato, não
                    período — sem isso alguém a somaria ao resto. */}
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Atrasadas hoje
                </th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const p = pontualidade(l);
                return (
                  <tr
                    key={l.sectorId}
                    className="border-line hover:bg-hover border-b transition-colors [transition-duration:var(--dur-fast)] last:border-0"
                  >
                    <td className="text-fg px-3 py-2 text-[length:var(--text-small-size)]">
                      {nomePorId.get(l.sectorId) ?? "Setor removido"}
                    </td>
                    <td className="text-fg-secondary px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                      {l.criadas}
                    </td>
                    <td className="text-fg-secondary px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                      {l.entregues}
                    </td>
                    <td className="px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                      {p.pct === null ? (
                        <span className="text-fg-muted italic">sem prazo</span>
                      ) : (
                        <span className="text-fg-secondary">
                          {p.pct}%{" "}
                          <span className="text-fg-muted">de {p.base}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                      {l.diasMedios === null ? (
                        <span className="text-fg-muted">—</span>
                      ) : (
                        <span className="text-fg-secondary">{l.diasMedios}</span>
                      )}
                    </td>
                    <td
                      className="px-3 py-2 text-right text-[length:var(--text-small-size)] font-medium tabular-nums"
                      style={{
                        color:
                          l.atrasadasAgora > 0
                            ? "var(--negative)"
                            : "var(--text-muted)",
                      }}
                    >
                      {l.atrasadasAgora}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
        Dias médios contam da criação até a conclusão — é o tempo que o cliente
        esperou, não só o de execução. Pontualidade é calculada só sobre as
        demandas que tinham prazo.
      </p>
    </div>
  );
}
