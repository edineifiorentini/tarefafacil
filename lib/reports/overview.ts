// A visão geral da operação. Puro: sem banco, sem React, sem fuso escondido.
//
// É aqui que um erro vira um número errado numa tela que alguém usa para
// decidir remanejar gente. Cada função tem uma fórmula só, e a fórmula
// aparece no comentário porque quem lê o relatório precisa poder conferi-la
// sem abrir o código — a tela mostra a mesma frase nas dicas.
//
// O QUE ESTE MÓDULO SE RECUSA A FAZER:
//
// - **não soma demanda sem prazo à pontualidade.** Ela não é pontual nem
//   atrasada; jogá-la em qualquer lado inventa um número. Fica num balde
//   próprio, visível;
// - **não mistura atraso aberto com entrega fora do prazo.** "4 atrasadas"
//   é um retrato de agora, do que ainda dá para salvar; "entregue com 3
//   dias de atraso" é história, e vira pontualidade. Somar as duas produz
//   um número que não responde a nenhuma pergunta;
// - **não devolve zero quando não sabe.** `null` e `0` são coisas
//   diferentes: "ninguém entregou nada" não é "todo mundo entregou no
//   mesmo dia". Quem consome decide como dizer "não sei";
// - **não conta demanda cancelada como entrega nem como atraso.** Ela saiu
//   do fluxo. Continua contando como CRIADA, e isso é decisão registrada em
//   `sector.test.ts`: ela existiu, alguém a abriu.

import { addDays, differenceInCalendarDays, parseISO } from "date-fns";

import { localDayISO, localDayOf } from "@/lib/dates/day";
import { JANELA_DO_RELATORIO } from "@/lib/notifications/escalation";
import type { Task } from "@/types/database";

import type { Balde, Periodo } from "./periodo";

// Reexportado para quem calcula sobre um recorte não precisar importar de
// dois módulos para uma coisa só.
export type { Periodo };

/**
 * A janela de "em atenção" — quantos dias à frente um prazo já preocupa.
 *
 * **Reusa a regra que o produto já tinha** (`JANELA_DO_RELATORIO`, 0082):
 * sete dias, o mesmo horizonte de "Próximos dias" na tela Hoje e do
 * relatório de equipe. Criar um número novo aqui faria duas telas do mesmo
 * produto discordarem sobre o que é urgente — e quem gere passaria a não
 * saber qual das duas acreditar.
 */
export const JANELA_DE_ATENCAO = JANELA_DO_RELATORIO;

/** Demanda viva: nem concluída, nem cancelada. */
export function estaAberta(t: Task): boolean {
  return !t.completed_at && !t.cancelled_at;
}

function dentro(diaISO: string, p: Periodo): boolean {
  // Comparação de string vale porque YYYY-MM-DD é ordenável.
  return diaISO >= p.de && diaISO <= p.ate;
}

// ---------------------------------------------------------------------------
// Indicadores da primeira linha
// ---------------------------------------------------------------------------

export type Indicadores = {
  /** `created_at` dentro do período. Fórmula única, sem exceção. */
  criadas: number;
  /**
   * `completed_at` dentro do período, canceladas fora.
   *
   * **Não exige que a demanda também tenha sido criada no período.** Este
   * indicador é produção entregue, e amarrá-lo à criação esconderia
   * justamente o trabalho antigo que finalmente saiu — que costuma ser o
   * mais difícil.
   */
  entregues: number;
  /** Das entregues, quantas tinham prazo. É a BASE da pontualidade. */
  entreguesComPrazo: number;
  /** Das que tinham prazo, quantas saíram até ele. */
  entreguesNoPrazo: number;
  /** Entregues que não tinham prazo nenhum — fora da conta de pontualidade. */
  entreguesSemPrazo: number;
  /** Abertas e vencidas AGORA. Retrato, não período. */
  atrasadasAgora: number;
  /** Abertas que vencem dentro da janela de atenção, hoje incluído. */
  emAtencaoAgora: number;
  /** Abertas com prazo além da janela. */
  noPrazoAgora: number;
  /** Abertas sem prazo nenhum. Nunca entram em "no prazo". */
  semPrazoAgora: number;
  /**
   * Média de dias entre criação e conclusão, das entregues no período.
   *
   * `null` quando nada foi entregue — zero diria "saiu no mesmo dia".
   */
  tempoMedioDias: number | null;
};

