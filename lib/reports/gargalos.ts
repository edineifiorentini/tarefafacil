// Onde o trabalho está parado. Puro.
//
// AS ETAPAS SÃO AS COLUNAS REAIS DO QUADRO, não uma lista inventada. O
// TAFLOW deixa cada setor desenhar o próprio fluxo (`board_column`), então
// "Em aprovação" existe se — e só se — alguém criou essa coluna.
//
// **Agrupa por NOME, não por id.** Cada setor tem o seu próprio conjunto de
// colunas: "Revisão" do Marketing e "Revisão" das Obras são duas linhas em
// `board_column`. Num relatório que cruza setores, mostrá-las separadas
// responderia "quantas colunas existem", não "onde o trabalho para".
//
// ---------------------------------------------------------------------------
// O QUE DÁ E O QUE NÃO DÁ PARA MEDIR AQUI, e é importante
// ---------------------------------------------------------------------------
//
// `task_activity` registra troca de `column_id` (migration 0025), então o
// tempo NA ETAPA ATUAL é calculável: é agora menos a última entrada nela.
//
// Três limites, todos honestos e nenhum escondido:
//
// 1. **O gatilho é `after update`.** A coluna inicial, gravada no INSERT da
//    demanda, não gera linha de atividade. Para quem nunca se moveu, a
//    entrada na etapa é `created_at` — o que é verdade, e está anotado.
// 2. **Demanda anterior à 0025 não tem histórico.** Cai no mesmo fallback.
// 3. **Isto NÃO é "tempo total gasto em aprovação".** É a espera ACUMULADA
//    AGORA, das demandas que estão paradas lá neste momento. O tempo
//    histórico por etapa (entrou, saiu, quanto ficou, somado ao longo do
//    mês) exigiria percorrer o histórico inteiro e é trabalho de outra
//    consulta. O rótulo na tela diz "parada há", nunca "levou".

import { differenceInCalendarDays, parseISO } from "date-fns";

import type { Task } from "@/types/database";

/** O recorte de `board_column` que este módulo precisa. */
export type ColunaDoQuadro = {
  id: string;
  name: string;
  position: number;
  is_done_column: boolean;
};

/** O recorte de `task_activity` que este módulo precisa. */
export type MovimentoDeColuna = {
  task_id: string;
  new_value: string | null;
  created_at: string;
};

/** O balde de quem nunca foi colocada numa coluna do quadro. */
export const SEM_ETAPA = "__sem_etapa__";

export type EtapaDoFluxo = {
  /** Chave estável: o nome da coluna, ou `SEM_ETAPA`. */
  chave: string;
  nome: string;
  /** Menor `position` entre as colunas com este nome — define a ordem. */
  ordem: number;
  /** Demandas abertas paradas aqui agora. */
  quantidade: number;
  /** Fatia do total de abertas, de 0 a 1. */
  proporcao: number;
  /**
   * Média de dias que as demandas desta etapa estão paradas nela.
   *
   * `null` quando não há demanda aqui. Nunca zero: zero diria "chegaram
   * hoje", que é uma informação diferente de "não há nenhuma".
   */
  diasMedios: number | null;
  /** Soma dos dias parados — a base do insight de concentração. */
  diasAcumulados: number;
  /** Ids de coluna com este nome, para o clique abrir a lista certa. */
  colunaIds: string[];
};

/**
 * Quando cada demanda entrou na coluna em que está.
 *
 * Percorre a atividade uma vez e guarda, por demanda, o carimbo mais
 * recente em que ela foi movida PARA a coluna atual. Precisa ser "para a
 * coluna atual", e não "o último movimento": uma demanda que foi de
 * Produção para Revisão e voltou para Produção está em Produção desde a
 * volta, não desde a primeira vez.
 */
function entradaNaEtapaAtual(
  tasks: Task[],
  movimentos: MovimentoDeColuna[]
): Map<string, string> {
  const colunaAtual = new Map<string, string | null>();
  for (const t of tasks) colunaAtual.set(t.id, t.column_id);

  const entrada = new Map<string, string>();
  for (const m of movimentos) {
    if (!m.new_value) continue;
    if (colunaAtual.get(m.task_id) !== m.new_value) continue;
    const anterior = entrada.get(m.task_id);
    if (!anterior || m.created_at > anterior) entrada.set(m.task_id, m.created_at);
  }
  return entrada;
}

