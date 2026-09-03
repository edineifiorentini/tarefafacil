// Desempenho por setor e a classificação de risco de cada um. Puro.
//
// **Reusa `indicadoresDe` em vez de recontar.** O ranking e os cartões do
// topo respondem às mesmas perguntas sobre recortes diferentes da mesma
// lista; se cada um tivesse sua própria varredura, um dia divergiriam por
// uma condição a mais em um só — e a tela mostraria "24 entregues" em cima
// e 23 na soma da tabela, sem nada explicando a diferença.

import {
  indicadoresDe,
  taxaDePontualidade,
  type Indicadores,
  type Periodo,
} from "./overview";
import type { Task } from "@/types/database";

/**
 * Quatro estados, e a diferença entre os dois últimos é o ponto.
 *
 * Com dados reais em 3/set/2026 a tela mostrou "Esporte — Saudável —
 * pontualidade de 0%". Nada vencido era verdade; chamar de SAUDÁVEL quem
 * entregou fora do prazo a única demanda com prazo é uma conclusão que o
 * dado não sustenta — o mesmo erro do "Crítico sobre três entregas", só
 * que na direção contrária.
 *
 * Daí a separação:
 *
 * - **`saudavel`** é a afirmação COMPLETA: nada vencido, nada vencendo, e
 *   a pontualidade é boa sobre entregas suficientes para dizer isso.
 * - **`em_dia`** é a afirmação ESTREITA: nada vencido nem vencendo. Só
 *   isso, e só isso é verdade — a taxa existe mas não tem base para
 *   julgar, e a dica diz qual é.
 *
 * "Em dia" e não "Sem base": o segundo descreve o que falta, o primeiro
 * diz o que se sabe. Numa coluna onde a maioria dos setores cai aqui — o
 * caso normal de quem tem muitos setores e poucas entregas por mês —, a
 * diferença é entre uma coluna que informa e uma que se repete.
 */
export type NivelDeSaude = "saudavel" | "atencao" | "critico" | "em_dia";

export type Saude = {
  nivel: NivelDeSaude;
  /** Por que este setor recebeu esta classificação. Vai para a dica. */
  motivo: string;
};

/**
 * Os limites da classificação, num lugar só.
 *
 * Ficam aqui, e não espalhados nos componentes, porque um dia alguém vai
 * querer que 85% seja 90% — e a mudança precisa ser uma linha, não uma
 * caçada. O produto ainda não tinha regra de saúde de setor; estes números
 * são o ponto de partida, e são configuração de negócio, não constante de
 * desenho.
 */
export const LIMITES_DE_SAUDE = {
  /** A partir daqui, a pontualidade é considerada boa. */
  pontualidadeSaudavel: 85,
  /** Abaixo daqui, é crítica. Entre os dois, é atenção. */
  pontualidadeCritica: 70,
  /**
   * Quantas entregas COM PRAZO são precisas antes de a taxa julgar sozinha.
   *
   * Apareceu com dados reais em 3/set/2026: cinco de dez setores saíram
   * "Crítico" com ZERO demandas atrasadas. O motivo de todos era
   * "pontualidade de 67%" — que, sobre três entregas, é uma entrega
   * atrasada. Metade da tabela em vermelho por causa disso apaga o sinal
   * dos setores que realmente estão mal.
   *
   * Cinco é o piso em que uma única entrega fora do prazo (80%) não
   * derruba mais o setor sozinha. Abaixo disso a taxa continua sendo
   * MOSTRADA — ela é um fato —, mas não classifica: só demanda vencida e
   * prazo próximo classificam, porque esses não dependem de amostra.
   */
  baseMinimaParaJulgar: 5,
} as const;

/**
 * Saudável, em atenção ou crítico — e por quê.
 *
 * Ordem de precedência, do mais forte ao mais fraco. **Demanda atrasada
 * ganha de qualquer taxa**: um setor com 100% de pontualidade histórica e
 * três demandas vencidas agora não está saudável, está com três clientes
 * esperando.
 *
 * Pontualidade sem base (`null`) não classifica nada por si só: um setor
 * que entregou dez demandas sem prazo não é bom nem ruim nessa dimensão, e
 * inventar um julgamento a partir da ausência de dado é o erro que este
 * módulo inteiro existe para evitar.
 */
