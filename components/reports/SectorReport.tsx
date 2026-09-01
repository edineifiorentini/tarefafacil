"use client";

import { useMemo, useState } from "react";

import { IconChartBar, IconDownload } from "@tabler/icons-react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { localDayISO } from "@/lib/dates/day";
import { escopoDe, tarefasDoEscopo } from "@/lib/notifications/escalation";
import { useCurrentUserId, useMembers } from "@/lib/queries/useMembers";
import { useSectors } from "@/lib/queries/useSectors";
import { useTasks } from "@/lib/queries/useTasks";
import { useWorkspace } from "@/lib/queries/useWorkspace";
import {
  paraCSV,
  pontualidade,
  relatorioPorSetor,
  type Periodo,
} from "@/lib/reports/sector";

/**
 * Relatório por setor (§26 do roadmap).
 *
 * Responde UMA pergunta: como foi o período deste setor. Volume,
 * pontualidade e tempo.
 *
 * O escopo é o mesmo do relatório de equipe (0082): o dono vê todos os
 * setores, o gestor vê os dele. Reusar `escopoDe` em vez de escrever outra
 * regra evita que as duas telas discordem sobre quem enxerga o quê.
 */

const PERIODOS = [
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "mes", label: "Este mês" },
  { value: "ano", label: "Este ano" },
];

function periodoDe(escolha: string, hoje: Date): Periodo {
  const ate = localDayISO(hoje);

  if (escolha === "mes") {
    const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return { de: localDayISO(primeiro), ate };
  }
  if (escolha === "ano") {
    const janeiro = new Date(hoje.getFullYear(), 0, 1);
    return { de: localDayISO(janeiro), ate };
  }

  const dias = Number(escolha);
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - dias);
  return { de: localDayISO(inicio), ate };
}

function baixarCSV(conteudo: string, nome: string) {
  // BOM antes do conteúdo: sem ele o Excel lê "Manutenção" como
  // "ManutenÃ§Ã£o", e quem recebe acha que o sistema corrompeu o arquivo.
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

export function SectorReport() {
  const workspace = useWorkspace();
  const { data: userId } = useCurrentUserId();
  const { data: members = [] } = useMembers(workspace.id);
  const { data: sectors = [] } = useSectors(workspace.id);
  const { data: tasks = [], isLoading } = useTasks(workspace.id);

  const [escolha, setEscolha] = useState("30");

  const meuPapel = members.find((m) => m.user_id === userId)?.role;
  const nomePorId = useMemo(
    () => new Map(sectors.map((s) => [s.id, s.name] as const)),
    [sectors]
  );

  const { linhas, periodo } = useMemo(() => {
    const agora = new Date();
    const p = periodoDe(escolha, agora);
    if (!userId) return { linhas: [], periodo: p };

    const escopo = escopoDe(userId, meuPapel, sectors);
    const doEscopo = tarefasDoEscopo(tasks, escopo, userId);
    return {
      linhas: relatorioPorSetor(doEscopo, p, localDayISO(agora)),
      periodo: p,
    };
  }, [tasks, sectors, userId, meuPapel, escolha]);

  if (isLoading || !userId) return <Skeleton variant="block" className="h-64" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          options={PERIODOS}
          value={escolha}
          onValueChange={setEscolha}
          aria-label="Período do relatório"
        />
        {linhas.length > 0 ? (
          <Button
            variant="secondary"
            leadingIcon={IconDownload}
            onClick={() =>
              baixarCSV(
                paraCSV(
                  linhas,
                  (id) => nomePorId.get(id) ?? "Setor removido",
                  periodo
                ),
                `taflow-setores-${periodo.de}-a-${periodo.ate}.csv`
              )
            }
          >
            Baixar CSV
          </Button>
        ) : null}
      </div>

      {linhas.length === 0 ? (
        <EmptyState
          icon={IconChartBar}
          title="Nenhum movimento no período"
          description="Nada foi criado nem entregue nos setores que você acompanha"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-fg-muted text-[length:var(--text-caption-size)] tracking-wide uppercase">
                <th className="px-3 py-2 font-medium">Setor</th>
                <th className="px-3 py-2 text-right font-medium">Criadas</th>
                <th className="px-3 py-2 text-right font-medium">Entregues</th>
                <th className="px-3 py-2 text-right font-medium">No prazo</th>
                <th className="px-3 py-2 text-right font-medium">Dias médios</th>
                {/* "hoje" no rótulo porque esta coluna é retrato, não
                    período — sem isso alguém a somaria ao resto. */}
                <th className="px-3 py-2 text-right font-medium">
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
                    className="border-line border-b last:border-0"
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
                          <span className="text-fg-muted">
                            de {p.base}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-[length:var(--text-small-size)] tabular-nums">
                      {l.diasMedios === null ? (
                        <span className="text-fg-muted">—</span>
                      ) : (
                        <span className="text-fg-secondary">
                          {l.diasMedios}
                        </span>
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
        Dias médios contam da criação até a conclusão — é o tempo que o
        cliente esperou, não só o de execução. Pontualidade é calculada só
        sobre as demandas que tinham prazo.
      </p>
    </div>
  );
}