/**
 * A distribuição das demandas ABERTAS pelas etapas do fluxo.
 *
 * Só abertas: uma demanda concluída não está parada em lugar nenhum, e
 * incluí-la encheria a coluna "Concluído" de trabalho que já saiu — o
 * gráfico diria que o gargalo é o fim do fluxo.
 */
export function gargalosDoFluxo(
  tasks: Task[],
  colunas: ColunaDoQuadro[],
  movimentos: MovimentoDeColuna[],
  agora: Date
): EtapaDoFluxo[] {
  const abertas = tasks.filter((t) => !t.completed_at && !t.cancelled_at);
  const porId = new Map(colunas.map((c) => [c.id, c] as const));
  const entrada = entradaNaEtapaAtual(abertas, movimentos);

  type Acumulador = Omit<EtapaDoFluxo, "proporcao" | "diasMedios"> & {
    somaDias: number;
  };
  const etapas = new Map<string, Acumulador>();

  const balde = (chave: string, nome: string, ordem: number) => {
    let e = etapas.get(chave);
    if (!e) {
      e = {
        chave,
        nome,
        ordem,
        quantidade: 0,
        diasAcumulados: 0,
        colunaIds: [],
        somaDias: 0,
      };
      etapas.set(chave, e);
    }
    // Duas colunas com o mesmo nome em setores diferentes: a ordem é a
    // menor das posições, para a etapa cair no lugar mais cedo do fluxo.
    e.ordem = Math.min(e.ordem, ordem);
    return e;
  };

  for (const t of abertas) {
    const coluna = t.column_id ? porId.get(t.column_id) : undefined;

    // Coluna de conclusão com demanda aberta: acontece quando alguém
    // arrasta para "Concluído" sem marcar como concluída. Fica na etapa,
    // porque é onde a demanda está de fato.
    const chave = coluna ? coluna.name : SEM_ETAPA;
    const nome = coluna ? coluna.name : "Sem etapa";
    const e = balde(chave, nome, coluna?.position ?? 999);

    e.quantidade++;
    if (coluna && !e.colunaIds.includes(coluna.id)) e.colunaIds.push(coluna.id);

    const desde = entrada.get(t.id) ?? t.created_at;
    const dias = Math.max(
      0,
      differenceInCalendarDays(agora, parseISO(desde))
    );
    e.somaDias += dias;
  }

  const total = abertas.length;

  return [...etapas.values()]
    .map((e) => ({
      chave: e.chave,
      nome: e.nome,
      ordem: e.ordem,
      quantidade: e.quantidade,
      proporcao: total > 0 ? e.quantidade / total : 0,
      diasMedios:
        e.quantidade > 0 ? Math.round((e.somaDias / e.quantidade) * 10) / 10 : null,
      diasAcumulados: e.somaDias,
      colunaIds: e.colunaIds,
    }))
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
}

/**
 * A etapa que concentra mais ESPERA — não mais demandas.
 *
 * São coisas diferentes e a distinção é o valor do card: uma etapa com dez
 * demandas que chegaram hoje não é um gargalo; uma com três paradas há
 * duas semanas é. Somar os dias parados encontra a segunda.
 *
 * `null` quando não há espera acumulada (tudo chegou hoje) ou quando uma
 * etapa só não se destaca — anunciar "a etapa X concentra 34%" quando são
 * três etapas com 33% cada seria apontar um culpado sorteado.
 */
export function etapaQueMaisSegura(
  etapas: EtapaDoFluxo[],
  /** Fatia mínima da espera para valer um destaque. */
  limiar = 0.35
): { etapa: EtapaDoFluxo; fatia: number } | null {
  // "Sem etapa" fica FORA do destaque, e o motivo apareceu com dados
  // reais em 3/set/2026: num quadro onde ninguém arrasta as demandas, as
  // três abertas caíam ali e a tela anunciava "a etapa 'Sem etapa'
  // concentra 100% da espera acumulada". Não é etapa, não é gargalo do
  // fluxo, e a frase não sugere ação nenhuma — o problema ali é outro, e
  // o cartão o diz com outras palavras.
  const doFluxo = etapas.filter((e) => e.chave !== SEM_ETAPA);

  const total = doFluxo.reduce((s, e) => s + e.diasAcumulados, 0);
  if (total <= 0) return null;

  let maior: EtapaDoFluxo | null = null;
  for (const e of doFluxo) {
    if (!maior || e.diasAcumulados > maior.diasAcumulados) maior = e;
  }
  if (!maior) return null;

  const fatia = maior.diasAcumulados / total;
  if (fatia < limiar) return null;
  return { etapa: maior, fatia };
}