export function classificarSaude(entrada: {
  atrasadas: number;
  emAtencao: number;
  pontualidade: number | null;
  /** Entregas COM prazo — o denominador da taxa. */
  base?: number;
}): Saude {
  const { atrasadas, emAtencao, pontualidade } = entrada;
  const base = entrada.base ?? 0;
  const taxaJulga =
    pontualidade !== null && base >= LIMITES_DE_SAUDE.baseMinimaParaJulgar;

  // Demanda vencida ganha de tudo: não depende de amostra, é um cliente
  // esperando agora.
  if (atrasadas > 0) {
    return {
      nivel: "critico",
      motivo: `${atrasadas} ${atrasadas === 1 ? "demanda vencida" : "demandas vencidas"} e ainda em aberto.`,
    };
  }
  if (taxaJulga && pontualidade! < LIMITES_DE_SAUDE.pontualidadeCritica) {
    return {
      nivel: "critico",
      motivo: `Pontualidade de ${pontualidade}% sobre ${base} entregas com prazo, abaixo de ${LIMITES_DE_SAUDE.pontualidadeCritica}%.`,
    };
  }
  if (emAtencao > 0) {
    return {
      nivel: "atencao",
      motivo: `${emAtencao} ${emAtencao === 1 ? "demanda vence" : "demandas vencem"} nos próximos dias.`,
    };
  }
  if (taxaJulga && pontualidade! < LIMITES_DE_SAUDE.pontualidadeSaudavel) {
    return {
      nivel: "atencao",
      motivo: `Pontualidade de ${pontualidade}% sobre ${base} entregas com prazo, abaixo de ${LIMITES_DE_SAUDE.pontualidadeSaudavel}%.`,
    };
  }

  // Daqui para baixo o setor está saudável. O motivo muda porque as três
  // razões são diferentes, e quem lê precisa saber qual é a dele.
  if (pontualidade === null) {
    return {
      nivel: "em_dia",
      motivo:
        "Nada vencido nem próximo de vencer. Nenhuma entrega com prazo no período, então não há pontualidade a apurar.",
    };
  }
  if (!taxaJulga) {
    return {
      nivel: "em_dia",
      motivo: `Nada vencido nem próximo de vencer. A pontualidade de ${pontualidade}% sai de ${base} ${base === 1 ? "entrega" : "entregas"} com prazo — a partir de ${LIMITES_DE_SAUDE.baseMinimaParaJulgar} ela passa a classificar o setor.`,
    };
  }
  return {
    nivel: "saudavel",
    motivo: `Nada vencido e pontualidade de ${pontualidade}% sobre ${base} entregas com prazo.`,
  };
}

export const ROTULO_DE_SAUDE: Record<NivelDeSaude, string> = {
  saudavel: "Saudável",
  atencao: "Atenção",
  critico: "Crítico",
  em_dia: "Em dia",
};

export type LinhaDeSetor = {
  sectorId: string;
  ind: Indicadores;
  /** Percentual, ou `null` quando nenhuma entrega tinha prazo. */
  pontualidade: number | null;
  /** Abertas agora, com ou sem prazo. */
  emAndamento: number;
  saude: Saude;
};

export type OrdemDeSetor =
  | "atencao"
  | "volume"
  | "entregues"
  | "pontualidade"
  | "atrasadas"
  | "tempo";

/**
 * Uma linha por setor com movimento no período.
 *
 * **Setor sem nada — nem criada, nem entregue, nem aberta — não gera
 * linha.** Num workspace com doze setores, oito linhas zeradas escondem as
 * quatro que importam. O comportamento é o mesmo do relatório antigo, de
 * propósito: as duas abas contam a mesma história.
 */
