"use client";

import { useMemo } from "react";

import { IconUsers } from "@tabler/icons-react";

import { ReportFilters } from "@/components/reports/ReportFilters";
import type { FiltrosDoRelatorio } from "@/components/reports/useReportFilters";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoHint } from "@/components/ui/InfoHint";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  equipeDoRelatorio,
  escopoDe,
  porPessoa,
  tarefasDoEscopo,
} from "@/lib/notifications/escalation";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useSectors } from "@/lib/queries/useSectors";
import { useTasks } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import { montarCSV, nomeDoArquivo } from "@/lib/reports/csv";
import { linhasPorPessoa } from "@/lib/reports/equipe";
import { aplicarFiltro, SEM_RESPONSAVEL } from "@/lib/reports/overview";
import { rotuloDoPeriodo } from "@/lib/reports/periodo";

/**
 * O relatório de prazos da equipe (0082).
 *
 * Existe porque o sistema escalava metade do problema. Em `derive.ts`:
 *
 *   // Prazo que ainda não venceu só interessa a quem vai entregar.
 *   if (!mine) continue;
 *
 * O gestor recebia a tarefa ATRASADA do time e nunca a que estava PARA
 * VENCER — que é justamente a que ainda dá para salvar. Este relatório
 * mostra as duas, por pessoa.
 *
 * **Por pessoa, e não por tarefa.** Foi o formato que o dono pediu, e é o
 * certo: alerta por tarefa no sino vira ruído para quem tem vinte pessoas.
 * Aqui se vê de relance quem está carregando o quê.
 *
 * **E não é um ranking.** As colunas do período — concluídas, pontualidade,
 * tempo médio — foram somadas para responder "como andou o trabalho", não
 * "quem produziu mais". O banco não guarda peso nem complexidade em toda
 * demanda, então uma nota calculada a partir de quantidade compararia quem
 * faz coisas diferentes. Por isso os títulos dizem CARGA e VOLUME, e não
 * desempenho.
 *
 * Uma coisa que este relatório NÃO é: barreira de acesso. A RLS já deixa
 * qualquer membro ler todas as demandas do workspace. O que ele entrega é
 * foco e aviso, não permissão.
 */
