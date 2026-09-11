// Quantas vezes os prazos mudaram no período, e por quê. Puro: sem React,
// sem banco.
//
// As linhas vêm do histórico (`task_activity`, 0099): uma por mudança de um
// prazo que JÁ EXISTIA, com o motivo. Definir o primeiro prazo não entra —
// não é reprogramação, e o banco nem grava motivo nesse caso.

import { diaCivilDeEm } from "@/lib/dates/day";
import {
  MOTIVOS_AUTOMATICOS,
  MOTIVOS_DE_ESCOLHA,
  ehMotivoDePrazo,
  type MotivoDePrazo,
} from "@/lib/tarefas/reprogramacao";

import type { Periodo } from "./periodo";

export type LinhaDeReprogramacao = {
  task_id: string;
  motivo: string | null;
  created_at: string;
};

export type ReprogramacoesDoPeriodo = {
  total: number;
  /** Demandas diferentes que tiveram o prazo reprogramado. */
  demandas: number;
  /** Só os motivos que aconteceram, do mais frequente ao menos. */
  porMotivo: { motivo: MotivoDePrazo; total: number }[];
};

const ORDEM_DO_CATALOGO: readonly MotivoDePrazo[] = [
  ...MOTIVOS_DE_ESCOLHA,
  ...MOTIVOS_AUTOMATICOS,
];

/**
 * @param visiveis as demandas que o relatório está mostrando, com escopo e
 *   filtros já aplicados. Reprogramação de demanda fora delas não conta —
 *   senão o cartão falaria de um setor que o filtro tirou da tela.
 */
export function reprogramacoesDoPeriodo(
  linhas: LinhaDeReprogramacao[],
  visiveis: ReadonlySet<string>,
  periodo: Periodo,
  fuso: string
): ReprogramacoesDoPeriodo {
  const contagem = new Map<MotivoDePrazo, number>();
  const demandas = new Set<string>();
  let total = 0;

  for (const linha of linhas) {
    if (!visiveis.has(linha.task_id) || !ehMotivoDePrazo(linha.motivo)) {
      continue;
    }
    // O dia de quem lê, não o do servidor (regra 15): reprogramar às 22h do
    // dia 30 é setembro em São Paulo e já é outubro em UTC.
    const dia = diaCivilDeEm(linha.created_at, fuso);
    if (dia < periodo.de || dia > periodo.ate) continue;

    total++;
    demandas.add(linha.task_id);
    contagem.set(linha.motivo, (contagem.get(linha.motivo) ?? 0) + 1);
  }

  const porMotivo = [...contagem.entries()]
    .map(([motivo, n]) => ({ motivo, total: n }))
    // Empate segue o catálogo, e não a ordem de chegada: a mesma resposta
    // não pode trocar de lugar a cada carregamento.
    .sort(
      (a, b) =>
        b.total - a.total ||
        ORDEM_DO_CATALOGO.indexOf(a.motivo) -
          ORDEM_DO_CATALOGO.indexOf(b.motivo)
    );

  return { total, demandas: demandas.size, porMotivo };
}