export function linhasPorSetor(
  tasks: Task[],
  periodo: Periodo,
  agora: Date,
  ordem: OrdemDeSetor = "atencao"
): LinhaDeSetor[] {
  const porSetor = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.sector_id) continue;
    const lista = porSetor.get(t.sector_id);
    if (lista) lista.push(t);
    else porSetor.set(t.sector_id, [t]);
  }

  const linhas: LinhaDeSetor[] = [];
  for (const [sectorId, doSetor] of porSetor) {
    const ind = indicadoresDe(doSetor, periodo, agora);
    const emAndamento =
      ind.atrasadasAgora +
      ind.emAtencaoAgora +
      ind.noPrazoAgora +
      ind.semPrazoAgora;

    if (ind.criadas === 0 && ind.entregues === 0 && emAndamento === 0) continue;

    const pct = taxaDePontualidade(ind);
    linhas.push({
      sectorId,
      ind,
      pontualidade: pct,
      emAndamento,
      saude: classificarSaude({
        atrasadas: ind.atrasadasAgora,
        emAtencao: ind.emAtencaoAgora,
        pontualidade: pct,
        base: ind.entreguesComPrazo,
      }),
    });
  }

  return ordenarSetores(linhas, ordem);
}

/**
 * A ordem do que exige ação.
 *
 * `em_dia` fica por ÚLTIMO, e não entre atenção e saudável: um setor sem
 * nada vencido não é mais urgente que um comprovadamente bom. O ranking
 * existe para pôr trabalho no topo, não incerteza.
 */
const PESO_DA_SAUDE: Record<NivelDeSaude, number> = {
  critico: 0,
  atencao: 1,
  saudavel: 2,
  em_dia: 3,
};

/**
 * A ordenação do ranking.
 *
 * O padrão (`atencao`) coloca quem precisa de ação primeiro — não quem
 * produziu mais. Um ranking por volume responde "quem trabalhou", e essa
 * não é a pergunta de quem abre um relatório de gargalos.
 *
 * **De propósito não existe ordenação por "melhor setor".** Volume e
 * complexidade variam entre setores, e uma coluna com esse nome viraria
 * comparação entre pessoas que fazem trabalhos diferentes.
 */
export function ordenarSetores(
  linhas: LinhaDeSetor[],
  ordem: OrdemDeSetor
): LinhaDeSetor[] {
  const copia = [...linhas];

  // `null` no fim em qualquer ordenação por taxa ou duração: "não sei" não
  // é nem o melhor nem o pior resultado.
  const nulosPorUltimo = (
    a: number | null,
    b: number | null,
    cmp: (x: number, y: number) => number
  ) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return cmp(a, b);
  };

  switch (ordem) {
    case "volume":
      return copia.sort((a, b) => b.ind.criadas - a.ind.criadas);
    case "entregues":
      return copia.sort((a, b) => b.ind.entregues - a.ind.entregues);
    case "pontualidade":
      return copia.sort((a, b) =>
        nulosPorUltimo(a.pontualidade, b.pontualidade, (x, y) => x - y)
      );
    case "atrasadas":
      return copia.sort((a, b) => b.ind.atrasadasAgora - a.ind.atrasadasAgora);
    case "tempo":
      return copia.sort((a, b) =>
        nulosPorUltimo(
          a.ind.tempoMedioDias,
          b.ind.tempoMedioDias,
          (x, y) => y - x
        )
      );
    case "atencao":
    default:
      return copia.sort((a, b) => {
        const s = PESO_DA_SAUDE[a.saude.nivel] - PESO_DA_SAUDE[b.saude.nivel];
        if (s !== 0) return s;
        if (b.ind.atrasadasAgora !== a.ind.atrasadasAgora) {
          return b.ind.atrasadasAgora - a.ind.atrasadasAgora;
        }
        if (b.ind.emAtencaoAgora !== a.ind.emAtencaoAgora) {
          return b.ind.emAtencaoAgora - a.ind.emAtencaoAgora;
        }
        return b.ind.entregues - a.ind.entregues;
      });
  }
}