const ZERO: Indicadores = {
  criadas: 0,
  entregues: 0,
  entreguesComPrazo: 0,
  entreguesNoPrazo: 0,
  entreguesSemPrazo: 0,
  atrasadasAgora: 0,
  emAtencaoAgora: 0,
  noPrazoAgora: 0,
  semPrazoAgora: 0,
  tempoMedioDias: null,
};

/**
 * Todos os indicadores numa varredura só.
 *
 * Uma passada e não cinco: são as mesmas demandas respondendo a perguntas
 * diferentes, e cinco `filter` encadeados percorreriam a lista cinco vezes
 * para produzir o mesmo resultado.
 */
export function indicadoresDe(
  tasks: Task[],
  periodo: Periodo,
  agora: Date,
  janelaDias = JANELA_DE_ATENCAO
): Indicadores {
  const hoje = localDayISO(agora);
  const limiteAtencao = localDayISO(addDays(agora, janelaDias));

  const ind: Indicadores = { ...ZERO };
  let somaDias = 0;

  for (const t of tasks) {
    const criadaEm = localDayOf(t.created_at);
    if (dentro(criadaEm, periodo)) ind.criadas++;

    if (t.cancelled_at) continue;

    if (t.completed_at) {
      const entregueEm = localDayOf(t.completed_at);
      if (dentro(entregueEm, periodo)) {
        ind.entregues++;
        somaDias += differenceInCalendarDays(
          parseISO(entregueEm),
          parseISO(criadaEm)
        );

        if (!t.due_date) ind.entreguesSemPrazo++;
        else {
          ind.entreguesComPrazo++;
          if (entregueEm <= t.due_date) ind.entreguesNoPrazo++;
        }
      }
      continue;
    }

    // Aberta. O risco é medido AGORA — nunca dentro do período, que pode
    // ser um mês passado onde "vence em 3 dias" não quer dizer nada.
    if (!t.due_date) ind.semPrazoAgora++;
    else if (t.due_date < hoje) ind.atrasadasAgora++;
    else if (t.due_date <= limiteAtencao) ind.emAtencaoAgora++;
    else ind.noPrazoAgora++;
  }

  ind.tempoMedioDias =
    ind.entregues > 0 ? Math.round((somaDias / ind.entregues) * 10) / 10 : null;

  return ind;
}

/**
 * Pontualidade: entregues no prazo ÷ entregues QUE TINHAM prazo.
 *
 * O denominador exclui as sem prazo de propósito. Um setor que entregou 10
 * e tinha prazo em 2 está 100% pontual sobre 2, não sobre 10 — e a tela
 * mostra a base junto para o número não parecer melhor do que é.
 *
 * `null` quando ninguém tinha prazo: aí não existe pontualidade a apurar.
 */
export function taxaDePontualidade(ind: {
  entreguesComPrazo: number;
  entreguesNoPrazo: number;
}): number | null {
  if (ind.entreguesComPrazo <= 0) return null;
  return Math.round((ind.entreguesNoPrazo / ind.entreguesComPrazo) * 100);
}

// ---------------------------------------------------------------------------
// Comparação com o período anterior
// ---------------------------------------------------------------------------

/**
 * Variação percentual entre dois volumes, ou `null` quando não dá para dizer.
 *
 * **Base zero devolve `null`, não 100%.** Sair de 0 para 6 não é "crescimento
 * de 100%": é a primeira vez. Chamar isso de percentual é a mentira mais
 * comum de painel, e ela aparece justo no mês de estreia, quando alguém está
 * decidindo se a ferramenta serve.
 */