export function TeamRiskReport({
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

  const { risco, periodo, temSemResponsavel } = useMemo(() => {
    if (!userId) {
      return { risco: [], periodo: [], temSemResponsavel: false };
    }
    const escopo = escopoDe(userId, meuPapel, sectors);
    const doEscopo = tarefasDoEscopo(tasks, escopo, userId);
    const visiveis = aplicarFiltro(doEscopo, {
      sectorIds: filtros.sectorIds,
      assigneeIds: filtros.assigneeIds,
    });

    const equipe = equipeDoRelatorio(
      escopo,
      userId,
      members.filter((m) => m.status === "active").map((m) => m.user_id)
    );

    return {
      // O bloco de risco continua exatamente como era: janela de 7 dias,
      // a partir de HOJE. Não é filtrado por período de propósito — "vence
      // em três dias" não quer dizer nada dentro de um mês passado.
      risco: porPessoa(visiveis, { equipe }, agora),
      periodo: linhasPorPessoa(visiveis, filtros.periodo, agora, equipe),
      temSemResponsavel: doEscopo.some((t) => !t.assignee_id),
    };
  }, [tasks, sectors, userId, meuPapel, members, filtros, agora]);

  const nomePorId = useMemo(
    () =>
      new Map(
        members.map((m) => [m.user_id, m.display_name ?? m.email] as const)
      ),
    [members]
  );
  const avatarPorId = useMemo(
    () => new Map(members.map((m) => [m.user_id, m.avatar_url] as const)),
    [members]
  );

  const doPeriodoPorId = useMemo(
    () => new Map(periodo.map((l) => [l.userId ?? "__sem__", l] as const)),
    [periodo]
  );

  const nomeDe = (uid: string | null) =>
    uid === null ? "Sem responsável" : (nomePorId.get(uid) ?? "—");

  function exportar() {
    baixarCSV(
      montarCSV(
        {
          nome: "Relatórios — Prazos e equipe",
          periodo: filtros.periodo,
          setores: filtros.sectorIds.map(
            (id) => sectors.find((s) => s.id === id)?.name ?? "Setor removido"
          ),
          responsaveis: filtros.assigneeIds.map((id) =>
            id === SEM_RESPONSAVEL ? "Sem responsável" : nomeDe(id)
          ),
          geradoEm: agora,
        },
        [
          "Responsavel",
          "Abertas (carga)",
          "Em atencao",
          "Atrasadas",
          "Concluidas no periodo",
          "No prazo (%)",
          "Tempo medio (dias)",
        ],
        risco.map((l) => {
          const p = doPeriodoPorId.get(l.userId ?? "__sem__");
          return [
            nomeDe(l.userId),
            l.abertas,
            l.venceHoje + l.venceEmBreve,
            l.atrasadas,
            p?.ind.entregues ?? 0,
            p?.pontualidade ?? null,
            p?.ind.tempoMedioDias ?? null,
          ];
        })
      ),
      nomeDoArquivo("equipe", filtros.periodo)
    );
  }

  if (isLoading || !userId) return <Skeleton variant="block" className="h-64" />;

  const totalAtrasadas = risco.reduce((s, l) => s + l.atrasadas, 0);

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
        exportarDesabilitado={risco.length === 0}
      />

      {risco.length === 0 ? (
        <EmptyState
          icon={IconUsers}
          title="Sem equipe para acompanhar"
          description="Convide alguém para a empresa, ou seja definido como gestor de um setor"
        />
      ) : (
        <>
          <p className="text-fg-secondary text-[length:var(--text-small-size)]">
            {totalAtrasadas > 0
              ? `${totalAtrasadas} ${totalAtrasadas === 1 ? "demanda atrasada" : "demandas atrasadas"} no que você acompanha. Prazos dos próximos 7 dias.`
              : "Nada atrasado no que você acompanha. Prazos dos próximos 7 dias."}{" "}
            As colunas do período cobrem {rotuloDoPeriodo(filtros.periodo)}.
          </p>

          <div className="overflow-x-auto">
            {/* `relative`: ver a nota em SectorDetailTable. */}
            <table className="relative w-full border-collapse text-left">
              <caption className="sr-only">
                Carga, prazos e volume concluído por pessoa
              </caption>
              <thead>
                <tr className="text-fg-muted text-[length:var(--text-caption-size)] tracking-wide uppercase">
                  <th scope="col" className="px-3 py-2 font-medium">
                    Pessoa
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Atrasadas
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Vence hoje
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Em breve
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    <span className="inline-flex items-center gap-1">
                      Carga
                      <InfoHint
                        label="O que é carga"
                        text="Demandas abertas atribuídas à pessoa, com ou sem prazo. É volume de trabalho em aberto, não medida de desempenho — o sistema não guarda o tamanho de cada demanda."
                      />
                    </span>
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Concluídas
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    No prazo
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Tempo médio
                  </th>
                </tr>
              </thead>
              <tbody>
                {risco.map((l) => {
                  // Numa constante local, para o TypeScript estreitar o
                  // tipo: ele não segue a narrowing através de `semDono`.
                  const uid = l.userId;
                  const semDono = uid === null;
                  const nome = nomeDe(uid);
                  const p = doPeriodoPorId.get(uid ?? "__sem__");

                  return (
                    <tr
                      key={l.userId ?? "__sem__"}
                      className="border-line hover:bg-hover border-b transition-colors [transition-duration:var(--dur-fast)] last:border-0"
                    >
                      <th scope="row" className="px-3 py-2 font-normal">
                        <span className="flex items-center gap-2">
                          {semDono ? null : (
                            <Avatar
                              name={nome}
                              src={
                                (uid ? avatarPorId.get(uid) : null) ?? undefined
                              }
                              size="sm"
                            />
                          )}
                          <span
                            className={
                              semDono
                                ? "text-fg-secondary text-[length:var(--text-small-size)] italic"
                                : "text-fg text-[length:var(--text-small-size)]"
                            }
                          >
                            {nome}
                          </span>
                        </span>
                      </th>

                      {/* Atrasada é a única em cor de alerta. Pintar as três
                          faria a coluna que importa parar de saltar. */}
                      <td
                        className="px-3 py-2 text-right text-[length:var(--text-small-size)] font-medium tabular-nums"
                        style={{
                          color:
                            l.atrasadas > 0
                              ? "var(--negative)"
                              : "var(--text-muted)",
                        }}
                      >
                        {l.atrasadas}
                      </td>
                      <td className="text-fg-secondary px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                        {l.venceHoje}
                      </td>
                      <td className="text-fg-secondary px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                        {l.venceEmBreve}
                      </td>

                      {/* Zero aqui é o caso que motivou a coluna: pessoa sem
                          nada atribuído. Fica dito por extenso em vez de um
                          "0" que se confunde com "em dia". */}
                      <td className="px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                        {l.abertas === 0 ? (
                          <span className="text-fg-muted italic">
                            sem demanda
                          </span>
                        ) : (
                          <span className="text-fg-secondary">{l.abertas}</span>
                        )}
                      </td>

                      <td className="text-fg-secondary px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                        {p?.ind.entregues ?? 0}
                      </td>
                      <td className="px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                        {p == null || p.pontualidade === null ? (
                          <span className="text-fg-muted">—</span>
                        ) : (
                          <span className="text-fg-secondary">
                            {p.pontualidade}%
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                        {p == null || p.ind.tempoMedioDias === null ? (
                          <span className="text-fg-muted">—</span>
                        ) : (
                          <span className="text-fg-secondary">
                            {p.ind.tempoMedioDias.toLocaleString("pt-BR")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-fg-secondary text-[length:var(--text-caption-size)]">
            Atrasadas, vence hoje, em breve e carga são o retrato de agora.
            Concluídas, no prazo e tempo médio cobrem o período selecionado.
            &ldquo;—&rdquo; significa que não houve entrega com prazo — não
            zero.
          </p>
        </>
      )}
    </div>
  );
}

function baixarCSV(conteudo: string, nome: string) {
  // BOM: sem ele o Excel lê "Manutenção" como "ManutenÃ§Ã£o".
  const blob = new Blob(["﻿" + conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