export function variacaoPercentual(
  atual: number,
  anterior: number
): number | null {
  if (anterior === 0) return null;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

/**
 * Diferença entre duas TAXAS, em pontos percentuais.
 *
 * Existe separada de `variacaoPercentual` porque as duas contas não são a
 * mesma. De 70% para 79% são +9 p.p., e não +12,9% — escrever "%" ali faria
 * o leitor achar que a pontualidade cresceu 13%.
 */
export function variacaoEmPontos(
  atual: number | null,
  anterior: number | null
): number | null {
  if (atual === null || anterior === null) return null;
  return Math.round((atual - anterior) * 10) / 10;
}

/** Diferença absoluta de duração, em dias. Negativo = ficou mais rápido. */
export function variacaoDeDias(
  atual: number | null,
  anterior: number | null
): number | null {
  if (atual === null || anterior === null) return null;
  return Math.round((atual - anterior) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Fluxo de demandas
// ---------------------------------------------------------------------------

export type PontoDeFluxo = {
  rotulo: string;
  de: string;
  ate: string;
  criadas: number;
  entregues: number;
  /**
   * `criadas − entregues`. Positivo significa que entrou mais do que saiu:
   * a fila cresceu naquele intervalo.
   */
  saldo: number;
};

/**
 * A série do gráfico principal: quanto entrou e quanto saiu, por balde.
 *
 * Duas séries e não uma linha de "pendentes acumuladas": o acúmulo é
 * consequência, e mostrar a causa (entrada versus saída) é o que permite
 * agir. Quem quiser o acúmulo lê o saldo na dica.
 */
export function serieDeFluxo(tasks: Task[], baldes: Balde[]): PontoDeFluxo[] {
  const pontos: PontoDeFluxo[] = baldes.map((b) => ({
    rotulo: b.rotulo,
    de: b.de,
    ate: b.ate,
    criadas: 0,
    entregues: 0,
    saldo: 0,
  }));
  if (pontos.length === 0) return pontos;

  // Índice por dia: com 365 baldes e milhares de demandas, procurar o balde
  // de cada demanda por varredura vira quadrático.
  const indicePorDia = new Map<string, number>();
  for (let i = 0; i < baldes.length; i += 1) {
    let cursor = parseISO(baldes[i].de);
    const fim = parseISO(baldes[i].ate);
    while (cursor <= fim) {
      indicePorDia.set(localDayISO(cursor), i);
      cursor = addDays(cursor, 1);
    }
  }

  for (const t of tasks) {
    const iCriada = indicePorDia.get(localDayOf(t.created_at));
    if (iCriada !== undefined) pontos[iCriada].criadas++;

    if (t.cancelled_at || !t.completed_at) continue;
    const iEntregue = indicePorDia.get(localDayOf(t.completed_at));
    if (iEntregue !== undefined) pontos[iEntregue].entregues++;
  }

  for (const p of pontos) p.saldo = p.criadas - p.entregues;
  return pontos;
}

// ---------------------------------------------------------------------------
// Risco de prazo
// ---------------------------------------------------------------------------

export type RiscoDePrazo = {
  noPrazo: number;
  emAtencao: number;
  atrasadas: number;
  /**
   * Abertas sem prazo. **Fora dos três grupos acima, sempre.**
   *
   * Classificá-las como "no prazo" seria inventar tranquilidade: uma demanda
   * sem data combinada não está no prazo, está sem prazo. Aparecem à parte,
   * porque num quadro com muitas delas o gráfico de risco cobre uma fatia
   * pequena da operação e quem lê precisa saber disso.
   */
  semPrazo: number;
  /** Soma dos três grupos com prazo — o denominador do donut. */
  comPrazo: number;
};

export function riscoDePrazo(ind: Indicadores): RiscoDePrazo {
  return {
    noPrazo: ind.noPrazoAgora,
    emAtencao: ind.emAtencaoAgora,
    atrasadas: ind.atrasadasAgora,
    semPrazo: ind.semPrazoAgora,
    comPrazo: ind.noPrazoAgora + ind.emAtencaoAgora + ind.atrasadasAgora,
  };
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

export type FiltroDeRelatorio = {
  /** Vazio = todos. */
  sectorIds: string[];
  /** Vazio = todos. `"__sem__"` seleciona quem está sem responsável. */
  assigneeIds: string[];
};

export const SEM_RESPONSAVEL = "__sem__";

export const FILTRO_VAZIO: FiltroDeRelatorio = {
  sectorIds: [],
  assigneeIds: [],
};

/**
 * Aplica setor e responsável.
 *
 * **Não aplica período.** Período não é filtro de linha: "entregues no
 * período" e "atrasadas agora" olham datas diferentes da mesma demanda, e
 * cortar a lista por data antes da conta apagaria uma das duas.
 */
export function aplicarFiltro(
  tasks: Task[],
  filtro: FiltroDeRelatorio
): Task[] {
  const setores = new Set(filtro.sectorIds);
  const pessoas = new Set(filtro.assigneeIds);
  if (setores.size === 0 && pessoas.size === 0) return tasks;

  return tasks.filter((t) => {
    if (setores.size > 0 && !setores.has(t.sector_id)) return false;
    if (pessoas.size > 0) {
      const chave = t.assignee_id ?? SEM_RESPONSAVEL;
      if (!pessoas.has(chave)) return false;
    }
    return true;
  });
}
